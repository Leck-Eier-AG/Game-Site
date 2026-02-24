import type { ScoreCategory } from '@/types/game'

export function getResultsLowerCategories(): ScoreCategory[] {
  return [
    'threeOfKind',
    'fourOfKind',
    'fullHouse',
    'smallStraight',
    'largeStraight',
    'kniffel',
    'chance',
    'twoPairs',
    'allEven',
    'sumAtLeast24',
  ]
}
