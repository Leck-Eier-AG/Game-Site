'use server'

import { requireAdmin } from '@/lib/auth/dal'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { systemSettingsSchema } from '@/lib/validations/wallet'
import { subDays } from 'date-fns'

interface ActionState {
  error?: string
  success?: boolean
  newBalance?: number
  affected?: number
  userId?: string
  affectedUserIds?: string[]
}

/**
 * Get economy statistics for admin dashboard
 */
export async function getEconomyStats() {
  await requireAdmin()

  const thirtyDaysAgo = subDays(new Date(), 30)

  // Run all queries in parallel for performance
  const [
    walletStats,
    dailyVolume,
    topEarners,
    topSpenders,
    transactionTypeDistribution,
  ] = await Promise.all([
    // Total circulation, average balance, user count
    prisma.wallet.aggregate({
      _sum: { balance: true },
      _avg: { balance: true },
      _count: true,
    }),

    // Daily transaction volume (last 30 days)
    prisma.$queryRaw<Array<{ date: Date; count: bigint; total: bigint }>>`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(ABS(amount)) as total
      FROM "Transaction"
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,

    // Top 5 earners (highest balance)
    prisma.wallet.findMany({
      take: 5,
      orderBy: { balance: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
          },
        },
      },
    }),

    // Top 5 spenders (most sent/bet amount)
    prisma.$queryRaw<
      Array<{
        user_id: string
        total_spent: bigint
        display_name: string
        username: string
      }>
    >`
      SELECT
        t.user_id,
        SUM(ABS(t.amount)) as total_spent,
        u.display_name,
        u.username
      FROM "Transaction" t
      JOIN "User" u ON u.id = t.user_id
      WHERE t.type IN ('TRANSFER_SENT', 'BET_PLACED')
      GROUP BY t.user_id, u.display_name, u.username
      ORDER BY total_spent DESC
      LIMIT 5
    `,

    // Transaction type distribution
    prisma.$queryRaw<Array<{ type: string; count: bigint }>>`
      SELECT type, COUNT(*) as count
      FROM "Transaction"
      GROUP BY type
      ORDER BY count DESC
    `,
  ])

  return {
    totalCirculation: walletStats._sum.balance || 0,
    averageBalance: Math.round(walletStats._avg.balance || 0),
    totalWallets: walletStats._count,
    dailyVolume: dailyVolume.map((day) => ({
      date: day.date.toISOString().split('T')[0],
      count: Number(day.count),
      total: Number(day.total),
    })),
    topEarners: topEarners.map((wallet) => ({
      userId: wallet.user.id,
      displayName: wallet.user.displayName,
      username: wallet.user.username,
      balance: wallet.balance,
    })),
    topSpenders: topSpenders.map((spender) => ({
      userId: spender.user_id,
      displayName: spender.display_name,
      username: spender.username,
      totalSpent: Number(spender.total_spent),
    })),
    transactionTypeDistribution: transactionTypeDistribution.map((item) => ({
      type: item.type,
      count: Number(item.count),
    })),
  }
}

/**
 * Get admin transaction log with filtering and pagination
 */
export async function getAdminTransactionLog(options?: {
  type?: string
  userId?: string
  limit?: number
  cursor?: string
}) {
  await requireAdmin()

  const limit = options?.limit || 50
  const where: any = {}

  // Apply filters
  if (options?.type) {
    where.type = options.type
  }
  if (options?.userId) {
    where.userId = options.userId
  }
  if (options?.cursor) {
    where.createdAt = {
      lt: new Date(options.cursor),
    }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    take: limit + 1, // Fetch one extra to determine if there are more
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
        },
      },
      relatedUser: {
        select: {
          id: true,
          displayName: true,
          username: true,
        },
      },
    },
  })

  const hasMore = transactions.length > limit
  const items = hasMore ? transactions.slice(0, limit) : transactions
  const nextCursor = hasMore
    ? items[items.length - 1]?.createdAt.toISOString()
    : null

  return {
    transactions: items,
    nextCursor,
  }
}

/**
 * Get system settings
 */
export async function getSystemSettings() {
  await requireAdmin()

  // Get the single SystemSettings row (or create if doesn't exist)
  let settings = await prisma.systemSettings.findFirst()

  if (!settings) {
    // Create default settings if none exist
    settings = await prisma.systemSettings.create({
      data: {},
    })
  }

  return settings
}

/**
 * Update system settings
 */
const UpdateSystemSettingsSchema = z.object({
  currencyName: z.string().min(1),
  startingBalance: z.coerce.number().int().min(0),
  dailyAllowanceBase: z.coerce.number().int().min(0),
  weeklyBonusAmount: z.coerce.number().int().min(0),
  transferMaxAmount: z.coerce.number().int().positive(),
  transferDailyLimit: z.coerce.number().int().positive(),
  defaultBetPresets: z.string(), // Will parse as JSON
  defaultPayoutRatios: z.string(), // Will parse as JSON
  afkGracePeriodSec: z.coerce.number().int().min(0),
  alertTransferLimit: z.coerce.number().int().min(0),
  alertBalanceDropPct: z.coerce.number().int().min(0).max(100),
})

export async function updateSystemSettings(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin()

    // Extract all fields from form data
    const rawData = {
      currencyName: formData.get('currencyName') as string,
      startingBalance: formData.get('startingBalance') as string,
      dailyAllowanceBase: formData.get('dailyAllowanceBase') as string,
      weeklyBonusAmount: formData.get('weeklyBonusAmount') as string,
      transferMaxAmount: formData.get('transferMaxAmount') as string,
      transferDailyLimit: formData.get('transferDailyLimit') as string,
      defaultBetPresets: formData.get('defaultBetPresets') as string,
      defaultPayoutRatios: formData.get('defaultPayoutRatios') as string,
      afkGracePeriodSec: formData.get('afkGracePeriodSec') as string,
      alertTransferLimit: formData.get('alertTransferLimit') as string,
      alertBalanceDropPct: formData.get('alertBalanceDropPct') as string,
    }

    // Validate basic structure
    const validatedFields = UpdateSystemSettingsSchema.safeParse(rawData)

    if (!validatedFields.success) {
      return {
        error: validatedFields.error.issues[0]?.message || 'Ungültige Eingabe',
      }
    }

    const data = validatedFields.data

    // Parse JSON fields
    let defaultBetPresets: number[]
    let defaultPayoutRatios: Array<{ position: number; percentage: number }>

    try {
      defaultBetPresets = JSON.parse(data.defaultBetPresets)
      defaultPayoutRatios = JSON.parse(data.defaultPayoutRatios)
    } catch (e) {
      return { error: 'Ungültiges JSON-Format für Presets oder Auszahlungsquoten' }
    }

    // Validate with systemSettingsSchema
    const finalValidation = systemSettingsSchema.safeParse({
      currencyName: data.currencyName,
      startingBalance: data.startingBalance,
      dailyAllowanceBase: data.dailyAllowanceBase,
      weeklyBonusAmount: data.weeklyBonusAmount,
      transferMaxAmount: data.transferMaxAmount,
      transferDailyLimit: data.transferDailyLimit,
      defaultBetPresets,
      defaultPayoutRatios,
      afkGracePeriodSec: data.afkGracePeriodSec,
      alertTransferLimit: data.alertTransferLimit,
      alertBalanceDropPct: data.alertBalanceDropPct,
    })

    if (!finalValidation.success) {
      return {
        error: finalValidation.error.issues[0]?.message || 'Validierungsfehler',
      }
    }

    const validatedData = finalValidation.data

    // Find the single settings row
    const existingSettings = await prisma.systemSettings.findFirst()

    if (existingSettings) {
      // Update existing
      await prisma.systemSettings.update({
        where: { id: existingSettings.id },
        data: {
          currencyName: validatedData.currencyName,
          startingBalance: validatedData.startingBalance,
          dailyAllowanceBase: validatedData.dailyAllowanceBase,
          weeklyBonusAmount: validatedData.weeklyBonusAmount,
          transferMaxAmount: validatedData.transferMaxAmount,
          transferDailyLimit: validatedData.transferDailyLimit,
          defaultBetPresets: validatedData.defaultBetPresets,
          defaultPayoutRatios: validatedData.defaultPayoutRatios,
          afkGracePeriodSec: validatedData.afkGracePeriodSec,
          alertTransferLimit: validatedData.alertTransferLimit,
          alertBalanceDropPct: validatedData.alertBalanceDropPct,
        },
      })
    } else {
      // Create new
      await prisma.systemSettings.create({
        data: {
          currencyName: validatedData.currencyName,
          startingBalance: validatedData.startingBalance,
          dailyAllowanceBase: validatedData.dailyAllowanceBase,
          weeklyBonusAmount: validatedData.weeklyBonusAmount,
          transferMaxAmount: validatedData.transferMaxAmount,
          transferDailyLimit: validatedData.transferDailyLimit,
          defaultBetPresets: validatedData.defaultBetPresets,
          defaultPayoutRatios: validatedData.defaultPayoutRatios,
          afkGracePeriodSec: validatedData.afkGracePeriodSec,
          alertTransferLimit: validatedData.alertTransferLimit,
          alertBalanceDropPct: validatedData.alertBalanceDropPct,
        },
      })
    }

    revalidatePath('/admin/finance')

    return { success: true }
  } catch (error) {
    console.error('Update system settings error:', error)
    return { error: 'Fehler beim Speichern der Einstellungen' }
  }
}

/**
 * Adjust individual user balance (admin operation)
 */
const AdjustBalanceSchema = z.object({
  userId: z.string().min(1),
  amount: z.coerce.number().int(),
  reason: z.string().optional(),
})

export async function adjustUserBalance(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin()

    const rawData = {
      userId: formData.get('userId') as string,
      amount: formData.get('amount') as string,
      reason: (formData.get('reason') as string) || undefined,
    }

    const validatedFields = AdjustBalanceSchema.safeParse(rawData)

    if (!validatedFields.success) {
      return {
        error: validatedFields.error.issues[0]?.message || 'Ungültige Eingabe',
      }
    }

    const { userId, amount, reason } = validatedFields.data

    // Get or create wallet, update balance, create transaction - all in one transaction
    const result = await prisma.$transaction(
      async (tx) => {
        // Get or create wallet
        let wallet = await tx.wallet.findUnique({
          where: { userId },
        })

        if (!wallet) {
          // Get starting balance from settings
          const settings = await tx.systemSettings.findFirst()
          wallet = await tx.wallet.create({
            data: {
              userId,
              balance: settings?.startingBalance || 1000,
            },
          })
        }

        // Update balance
        const newBalance = wallet.balance + amount
        if (newBalance < 0) {
          throw new Error('Guthaben kann nicht negativ werden')
        }

        const updatedWallet = await tx.wallet.update({
          where: { userId },
          data: { balance: newBalance },
        })

        // Create transaction record
        const transactionType = amount > 0 ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT'
        const description = reason || (amount > 0 ? 'Admin credit' : 'Admin debit')

        await tx.transaction.create({
          data: {
            userId,
            type: transactionType,
            amount,
            description,
            metadata: {
              balanceBefore: wallet.balance,
              balanceAfter: newBalance,
              reason,
            },
          },
        })

        return updatedWallet
      },
      {
        isolationLevel: 'Serializable',
      }
    )

    revalidatePath('/admin/finance')

    return { success: true, newBalance: result.balance, userId }
  } catch (error) {
    console.error('Adjust user balance error:', error)
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Fehler beim Anpassen des Guthabens',
    }
  }
}

/**
 * Bulk adjust balance for multiple users or all users
 */
const BulkAdjustBalanceSchema = z.object({
  userIds: z.string(), // "all" or JSON array
  amount: z.coerce.number().int(),
  reason: z.string().optional(),
})

export async function bulkAdjustBalance(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin()

    const rawData = {
      userIds: formData.get('userIds') as string,
      amount: formData.get('amount') as string,
      reason: (formData.get('reason') as string) || undefined,
    }

    const validatedFields = BulkAdjustBalanceSchema.safeParse(rawData)

    if (!validatedFields.success) {
      return {
        error: validatedFields.error.issues[0]?.message || 'Ungültige Eingabe',
      }
    }

    const { userIds, amount, reason } = validatedFields.data

    // Determine target user IDs
    let targetUserIds: string[]

    if (userIds === 'all') {
      // Get all user IDs
      const users = await prisma.user.findMany({
        where: { bannedAt: null },
        select: { id: true },
      })
      targetUserIds = users.map((u) => u.id)
    } else {
      try {
        targetUserIds = JSON.parse(userIds)
      } catch (e) {
        return { error: 'Ungültiges JSON-Format für Nutzer-IDs' }
      }
    }

    if (targetUserIds.length === 0) {
      return { error: 'Keine Nutzer ausgewählt' }
    }

    // Apply adjustment to all users in one transaction
    const result = await prisma.$transaction(
      async (tx) => {
        const settings = await tx.systemSettings.findFirst()
        const startingBalance = settings?.startingBalance || 1000
        let affected = 0
        const affectedUserIds: string[] = []

        for (const userId of targetUserIds) {
          // Get or create wallet
          let wallet = await tx.wallet.findUnique({
            where: { userId },
          })

          if (!wallet) {
            wallet = await tx.wallet.create({
              data: {
                userId,
                balance: startingBalance,
              },
            })
          }

          // Calculate new balance
          const newBalance = wallet.balance + amount
          if (newBalance < 0) {
            // Skip users that would go negative
            continue
          }

          // Update wallet
          await tx.wallet.update({
            where: { userId },
            data: { balance: newBalance },
          })

          // Create transaction record
          const transactionType = amount > 0 ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT'
          const description =
            reason || (amount > 0 ? 'Bulk admin credit' : 'Bulk admin debit')

          await tx.transaction.create({
            data: {
              userId,
              type: transactionType,
              amount,
              description,
              metadata: {
                balanceBefore: wallet.balance,
                balanceAfter: newBalance,
                reason,
              },
            },
          })

          affected++
          affectedUserIds.push(userId)
        }

        return { affected, affectedUserIds }
      },
      {
        isolationLevel: 'Serializable',
      }
    )

    revalidatePath('/admin/finance')

    return { success: true, affected: result.affected, affectedUserIds: result.affectedUserIds }
  } catch (error) {
    console.error('Bulk adjust balance error:', error)
    return { error: 'Fehler beim Massen-Anpassen des Guthabens' }
  }
}

/**
 * Freeze a user's wallet
 */
export async function freezeWallet(userId: string): Promise<ActionState> {
  try {
    await requireAdmin()

    // Get or create wallet first
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    })

    if (!wallet) {
      const settings = await prisma.systemSettings.findFirst()
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: settings?.startingBalance || 1000,
        },
      })
    }

    // Freeze it
    await prisma.wallet.update({
      where: { userId },
      data: { frozenAt: new Date() },
    })

    revalidatePath('/admin/finance')

    return { success: true }
  } catch (error) {
    console.error('Freeze wallet error:', error)
    return { error: 'Fehler beim Einfrieren der Wallet' }
  }
}

/**
 * Unfreeze a user's wallet
 */
export async function unfreezeWallet(userId: string): Promise<ActionState> {
  try {
    await requireAdmin()

    await prisma.wallet.update({
      where: { userId },
      data: { frozenAt: null },
    })

    revalidatePath('/admin/finance')

    return { success: true }
  } catch (error) {
    console.error('Unfreeze wallet error:', error)
    return { error: 'Fehler beim Freigeben der Wallet' }
  }
}

/**
 * Get users with wallet info for balance adjustment UI
 */
export async function getUsersWithWallets(search?: string) {
  await requireAdmin()

  const where: any = {
    bannedAt: null,
  }

  // Apply search filter if provided
  if (search && search.length > 0) {
    where.OR = [
      { displayName: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const users = await prisma.user.findMany({
    where,
    take: 20, // Limit results for performance
    select: {
      id: true,
      displayName: true,
      username: true,
      email: true,
      wallet: {
        select: {
          balance: true,
          frozenAt: true,
        },
      },
    },
    orderBy: {
      displayName: 'asc',
    },
  })

  return users.map((user) => ({
    userId: user.id,
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    balance: user.wallet?.balance || 0,
    frozenAt: user.wallet?.frozenAt || null,
  }))
}

interface SuspiciousAlert {
  type: 'large_transfer' | 'daily_limit' | 'balance_drop'
  severity: 'warning' | 'critical'
  userId: string
  displayName: string
  details: string
  timestamp: Date
}

/**
 * Get suspicious activity alerts
 */
export async function getSuspiciousActivity(): Promise<SuspiciousAlert[]> {
  await requireAdmin()

  // Get SystemSettings for alert thresholds
  const settings = await prisma.systemSettings.findFirst()
  const alertTransferLimit = settings?.alertTransferLimit || 2000
  const alertBalanceDropPct = settings?.alertBalanceDropPct || 50
  const transferDailyLimit = settings?.transferDailyLimit || 5000

  const twentyFourHoursAgo = subDays(new Date(), 1)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const alerts: SuspiciousAlert[] = []

  // Query 1: Large transfers
  const largeTransfers = await prisma.transaction.findMany({
    where: {
      type: 'TRANSFER_SENT',
      createdAt: { gte: twentyFourHoursAgo },
      amount: { gte: alertTransferLimit },
    },
    include: {
      user: {
        select: {
          displayName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  for (const tx of largeTransfers) {
    alerts.push({
      type: 'large_transfer',
      severity: tx.amount >= alertTransferLimit * 2 ? 'critical' : 'warning',
      userId: tx.userId,
      displayName: tx.user.displayName,
      details: `Transfer von ${tx.amount} (Limit: ${alertTransferLimit})`,
      timestamp: tx.createdAt,
    })
  }

  // Query 2: Daily transfer limit exceeded
  const dailyTransfers = await prisma.$queryRaw<
    Array<{
      user_id: string
      total: bigint
      display_name: string
    }>
  >`
    SELECT
      t.user_id,
      SUM(t.amount) as total,
      u.display_name
    FROM "Transaction" t
    JOIN "User" u ON u.id = t.user_id
    WHERE t.type = 'TRANSFER_SENT'
      AND t.created_at >= ${twentyFourHoursAgo}
    GROUP BY t.user_id, u.display_name
    HAVING SUM(t.amount) > ${transferDailyLimit}
    ORDER BY total DESC
  `

  for (const item of dailyTransfers) {
    const total = Number(item.total)
    alerts.push({
      type: 'daily_limit',
      severity: 'critical',
      userId: item.user_id,
      displayName: item.display_name,
      details: `Tagessumme: ${total} (Limit: ${transferDailyLimit})`,
      timestamp: new Date(),
    })
  }

  // Query 3: Rapid balance drops
  // Get users who had transactions in the last hour
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: oneHourAgo },
    },
    select: {
      userId: true,
    },
    distinct: ['userId'],
  })

  for (const { userId } of recentTransactions) {
    // Get current balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            displayName: true,
          },
        },
      },
    })

    if (!wallet) continue

    // Calculate balance 1 hour ago
    const transactionsSinceOneHour = await prisma.transaction.findMany({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
      },
      select: {
        type: true,
        amount: true,
      },
    })

    let previousBalance = wallet.balance
    for (const tx of transactionsSinceOneHour) {
      // Work backwards
      const isDebit =
        tx.type === 'BET_PLACED' ||
        tx.type === 'TRANSFER_SENT' ||
        tx.type === 'ADMIN_DEBIT'
      if (isDebit) {
        previousBalance += tx.amount
      } else {
        previousBalance -= tx.amount
      }
    }

    // Calculate drop percentage
    if (previousBalance > 0) {
      const drop = previousBalance - wallet.balance
      const dropPct = (drop / previousBalance) * 100

      if (dropPct >= alertBalanceDropPct) {
        alerts.push({
          type: 'balance_drop',
          severity: dropPct >= 80 ? 'critical' : 'warning',
          userId: wallet.userId,
          displayName: wallet.user.displayName,
          details: `Von ${previousBalance} auf ${wallet.balance} (-${dropPct.toFixed(0)}%)`,
          timestamp: new Date(),
        })
      }
    }
  }

  // Sort by timestamp desc
  alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  return alerts
}
