import { prisma } from '@/lib/db'
import { Prisma, TransactionType } from '@prisma/client'
import { getUserActivityMetrics, calculateActivityMultiplier } from './activity-score'
import { getSystemSettings } from './transactions'

// Transaction configuration
const TX_CONFIG = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5000,
  timeout: 10000,
}

/**
 * Daily claim info for UI
 */
export interface DailyClaimInfo {
  canClaim: boolean
  amount: number
  multiplier: number
  nextBonusIn: number
  isWeeklyBonus: boolean
}

/**
 * Claim result
 */
export interface ClaimResult {
  amount: number
  type: 'DAILY_CLAIM' | 'WEEKLY_BONUS'
  multiplier: number
}

/**
 * Check if user can claim daily allowance
 * Once per day, resets at midnight UTC
 */
export async function canClaimDaily(userId: string): Promise<boolean> {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { lastDailyClaim: true },
  })

  if (!wallet) {
    return true // First claim (wallet will be created lazily)
  }

  if (!wallet.lastDailyClaim) {
    return true
  }

  // Check if last claim was before today (midnight UTC)
  const lastClaimDate = new Date(wallet.lastDailyClaim)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  return lastClaimDate < today
}

/**
 * Get daily claim information for display
 * Shows potential amount, multiplier, and bonus countdown
 */
export async function getDailyClaimInfo(userId: string): Promise<DailyClaimInfo> {
  const canClaim = await canClaimDaily(userId)
  const settings = await getSystemSettings()

  // Get or create wallet
  let wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { dailyClaimStreak: true },
  })

  if (!wallet) {
    wallet = { dailyClaimStreak: 0 }
  }

  // Get activity multiplier
  const metrics = await getUserActivityMetrics(userId)
  const multiplier = calculateActivityMultiplier(metrics)

  // Determine if next claim would be weekly bonus
  const nextStreak = wallet.dailyClaimStreak + 1
  const isWeeklyBonus = nextStreak % 7 === 0

  // Calculate amount
  let amount: number
  if (isWeeklyBonus) {
    // Weekly bonus: fixed amount, no multiplier
    amount = settings.weeklyBonusAmount
  } else {
    // Daily allowance: base * multiplier
    amount = Math.floor(settings.dailyAllowanceBase * multiplier)
  }

  // Calculate claims until next bonus
  const nextBonusIn = 7 - (nextStreak % 7)

  return {
    canClaim,
    amount,
    multiplier,
    nextBonusIn: nextBonusIn === 7 ? 0 : nextBonusIn,
    isWeeklyBonus,
  }
}

/**
 * Claim daily allowance
 * Non-accumulating: only claim current day
 * Activity-scaled amount, weekly bonus every 7th consecutive claim
 */
export async function claimDailyAllowance(userId: string): Promise<ClaimResult> {
  const result = await prisma.$transaction(
    async (tx) => {
      // Get current wallet state (re-check inside transaction for race safety)
      let wallet = await tx.wallet.findUnique({
        where: { userId },
        select: {
          balance: true,
          lastDailyClaim: true,
          dailyClaimStreak: true,
        },
      })

      // Verify can claim (race condition protection)
      if (wallet?.lastDailyClaim) {
        const lastClaimDate = new Date(wallet.lastDailyClaim)
        const today = new Date()
        today.setUTCHours(0, 0, 0, 0)

        if (lastClaimDate >= today) {
          throw new Error('Daily allowance already claimed today')
        }
      }

      // Calculate streak (reset if gap > 1 day)
      let newStreak = 1
      if (wallet?.lastDailyClaim) {
        const lastClaim = new Date(wallet.lastDailyClaim)
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setUTCHours(0, 0, 0, 0)

        // If last claim was yesterday or today, continue streak
        if (lastClaim >= yesterday) {
          newStreak = (wallet.dailyClaimStreak || 0) + 1
        }
      }

      // Get settings and activity metrics
      const settings = await getSystemSettings()
      const metrics = await getUserActivityMetrics(userId)
      const multiplier = calculateActivityMultiplier(metrics)

      // Determine if this is weekly bonus
      const isWeeklyBonus = newStreak % 7 === 0

      // Calculate amount
      let amount: number
      let type: 'DAILY_CLAIM' | 'WEEKLY_BONUS'
      let description: string

      if (isWeeklyBonus) {
        amount = settings.weeklyBonusAmount
        type = 'WEEKLY_BONUS'
        description = `Wöchentlicher Bonus (Claim #${newStreak})`
      } else {
        amount = Math.floor(settings.dailyAllowanceBase * multiplier)
        type = 'DAILY_CLAIM'
        description = `Tägliches Guthaben (${Math.round(multiplier * 100)}% Aktivität)`
      }

      // Update wallet (or create if doesn't exist via upsert)
      const updatedWallet = await tx.wallet.upsert({
        where: { userId },
        create: {
          userId,
          balance: settings.startingBalance + amount,
          lastDailyClaim: new Date(),
          dailyClaimStreak: newStreak,
        },
        update: {
          balance: {
            increment: amount,
          },
          lastDailyClaim: new Date(),
          dailyClaimStreak: newStreak,
        },
      })

      // Create transaction record
      await tx.transaction.create({
        data: {
          type: type === 'WEEKLY_BONUS' ? TransactionType.WEEKLY_BONUS : TransactionType.DAILY_CLAIM,
          amount,
          userId,
          description,
          metadata: {
            baseAmount: settings.dailyAllowanceBase,
            multiplier,
            metrics,
            isWeeklyBonus,
            streak: newStreak,
          } as unknown as Prisma.InputJsonValue,
        },
      })

      return {
        amount,
        type,
        multiplier,
      }
    },
    TX_CONFIG
  )

  return result
}
