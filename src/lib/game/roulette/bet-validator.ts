/**
 * Roulette bet validation and payout calculation
 * Supports all 13 standard European roulette bet types
 */

import { getNumberColor, getNumberProperties } from './wheel'

export type RouletteBetType =
  | 'straight' // Single number (0-36)
  | 'split' // Two adjacent numbers
  | 'street' // Three numbers in a row
  | 'corner' // Four numbers forming a square
  | 'line' // Six numbers (two adjacent streets)
  | 'dozen' // 12 numbers (1-12, 13-24, or 25-36)
  | 'column' // 12 numbers in a column
  | 'red' // All red numbers
  | 'black' // All black numbers
  | 'odd' // All odd numbers (1-35)
  | 'even' // All even numbers (2-36)
  | 'low' // Low numbers (1-18)
  | 'high' // High numbers (19-36)

export interface BetConfig {
  count: number // Number of numbers covered
  payout: number // Payout ratio (not including original bet)
}

// European roulette bet configurations
export const ROULETTE_BETS: Record<RouletteBetType, BetConfig> = {
  straight: { count: 1, payout: 35 },
  split: { count: 2, payout: 17 },
  street: { count: 3, payout: 11 },
  corner: { count: 4, payout: 8 },
  line: { count: 6, payout: 5 },
  dozen: { count: 12, payout: 2 },
  column: { count: 12, payout: 2 },
  red: { count: 18, payout: 1 },
  black: { count: 18, payout: 1 },
  odd: { count: 18, payout: 1 },
  even: { count: 18, payout: 1 },
  low: { count: 18, payout: 1 },
  high: { count: 18, payout: 1 }
}

// Outside bets that don't require specific numbers
const OUTSIDE_BETS: RouletteBetType[] = ['red', 'black', 'odd', 'even', 'low', 'high']

/**
 * Validate that a bet has the correct number count and valid combinations
 */
export function validateBet(betType: RouletteBetType, numbers: number[]): boolean {
  const config = ROULETTE_BETS[betType]

  // Outside bets don't need numbers specified
  if (OUTSIDE_BETS.includes(betType)) {
    return numbers.length === 0
  }

  // Inside bets need exact count
  if (numbers.length !== config.count) {
    return false
  }

  // Validate each number is in range
  if (numbers.some(n => n < 0 || n > 36)) {
    return false
  }

  // Type-specific validation
  switch (betType) {
    case 'straight':
      return numbers.length === 1

    case 'split':
      return validateSplit(numbers)

    case 'street':
      return validateStreet(numbers)

    case 'corner':
      return validateCorner(numbers)

    case 'line':
      return validateLine(numbers)

    case 'dozen':
      return validateDozen(numbers)

    case 'column':
      return validateColumn(numbers)

    default:
      return true
  }
}

/**
 * Validate split bet (two adjacent numbers)
 */
function validateSplit(numbers: number[]): boolean {
  if (numbers.length !== 2) return false

  const [a, b] = numbers.sort((x, y) => x - y)

  // Horizontal adjacency (same row)
  if (b - a === 1 && Math.floor((a - 1) / 3) === Math.floor((b - 1) / 3)) {
    return true
  }

  // Vertical adjacency (same column)
  if (b - a === 3) {
    return true
  }

  return false
}

/**
 * Validate street bet (three numbers in a row)
 */
function validateStreet(numbers: number[]): boolean {
  if (numbers.length !== 3) return false

  const sorted = numbers.sort((a, b) => a - b)

  // Must be consecutive and form a row
  // Rows: [1,2,3], [4,5,6], ..., [34,35,36]
  const firstNumber = sorted[0]
  if (firstNumber < 1 || firstNumber > 34) return false

  // First number must be start of a row (1, 4, 7, 10, ...)
  if ((firstNumber - 1) % 3 !== 0) return false

  // Check consecutive
  return sorted[1] === firstNumber + 1 && sorted[2] === firstNumber + 2
}

/**
 * Validate corner bet (four numbers forming a square)
 */
function validateCorner(numbers: number[]): boolean {
  if (numbers.length !== 4) return false

  const sorted = numbers.sort((a, b) => a - b)
  const [a, b, c, d] = sorted

  // Must form a 2x2 square
  // Pattern: [n, n+1, n+3, n+4]
  if (b === a + 1 && c === a + 3 && d === a + 4) {
    // Check that 'a' can be top-left of a corner
    // Must not be in 3rd column (3, 6, 9, ..., 36)
    const col = (a - 1) % 3
    return col !== 2
  }

  return false
}

