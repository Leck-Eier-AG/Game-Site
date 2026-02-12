import { prisma } from '@/lib/db'
import { TransactionType } from '@prisma/client'

/**
 * User activity metrics for calculating daily allowance multiplier
 */
export interface ActivityMetrics {
  gamesLast7Days: number
  activeMinutesLast7Days: number
  loginStreakDays: number
}

/**
 * Get user's recent activity metrics
 * Used to calculate daily allowance multiplier
 */
export async function getUserActivityMetrics(userId: string): Promise<ActivityMetrics> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Get wallet for login streak
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { dailyClaimStreak: true },
  })

  // Count games played in last 7 days (GAME_WIN and BET_PLACED transactions)
  const gameTransactions = await prisma.transaction.count({
    where: {
      userId,
      OR: [
        { type: TransactionType.GAME_WIN },
        { type: TransactionType.BET_PLACED },
      ],
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
  })

  // Estimate active time from transaction frequency
  // Count distinct days with transactions, multiply by 30 as rough proxy
  const distinctDays = await prisma.transaction.groupBy({
    by: ['userId'],
    where: {
      userId,
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
    _count: {
      id: true,
    },
  })

  // Estimate: count distinct transaction days
  const transactionDays = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(DISTINCT DATE("createdAt")) as count
    FROM "Transaction"
    WHERE "userId" = ${userId}
      AND "createdAt" >= ${sevenDaysAgo}
  `

  const activeDays = Number(transactionDays[0]?.count || 0)
  const estimatedActiveMinutes = activeDays * 30

  return {
    gamesLast7Days: gameTransactions,
    activeMinutesLast7Days: estimatedActiveMinutes,
    loginStreakDays: wallet?.dailyClaimStreak || 0,
  }
}

/**
 * Calculate activity multiplier for daily allowance
 * Base: 1.0, max: 2.0
 */
export function calculateActivityMultiplier(metrics: ActivityMetrics): number {
  let multiplier = 1.0

  // Games contribution: +0.05 per game, cap at +0.5 (10 games)
  const gamesBonus = Math.min(metrics.gamesLast7Days * 0.05, 0.5)
  multiplier += gamesBonus

  // Active time contribution: +0.01 per 30min, cap at +0.3
  const activeTimeBonus = Math.min(metrics.activeMinutesLast7Days / 30 * 0.01, 0.3)
  multiplier += activeTimeBonus

  // Login streak contribution: +0.02 per day, cap at +0.2
  const streakBonus = Math.min(metrics.loginStreakDays * 0.02, 0.2)
  multiplier += streakBonus

  // Total cap: 2.0
  return Math.min(multiplier, 2.0)
}
