'use server'

import { getSession } from '@/lib/auth/dal'
import { prisma } from '@/lib/db'
import { TransactionType } from '@prisma/client'
import { transferSchema } from '@/lib/validations/wallet'
import {
  getWalletWithUser,
  getSystemSettings,
  debitBalance,
  creditBalance,
  getTransactionHistory as getTransactionHistoryLib,
  getBalanceHistory as getBalanceHistoryLib,
} from '@/lib/wallet/transactions'
import {
  getDailyClaimInfo,
  claimDailyAllowance,
  type DailyClaimInfo,
} from '@/lib/wallet/daily-allowance'
import type { WalletWithUser, TransactionWithDetails, BalanceHistoryEntry } from '@/lib/wallet/types'

/**
 * Action state for form actions
 */
interface ActionState {
  error?: string
  success?: boolean
}

/**
 * Wallet data response
 */
export interface WalletData {
  wallet: WalletWithUser
  dailyClaimInfo: DailyClaimInfo
  currencyName: string
}

/**
 * Get wallet data for display
 * If no userId provided, gets data for current session user
 */
export async function getWalletData(userId?: string): Promise<WalletData> {
  const session = await getSession()
  const targetUserId = userId || session.userId

  const [wallet, dailyClaimInfo, settings] = await Promise.all([
    getWalletWithUser(targetUserId),
    getDailyClaimInfo(targetUserId),
    getSystemSettings(),
  ])

  return {
    wallet,
    dailyClaimInfo,
    currencyName: settings.currencyName,
  }
}

/**
 * Claim daily allowance
 * Returns success with amount or error message
 */
export async function claimDaily(): Promise<
  | { success: true; amount: number; type: 'DAILY_CLAIM' | 'WEEKLY_BONUS'; multiplier: number }
  | { error: string }
> {
  try {
    const session = await getSession()
    const result = await claimDailyAllowance(session.userId)

    return {
      success: true,
      amount: result.amount,
      type: result.type,
      multiplier: result.multiplier,
    }
  } catch (error) {
    console.error('Claim daily error:', error)
    return {
      error: error instanceof Error ? error.message : 'Fehler beim Einlösen des täglichen Guthabens',
    }
  }
}

/**
 * Transfer funds to another user
 * Validates limits, frozen status, and enforces daily transfer cap
 */
export async function transferFunds(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await getSession()

    // Parse form data
    const rawData = {
      toUserId: formData.get('toUserId') as string,
      amount: Number(formData.get('amount')),
    }

    // Validate with schema
    const validatedFields = transferSchema.safeParse(rawData)

    if (!validatedFields.success) {
      return {
        error: validatedFields.error.issues[0]?.message || 'Ungültige Eingabe',
      }
    }

    const { toUserId, amount } = validatedFields.data

    // Validate sender !== receiver
    if (session.userId === toUserId) {
      return { error: 'Du kannst dir nicht selbst Guthaben senden' }
    }

    // Get system settings for transfer limits
    const settings = await getSystemSettings()

    // Check single transfer max amount
    if (amount > settings.transferMaxAmount) {
      return {
        error: `Transfer-Betrag überschreitet Maximum von ${settings.transferMaxAmount} ${settings.currencyName}`,
      }
    }

    // Check daily transfer limit
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const todayTransfers = await prisma.transaction.aggregate({
      where: {
        userId: session.userId,
        type: TransactionType.TRANSFER_SENT,
        createdAt: {
          gte: today,
        },
      },
      _sum: {
        amount: true,
      },
    })

    const totalSentToday = todayTransfers._sum.amount || 0

    if (totalSentToday + amount > settings.transferDailyLimit) {
      return {
        error: `Tageslimit überschritten. Bereits gesendet: ${totalSentToday}, Limit: ${settings.transferDailyLimit} ${settings.currencyName}`,
      }
    }

    // Check sender wallet not frozen
    const senderWallet = await prisma.wallet.findUnique({
      where: { userId: session.userId },
      select: { frozenAt: true },
    })

    if (senderWallet?.frozenAt) {
      return { error: 'Dein Wallet ist gesperrt. Transfers nicht möglich.' }
    }

    // Get recipient info for description
    const recipient = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { displayName: true },
    })

    if (!recipient) {
      return { error: 'Empfänger nicht gefunden' }
    }

    // Perform transfer in transaction
    await prisma.$transaction(async (tx) => {
      // Debit sender
      await debitBalance(
        session.userId,
        amount,
        TransactionType.TRANSFER_SENT,
        `Transfer an ${recipient.displayName}`
      )

      // Credit receiver
      await creditBalance(
        toUserId,
        amount,
        TransactionType.TRANSFER_RECEIVED,
        `Transfer von ${session.displayName}`
      )
    })

    return { success: true }
  } catch (error) {
    console.error('Transfer funds error:', error)
    return {
      error: error instanceof Error ? error.message : 'Fehler beim Transfer',
    }
  }
}

/**
 * Get transaction history with optional filtering
 */
export async function getTransactions(options?: {
  type?: string
  limit?: number
  cursor?: string
}): Promise<TransactionWithDetails[]> {
  const session = await getSession()

  return getTransactionHistoryLib(session.userId, {
    type: options?.type as any,
    limit: options?.limit,
    cursor: options?.cursor,
  })
}

/**
 * Get balance chart data for history visualization
 */
export async function getBalanceChartData(days?: number): Promise<BalanceHistoryEntry[]> {
  const session = await getSession()

  return getBalanceHistoryLib(session.userId, days)
}
