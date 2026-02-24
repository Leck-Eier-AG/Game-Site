import type { ScoreCategory } from '@/types/game'

export function isCategoryAllowedByConstraints(
  constraints: string[],
  category: ScoreCategory
): boolean {
  if (constraints.includes('noChance') && category === 'chance') {
    return false
  }

  return true
}
