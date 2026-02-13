/**
 * European Roulette wheel configuration
 * 37 numbers (0-36) with specific color assignments
 */

export type NumberColor = 'red' | 'black' | 'green'

// European wheel order (clockwise from 0)
export const EUROPEAN_WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
] as const

// Red numbers on European wheel
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

/**
 * Get the color of a roulette number
 */
export function getNumberColor(n: number): NumberColor {
  if (n === 0) return 'green'
  if (RED_NUMBERS.has(n)) return 'red'
  return 'black'
}

/**
 * Get comprehensive properties of a roulette number
 */
export function getNumberProperties(n: number) {
  const color = getNumberColor(n)
  const isEven = n !== 0 && n % 2 === 0
  const isOdd = n !== 0 && n % 2 === 1
  const isLow = n >= 1 && n <= 18
  const isHigh = n >= 19 && n <= 36

  let dozen: 1 | 2 | 3 | null = null
  if (n >= 1 && n <= 12) dozen = 1
  else if (n >= 13 && n <= 24) dozen = 2
  else if (n >= 25 && n <= 36) dozen = 3

  let column: 1 | 2 | 3 | null = null
  if (n >= 1 && n <= 36) {
    column = ((n - 1) % 3 + 1) as 1 | 2 | 3
  }

  return {
    color,
    isEven,
    isOdd,
    isLow,
    isHigh,
    dozen,
    column
  }
}
