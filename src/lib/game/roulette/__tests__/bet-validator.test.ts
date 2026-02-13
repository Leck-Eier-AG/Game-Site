import { describe, it, expect } from '@jest/globals'
import {
  ROULETTE_BETS,
  validateBet,
  calculateBetPayout,
  getBetNumbers,
  type RouletteBetType
} from '../bet-validator'

describe('ROULETTE_BETS configuration', () => {
  it('has correct payout ratios for all bet types', () => {
    expect(ROULETTE_BETS.straight).toEqual({ count: 1, payout: 35 })
    expect(ROULETTE_BETS.split).toEqual({ count: 2, payout: 17 })
    expect(ROULETTE_BETS.street).toEqual({ count: 3, payout: 11 })
    expect(ROULETTE_BETS.corner).toEqual({ count: 4, payout: 8 })
    expect(ROULETTE_BETS.line).toEqual({ count: 6, payout: 5 })
    expect(ROULETTE_BETS.dozen).toEqual({ count: 12, payout: 2 })
    expect(ROULETTE_BETS.column).toEqual({ count: 12, payout: 2 })
    expect(ROULETTE_BETS.red).toEqual({ count: 18, payout: 1 })
    expect(ROULETTE_BETS.black).toEqual({ count: 18, payout: 1 })
    expect(ROULETTE_BETS.odd).toEqual({ count: 18, payout: 1 })
    expect(ROULETTE_BETS.even).toEqual({ count: 18, payout: 1 })
    expect(ROULETTE_BETS.low).toEqual({ count: 18, payout: 1 })
    expect(ROULETTE_BETS.high).toEqual({ count: 18, payout: 1 })
  })
})

describe('validateBet - straight', () => {
  it('validates single number 0-36', () => {
    expect(validateBet('straight', [0])).toBe(true)
    expect(validateBet('straight', [1])).toBe(true)
    expect(validateBet('straight', [18])).toBe(true)
    expect(validateBet('straight', [36])).toBe(true)
  })

  it('rejects invalid straight bets', () => {
    expect(validateBet('straight', [])).toBe(false)
    expect(validateBet('straight', [1, 2])).toBe(false)
    expect(validateBet('straight', [37])).toBe(false)
    expect(validateBet('straight', [-1])).toBe(false)
  })
})

describe('validateBet - split', () => {
  it('validates horizontal adjacent numbers', () => {
    expect(validateBet('split', [1, 2])).toBe(true)
    expect(validateBet('split', [2, 3])).toBe(true)
    expect(validateBet('split', [34, 35])).toBe(true)
  })

  it('validates vertical adjacent numbers', () => {
    expect(validateBet('split', [1, 4])).toBe(true)
    expect(validateBet('split', [2, 5])).toBe(true)
    expect(validateBet('split', [33, 36])).toBe(true)
  })

  it('rejects non-adjacent numbers', () => {
    expect(validateBet('split', [1, 3])).toBe(false)
    expect(validateBet('split', [1, 5])).toBe(false)
    expect(validateBet('split', [1, 7])).toBe(false)
  })

  it('rejects wrong count', () => {
    expect(validateBet('split', [1])).toBe(false)
    expect(validateBet('split', [1, 2, 3])).toBe(false)
  })
})

describe('validateBet - street', () => {
  it('validates horizontal rows', () => {
    expect(validateBet('street', [1, 2, 3])).toBe(true)
    expect(validateBet('street', [4, 5, 6])).toBe(true)
    expect(validateBet('street', [7, 8, 9])).toBe(true)
    expect(validateBet('street', [34, 35, 36])).toBe(true)
  })

  it('rejects non-row numbers', () => {
    expect(validateBet('street', [1, 2, 4])).toBe(false)
    expect(validateBet('street', [1, 3, 5])).toBe(false)
  })

  it('rejects wrong count', () => {
    expect(validateBet('street', [1, 2])).toBe(false)
    expect(validateBet('street', [1, 2, 3, 4])).toBe(false)
  })
})

describe('validateBet - corner', () => {
  it('validates 2x2 squares on grid', () => {
    expect(validateBet('corner', [1, 2, 4, 5])).toBe(true)
    expect(validateBet('corner', [2, 3, 5, 6])).toBe(true)
    expect(validateBet('corner', [32, 33, 35, 36])).toBe(true)
  })

  it('rejects non-corner combinations', () => {
    expect(validateBet('corner', [1, 2, 3, 4])).toBe(false)
    expect(validateBet('corner', [1, 3, 7, 9])).toBe(false)
  })

  it('rejects wrong count', () => {
    expect(validateBet('corner', [1, 2, 4])).toBe(false)
    expect(validateBet('corner', [1, 2, 4, 5, 8])).toBe(false)
  })
})

