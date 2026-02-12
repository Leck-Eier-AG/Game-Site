import { prisma } from '@/lib/db'
import { Prisma, TransactionType } from '@prisma/client'
import type {
  WalletWithUser,
  CreditResult,
  DebitResult,
  SystemSettingsConfig,
  TransactionHistoryOptions,
  TransactionWithDetails,
  BalanceHistoryEntry,
} from './types'

// Transaction configuration
const TX_CONFIG = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5000,
  timeout: 10000,
}

/**
 * Get SystemSettings (singleton row)
 * Cache-friendly, called often
 */
export async function getSystemSettings(): Promise<SystemSettingsConfig> {
  const settings = await prisma.systemSettings.findFirst()

  if (!settings) {
    throw new Error('SystemSettings not initialized. Run: npx prisma db seed')
  }

  return settings as SystemSettingsConfig
}

/**
 * Get wallet with user info
 * Lazy initialization: creates wallet if doesn't exist
 */
export async function getWalletWithUser(userId: string): Promise<WalletWithUser> {
  // Try to get existing wallet
  const existingWallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          displayName: true,
          username: true,
        },
      },
    },
  })

  if (existingWallet) {
    return existingWallet
  }

  // Lazy initialization: create wallet for existing user
  const settings = await getSystemSettings()

  const newWallet = await prisma.$transaction(
    async (tx) => {
      // Get user to look up their invite
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { email: true },
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Look up the invite to check for custom starting balance
      const invite = await tx.invite.findFirst({
        where: {
          email: user.email.toLowerCase(),
          usedAt: { not: null },
        },
        orderBy: {
          usedAt: 'desc',
        },
        select: {
          customStartingBalance: true,
        },
      })

      // Use custom starting balance if set, otherwise use global default
      const startingBalance = invite?.customStartingBalance ?? settings.startingBalance

      // Create wallet
      const wallet = await tx.wallet.create({
        data: {
          userId,
          balance: startingBalance,
        },
        include: {
          user: {
            select: {
              displayName: true,
              username: true,
            },
          },
        },
      })

      // Create INITIAL transaction record
      await tx.transaction.create({
        data: {
          type: TransactionType.INITIAL,
          amount: startingBalance,
          userId,
          description: 'Initial balance',
          metadata: {
            startingBalance,
            fromInvite: invite?.customStartingBalance !== null && invite?.customStartingBalance !== undefined,
          },
        },
      })

      return wallet
    },
    TX_CONFIG
  )

  return newWallet
}

/**
 * Credit balance (add to wallet)
 * Creates transaction record in same transaction
 */
export async function creditBalance(
  userId: string,
  amount: number,
  type: TransactionType,
  description: string,
  metadata?: Record<string, unknown>
): Promise<CreditResult> {
  if (amount <= 0) {
    throw new Error('Credit amount must be positive')
  }

  const result = await prisma.$transaction(
    async (tx) => {
      // Update wallet balance
      const wallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            increment: amount,
          },
        },
      })

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          type,
          amount,
          userId,
          description,
          metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
        },
      })

      return { wallet, transaction }
    },
    TX_CONFIG
  )

  return result
}

/**
 * Debit balance (subtract from wallet)
 * Validates sufficient balance and frozen status
 */
export async function debitBalance(
  userId: string,
  amount: number,
  type: TransactionType,
  description: string,
  metadata?: Record<string, unknown>
): Promise<DebitResult> {
  if (amount <= 0) {
    throw new Error('Debit amount must be positive')
  }

  const result = await prisma.$transaction(
    async (tx) => {
      // Get current wallet state
      const currentWallet = await tx.wallet.findUnique({
        where: { userId },
      })

      if (!currentWallet) {
        throw new Error('Wallet not found')
      }

      // Check if wallet is frozen
      if (currentWallet.frozenAt !== null) {
        throw new Error('Wallet is frozen. Cannot debit balance.')
      }

      // Check sufficient balance
      if (currentWallet.balance < amount) {
        throw new Error(
          `Insufficient balance. Required: ${amount}, Available: ${currentWallet.balance}`
        )
      }

      // Update wallet balance
      const wallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      })

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          type,
          amount,
          userId,
          description,
          metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
        },
      })

      return { wallet, transaction }
    },
    TX_CONFIG
  )

  return result
}

/**
 * Get transaction history with pagination
 * Includes related user info for transfers
 */
export async function getTransactionHistory(
  userId: string,
  options: TransactionHistoryOptions = {}
): Promise<TransactionWithDetails[]> {
  const { type, limit = 50, cursor } = options

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      ...(type && { type }),
    },
    include: {
      user: {
        select: {
          displayName: true,
          username: true,
        },
      },
      relatedUser: {
        select: {
          displayName: true,
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    ...(cursor && {
      skip: 1,
      cursor: {
        id: cursor,
      },
    }),
  })

  return transactions
}

/**
 * Get balance history for charts
 * Calculate daily balance snapshots from transactions
 */
export async function getBalanceHistory(
  userId: string,
  days: number = 30
): Promise<BalanceHistoryEntry[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get all transactions since start date
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      type: true,
      amount: true,
      createdAt: true,
    },
  })

  // Get wallet to know current balance
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { balance: true },
  })

  if (!wallet) {
    return []
  }

  // Calculate running balance by working backwards from current balance
  const history: BalanceHistoryEntry[] = []
  let runningBalance = wallet.balance

  // Group by day and calculate balance at end of each day
  const dateMap = new Map<string, number>()

  // Work backwards from current balance
  for (let i = transactions.length - 1; i >= 0; i--) {
    const tx = transactions[i]
    const dateStr = tx.createdAt.toISOString().split('T')[0]

    // For debit types, we're going back in time, so add back
    const isDebit =
      tx.type === TransactionType.BET_PLACED ||
      tx.type === TransactionType.TRANSFER_SENT ||
      tx.type === TransactionType.ADMIN_DEBIT

    if (isDebit) {
      runningBalance += tx.amount
    } else {
      runningBalance -= tx.amount
    }

    dateMap.set(dateStr, runningBalance)
  }

  // Fill in all days (including days with no transactions)
  const currentDate = new Date(startDate)
  const today = new Date()
  let lastBalance = dateMap.get(currentDate.toISOString().split('T')[0]) || wallet.balance

  while (currentDate <= today) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const balance = dateMap.get(dateStr) || lastBalance

    history.push({
      date: dateStr,
      balance,
    })

    lastBalance = balance
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return history
}
