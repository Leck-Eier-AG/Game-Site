import type { DiceValues, DiceValue, KniffelScoresheet, ScoreCategory, KniffelRuleset } from '@/types/game'

/**
 * Calculate the score for a given category and dice roll
 */
export function calculateScore(category: ScoreCategory, dice: DiceValues): number {
  const counts = getDiceCounts(dice)

  switch (category) {
    // Upper section - count matching dice
    case 'ones':
      return counts[1] * 1
    case 'twos':
      return counts[2] * 2
    case 'threes':
      return counts[3] * 3
    case 'fours':
      return counts[4] * 4
    case 'fives':
      return counts[5] * 5
    case 'sixes':
      return counts[6] * 6

    // Three of a kind - sum of all dice if at least 3 match
    case 'threeOfKind':
      return hasNOfKind(counts, 3) ? sumDice(dice) : 0

    // Four of a kind - sum of all dice if at least 4 match
    case 'fourOfKind':
      return hasNOfKind(counts, 4) ? sumDice(dice) : 0

    // Full house - exactly 3 of one kind and 2 of another
    case 'fullHouse':
      return isFullHouse(counts) ? 25 : 0

    // Small straight - any sequence of 4 consecutive numbers
    case 'smallStraight':
      return hasSmallStraight(counts) ? 30 : 0

    // Large straight - sequence of 5 consecutive numbers
    case 'largeStraight':
      return hasLargeStraight(counts) ? 40 : 0

    // Kniffel - all 5 dice the same
    case 'kniffel':
      return hasNOfKind(counts, 5) ? 50 : 0

    // Chance - sum of all dice
    case 'chance':
      return sumDice(dice)

    // Special categories
    case 'twoPairs':
      return hasTwoPairs(counts) ? sumDice(dice) : 0

    case 'allEven':
      return dice.every(die => die % 2 === 0) ? sumDice(dice) : 0

    case 'sumAtLeast24':
      return sumDice(dice) >= 24 ? sumDice(dice) : 0

    default:
      return 0
  }
}

/**
 * Calculate score with ruleset overrides
 */
export function calculateScoreWithRuleset(
  category: ScoreCategory,
  dice: DiceValues,
  ruleset: KniffelRuleset
): number {
  if (category === 'fullHouse' && ruleset.fullHouseUsesSum) {
    return isFullHouse(getDiceCounts(dice)) ? sumDice(dice) : 0
  }

  if (ruleset.strictStraights) {
    if (category === 'smallStraight') {
      return hasStrictSmallStraight(getDiceCounts(dice)) ? 30 : 0
    }
    if (category === 'largeStraight') {
      return hasStrictLargeStraight(getDiceCounts(dice)) ? 40 : 0
    }
  }

  return calculateScore(category, dice)
}

/**
 * Calculate upper section bonus (35 points if sum >= 63)
 */
export function calculateUpperBonus(scoresheet: KniffelScoresheet): number {
  const upperSum = (
    (scoresheet.ones ?? 0) +
    (scoresheet.twos ?? 0) +
    (scoresheet.threes ?? 0) +
    (scoresheet.fours ?? 0) +
    (scoresheet.fives ?? 0) +
    (scoresheet.sixes ?? 0)
  )

  return upperSum >= 63 ? 35 : 0
}

/**
 * Get all available (unfilled) categories from a scoresheet
 */
export function getAvailableCategories(scoresheet: KniffelScoresheet): ScoreCategory[] {
  const allCategories: ScoreCategory[] = [
    'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
    'threeOfKind', 'fourOfKind', 'fullHouse',
    'smallStraight', 'largeStraight', 'kniffel', 'chance'
  ]

  return allCategories.filter(category => {
    const value = scoresheet[category]
    return value === undefined
  })
}

export function getAvailableCategoriesWithRuleset(
  scoresheet: KniffelScoresheet,
  ruleset: KniffelRuleset
): ScoreCategory[] {
  const base = getAvailableCategories(scoresheet)

  if (!ruleset.categoryRandomizer.enabled) {
    return base
  }

  const disabled = new Set(ruleset.categoryRandomizer.disabledCategories)
  const specials = ruleset.categoryRandomizer.specialCategories

  const filtered = base.filter(category => !disabled.has(category))
  const extras = specials.filter(category => scoresheet[category] === undefined && !filtered.includes(category))

  return [...filtered, ...extras]
}

/**
 * Automatically pick the best available category for given dice
 */