describe('validateBet - line', () => {
  it('validates two adjacent streets', () => {
    expect(validateBet('line', [1, 2, 3, 4, 5, 6])).toBe(true)
    expect(validateBet('line', [4, 5, 6, 7, 8, 9])).toBe(true)
    expect(validateBet('line', [31, 32, 33, 34, 35, 36])).toBe(true)
  })

  it('rejects non-adjacent streets', () => {
    expect(validateBet('line', [1, 2, 3, 7, 8, 9])).toBe(false)
  })

  it('rejects wrong count', () => {
    expect(validateBet('line', [1, 2, 3, 4, 5])).toBe(false)
    expect(validateBet('line', [1, 2, 3, 4, 5, 6, 7])).toBe(false)
  })
})

describe('validateBet - dozen', () => {
  it('validates first dozen (1-12)', () => {
    const firstDozen = Array.from({ length: 12 }, (_, i) => i + 1)
    expect(validateBet('dozen', firstDozen)).toBe(true)
  })

  it('validates second dozen (13-24)', () => {
    const secondDozen = Array.from({ length: 12 }, (_, i) => i + 13)
    expect(validateBet('dozen', secondDozen)).toBe(true)
  })

  it('validates third dozen (25-36)', () => {
    const thirdDozen = Array.from({ length: 12 }, (_, i) => i + 25)
    expect(validateBet('dozen', thirdDozen)).toBe(true)
  })

  it('rejects mixed dozens', () => {
    expect(validateBet('dozen', [1, 2, 3, 13, 14, 15, 25, 26, 27, 28, 29, 30])).toBe(false)
  })

  it('rejects wrong count', () => {
    expect(validateBet('dozen', [1, 2, 3])).toBe(false)
  })
})

describe('validateBet - column', () => {
  it('validates first column (1, 4, 7, ..., 34)', () => {
    const col1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
    expect(validateBet('column', col1)).toBe(true)
  })

  it('validates second column (2, 5, 8, ..., 35)', () => {
    const col2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35]
    expect(validateBet('column', col2)).toBe(true)
  })

  it('validates third column (3, 6, 9, ..., 36)', () => {
    const col3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]
    expect(validateBet('column', col3)).toBe(true)
  })

  it('rejects mixed columns', () => {
    expect(validateBet('column', [1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17])).toBe(false)
  })

  it('rejects wrong count', () => {
    expect(validateBet('column', [1, 4, 7])).toBe(false)
  })
})

describe('validateBet - outside bets', () => {
  it('validates red/black/odd/even/low/high without numbers', () => {
    expect(validateBet('red', [])).toBe(true)
    expect(validateBet('black', [])).toBe(true)
    expect(validateBet('odd', [])).toBe(true)
    expect(validateBet('even', [])).toBe(true)
    expect(validateBet('low', [])).toBe(true)
    expect(validateBet('high', [])).toBe(true)
  })

  it('rejects outside bets with numbers', () => {
    expect(validateBet('red', [1, 3, 5])).toBe(false)
    expect(validateBet('black', [2, 4, 6])).toBe(false)
  })
})