/**
 * Validate line bet (six numbers = two adjacent streets)
 */
function validateLine(numbers: number[]): boolean {
  if (numbers.length !== 6) return false

  const sorted = numbers.sort((a, b) => a - b)

  // Must be two consecutive streets
  const firstNumber = sorted[0]
  if (firstNumber < 1 || firstNumber > 31) return false

  // First number must be start of a row
  if ((firstNumber - 1) % 3 !== 0) return false

  // Check all six are consecutive
  for (let i = 0; i < 6; i++) {
    if (sorted[i] !== firstNumber + i) return false
  }

  return true
}

/**
 * Validate dozen bet (12 numbers in same dozen)
 */
function validateDozen(numbers: number[]): boolean {
  if (numbers.length !== 12) return false

  const sorted = numbers.sort((a, b) => a - b)

  // First dozen: 1-12
  if (sorted[0] === 1 && sorted[11] === 12) {
    return sorted.every((n, i) => n === i + 1)
  }

  // Second dozen: 13-24
  if (sorted[0] === 13 && sorted[11] === 24) {
    return sorted.every((n, i) => n === i + 13)
  }

  // Third dozen: 25-36
  if (sorted[0] === 25 && sorted[11] === 36) {
    return sorted.every((n, i) => n === i + 25)
  }

  return false
}

/**
 * Validate column bet (12 numbers in same column)
 */
function validateColumn(numbers: number[]): boolean {
  if (numbers.length !== 12) return false

  const sorted = numbers.sort((a, b) => a - b)

  // Determine column from first number
  const col = (sorted[0] - 1) % 3

  // Check all numbers are in same column
  for (let i = 0; i < 12; i++) {
    const expected = col + 1 + i * 3
    if (sorted[i] !== expected) return false
  }

  return true
}

/**
 * Calculate payout for a bet given the winning number
 * Returns 0 if bet loses, betAmount * (payout + 1) if bet wins
 */
export function calculateBetPayout(
  betType: RouletteBetType,
  betAmount: number,
  winningNumber: number,
  numbers?: number | number[]
): number {
  const config = ROULETTE_BETS[betType]

  // Normalize numbers to array
  const numbersArray = typeof numbers === 'number' ? [numbers] : numbers

  // Check if bet wins
  const wins = doesBetWin(betType, winningNumber, numbersArray)

  if (!wins) return 0

  // Winning payout = bet amount * (payout ratio + 1)
  // The +1 returns the original bet
  return betAmount * (config.payout + 1)
}

/**
 * Check if a bet wins on the given number
 */
function doesBetWin(betType: RouletteBetType, winningNumber: number, numbers?: number[]): boolean {
  const props = getNumberProperties(winningNumber)

  switch (betType) {
    case 'straight':
      return numbers ? numbers.includes(winningNumber) : false

    case 'split':
    case 'street':
    case 'corner':
    case 'line':
      return numbers ? numbers.includes(winningNumber) : false

    case 'dozen':
      return numbers ? numbers.includes(winningNumber) : false

    case 'column':
      return numbers ? numbers.includes(winningNumber) : false

    case 'red':
      return props.color === 'red'

    case 'black':
      return props.color === 'black'

    case 'odd':
      return props.isOdd

    case 'even':
      return props.isEven

    case 'low':
      return props.isLow

    case 'high':
      return props.isHigh

    default:
      return false
  }
}

/**
 * Generate number array for outside bets
 * Used for UI/display purposes
 */
export function getBetNumbers(betType: RouletteBetType, identifier?: string): number[] {
  switch (betType) {
    case 'red':
      return [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]

    case 'black':
      return [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]

    case 'odd':
      return [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35]

    case 'even':
      return [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36]

    case 'low':
      return Array.from({ length: 18 }, (_, i) => i + 1)

    case 'high':
      return Array.from({ length: 18 }, (_, i) => i + 19)

    case 'dozen':
      if (identifier === '1st') return Array.from({ length: 12 }, (_, i) => i + 1)
      if (identifier === '2nd') return Array.from({ length: 12 }, (_, i) => i + 13)
      if (identifier === '3rd') return Array.from({ length: 12 }, (_, i) => i + 25)
      return []

    case 'column':
      if (identifier === '1st') return [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
      if (identifier === '2nd') return [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35]
      if (identifier === '3rd') return [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]
      return []

    default:
      return []
  }
}