export function autoPickCategory(
  dice: DiceValues,
  scoresheet: KniffelScoresheet,
  ruleset?: KniffelRuleset
): ScoreCategory {
  const available = ruleset
    ? getAvailableCategoriesWithRuleset(scoresheet, ruleset)
    : getAvailableCategories(scoresheet)

  if (available.length === 0) {
    throw new Error('No available categories')
  }

  // Calculate scores for all available categories
  const scores = available.map(category => ({
    category,
    score: ruleset
      ? calculateScoreWithRuleset(category, dice, ruleset)
      : calculateScore(category, dice)
  }))

  const maxScore = Math.max(...scores.map(entry => entry.score))
  if (ruleset && ruleset.speedMode.autoScore && !ruleset.allowScratch && maxScore === 0) {
    return pickLowestPenaltyCategory(available)
  }

  // Sort by score descending, prefer lower section on ties
  scores.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    // On tie, prefer lower section categories
    const lowerSection: ScoreCategory[] = ['threeOfKind', 'fourOfKind', 'fullHouse', 'smallStraight', 'largeStraight', 'kniffel', 'chance']
    const aIsLower = lowerSection.includes(a.category)
    const bIsLower = lowerSection.includes(b.category)
    if (aIsLower && !bIsLower) return -1
    if (!aIsLower && bIsLower) return 1
    return 0
  })

  return scores[0].category
}

/**
 * Calculate total score including bonus
 */
export function calculateTotalScore(scoresheet: KniffelScoresheet): number {
  const categorySum = (
    (scoresheet.ones ?? 0) +
    (scoresheet.twos ?? 0) +
    (scoresheet.threes ?? 0) +
    (scoresheet.fours ?? 0) +
    (scoresheet.fives ?? 0) +
    (scoresheet.sixes ?? 0) +
    (scoresheet.threeOfKind ?? 0) +
    (scoresheet.fourOfKind ?? 0) +
    (scoresheet.fullHouse ?? 0) +
    (scoresheet.smallStraight ?? 0) +
    (scoresheet.largeStraight ?? 0) +
    (scoresheet.kniffel ?? 0) +
    (scoresheet.chance ?? 0) +
    (scoresheet.twoPairs ?? 0) +
    (scoresheet.allEven ?? 0) +
    (scoresheet.sumAtLeast24 ?? 0)
  )

  const bonus = calculateUpperBonus(scoresheet)

  return categorySum + bonus
}

export function calculateTotalScoreWithRuleset(
  scoresheet: KniffelScoresheet | { columns: KniffelScoresheet[] },
  ruleset: KniffelRuleset
): number {
  if ('columns' in scoresheet) {
    return scoresheet.columns.reduce((sum, column, index) => {
      const multiplier = ruleset.columnMultipliers[index] ?? 1
      return sum + calculateTotalScore(column) * multiplier
    }, 0)
  }

  return calculateTotalScore(scoresheet)
}

// Helper functions

/**
 * Count occurrences of each die value (1-6)
 */
function getDiceCounts(dice: DiceValues): Record<DiceValue, number> {
  const counts: Record<DiceValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }

  for (const die of dice) {
    counts[die]++
  }

  return counts
}

/**
 * Check if at least N dice have the same value
 */
function hasNOfKind(counts: Record<DiceValue, number>, n: number): boolean {
  return Object.values(counts).some(count => count >= n)
}

/**
 * Check if dice form a full house (exactly 3 of one kind and 2 of another)
 */
function isFullHouse(counts: Record<DiceValue, number>): boolean {
  const countValues = Object.values(counts).filter(c => c > 0).sort()
  // Must have exactly two groups: [2, 3]
  return countValues.length === 2 && countValues[0] === 2 && countValues[1] === 3
}

/**
 * Check if dice contain a small straight (4 consecutive numbers)
 */
function hasSmallStraight(counts: Record<DiceValue, number>): boolean {
  // Check for [1,2,3,4], [2,3,4,5], or [3,4,5,6]
  const patterns = [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6]
  ]

  return patterns.some(pattern =>
    pattern.every(value => counts[value as DiceValue] >= 1)
  )
}

/**
 * Check if dice contain a large straight (5 consecutive numbers)
 */
function hasLargeStraight(counts: Record<DiceValue, number>): boolean {
  // Check for [1,2,3,4,5] or [2,3,4,5,6]
  const patterns = [
    [1, 2, 3, 4, 5],
    [2, 3, 4, 5, 6]
  ]

  return patterns.some(pattern =>
    pattern.every(value => counts[value as DiceValue] >= 1)
  )
}

function hasTwoPairs(counts: Record<DiceValue, number>): boolean {
  const pairCount = Object.values(counts).filter(count => count >= 2).length
  return pairCount >= 2
}

function hasStrictSmallStraight(counts: Record<DiceValue, number>): boolean {
  return [1, 2, 3, 4, 5].every(value => counts[value as DiceValue] >= 1)
}

function hasStrictLargeStraight(counts: Record<DiceValue, number>): boolean {
  return [2, 3, 4, 5, 6].every(value => counts[value as DiceValue] >= 1)
}

/**
 * Sum all dice values
 */
function sumDice(dice: DiceValues): number {
  return dice.reduce((sum, die) => sum + die, 0)
}

function pickLowestPenaltyCategory(categories: ScoreCategory[]): ScoreCategory {
  const priority: ScoreCategory[] = [
    'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
    'threeOfKind', 'fourOfKind', 'fullHouse',
    'smallStraight', 'largeStraight', 'kniffel', 'chance',
    'twoPairs', 'allEven', 'sumAtLeast24'
  ]

  for (const category of priority) {
    if (categories.includes(category)) return category
  }

  return categories[0]
}