describe('calculateBetPayout', () => {
  it('returns 0 for losing straight bet', () => {
    expect(calculateBetPayout('straight', 10, 5, 7)).toBe(0)
  })

  it('calculates winning straight bet (35:1)', () => {
    expect(calculateBetPayout('straight', 10, 7, 7)).toBe(360) // 10 * (35 + 1)
  })

  it('calculates winning straight bet on 0', () => {
    expect(calculateBetPayout('straight', 10, 0, 0)).toBe(360)
  })

  it('calculates winning split bet (17:1)', () => {
    expect(calculateBetPayout('split', 10, 5, [4, 5])).toBe(180) // 10 * (17 + 1)
  })

  it('calculates winning street bet (11:1)', () => {
    expect(calculateBetPayout('street', 10, 5, [4, 5, 6])).toBe(120)
  })

  it('calculates winning corner bet (8:1)', () => {
    expect(calculateBetPayout('corner', 10, 5, [2, 3, 5, 6])).toBe(90)
  })

  it('calculates winning line bet (5:1)', () => {
    expect(calculateBetPayout('line', 10, 5, [4, 5, 6, 7, 8, 9])).toBe(60)
  })

  it('calculates winning dozen bet (2:1)', () => {
    const firstDozen = Array.from({ length: 12 }, (_, i) => i + 1)
    expect(calculateBetPayout('dozen', 10, 5, firstDozen)).toBe(30)
  })

  it('calculates winning column bet (2:1)', () => {
    const col1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
    expect(calculateBetPayout('column', 10, 7, col1)).toBe(30)
  })

  it('calculates winning red bet (1:1)', () => {
    expect(calculateBetPayout('red', 10, 1)).toBe(20) // 1 is red
  })

  it('calculates losing red bet', () => {
    expect(calculateBetPayout('red', 10, 2)).toBe(0) // 2 is black
  })

  it('red bet loses on 0 (green)', () => {
    expect(calculateBetPayout('red', 10, 0)).toBe(0)
  })

  it('calculates winning black bet (1:1)', () => {
    expect(calculateBetPayout('black', 10, 2)).toBe(20) // 2 is black
  })

  it('black bet loses on 0 (green)', () => {
    expect(calculateBetPayout('black', 10, 0)).toBe(0)
  })

  it('calculates winning odd bet (1:1)', () => {
    expect(calculateBetPayout('odd', 10, 1)).toBe(20)
    expect(calculateBetPayout('odd', 10, 35)).toBe(20)
  })

  it('odd bet loses on 0 (green)', () => {
    expect(calculateBetPayout('odd', 10, 0)).toBe(0)
  })

  it('calculates winning even bet (1:1)', () => {
    expect(calculateBetPayout('even', 10, 2)).toBe(20)
    expect(calculateBetPayout('even', 10, 36)).toBe(20)
  })

  it('even bet loses on 0 (green)', () => {
    expect(calculateBetPayout('even', 10, 0)).toBe(0)
  })

  it('calculates winning low bet (1-18)', () => {
    expect(calculateBetPayout('low', 10, 1)).toBe(20)
    expect(calculateBetPayout('low', 10, 18)).toBe(20)
  })

  it('low bet loses on 0 and 19-36', () => {
    expect(calculateBetPayout('low', 10, 0)).toBe(0)
    expect(calculateBetPayout('low', 10, 19)).toBe(0)
  })

  it('calculates winning high bet (19-36)', () => {
    expect(calculateBetPayout('high', 10, 19)).toBe(20)
    expect(calculateBetPayout('high', 10, 36)).toBe(20)
  })

  it('high bet loses on 0 and 1-18', () => {
    expect(calculateBetPayout('high', 10, 0)).toBe(0)
    expect(calculateBetPayout('high', 10, 18)).toBe(0)
  })
})

describe('getBetNumbers', () => {
  it('generates red numbers', () => {
    const red = getBetNumbers('red')
    expect(red).toHaveLength(18)
    expect(red).toContain(1)
    expect(red).toContain(3)
    expect(red).toContain(36)
  })

  it('generates black numbers', () => {
    const black = getBetNumbers('black')
    expect(black).toHaveLength(18)
    expect(black).toContain(2)
    expect(black).toContain(4)
    expect(black).toContain(35)
  })

  it('generates odd numbers (1-35)', () => {
    const odd = getBetNumbers('odd')
    expect(odd).toHaveLength(18)
    expect(odd).toContain(1)
    expect(odd).toContain(35)
    expect(odd).not.toContain(0)
    expect(odd).not.toContain(2)
  })

  it('generates even numbers (2-36)', () => {
    const even = getBetNumbers('even')
    expect(even).toHaveLength(18)
    expect(even).toContain(2)
    expect(even).toContain(36)
    expect(even).not.toContain(0)
    expect(even).not.toContain(1)
  })

  it('generates low numbers (1-18)', () => {
    const low = getBetNumbers('low')
    expect(low).toHaveLength(18)
    expect(low).toEqual(Array.from({ length: 18 }, (_, i) => i + 1))
  })

  it('generates high numbers (19-36)', () => {
    const high = getBetNumbers('high')
    expect(high).toHaveLength(18)
    expect(high).toEqual(Array.from({ length: 18 }, (_, i) => i + 19))
  })

  it('generates first dozen (1-12)', () => {
    const dozen = getBetNumbers('dozen', '1st')
    expect(dozen).toHaveLength(12)
    expect(dozen).toEqual(Array.from({ length: 12 }, (_, i) => i + 1))
  })

  it('generates second dozen (13-24)', () => {
    const dozen = getBetNumbers('dozen', '2nd')
    expect(dozen).toHaveLength(12)
    expect(dozen).toEqual(Array.from({ length: 12 }, (_, i) => i + 13))
  })

  it('generates third dozen (25-36)', () => {
    const dozen = getBetNumbers('dozen', '3rd')
    expect(dozen).toHaveLength(12)
    expect(dozen).toEqual(Array.from({ length: 12 }, (_, i) => i + 25))
  })

  it('generates first column', () => {
    const col = getBetNumbers('column', '1st')
    expect(col).toHaveLength(12)
    expect(col).toEqual([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34])
  })

  it('generates second column', () => {
    const col = getBetNumbers('column', '2nd')
    expect(col).toHaveLength(12)
    expect(col).toEqual([2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35])
  })

  it('generates third column', () => {
    const col = getBetNumbers('column', '3rd')
    expect(col).toHaveLength(12)
    expect(col).toEqual([3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36])
  })
})
