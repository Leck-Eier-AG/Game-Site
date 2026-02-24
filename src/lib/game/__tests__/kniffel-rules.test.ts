import type { DiceValues, KniffelScoresheet, ScoreCategory, KniffelRuleset } from '@/types/game'
import {
  calculateScore,
  getAvailableCategories,
  calculateUpperBonus,
  autoPickCategory,
  calculateTotalScore,
  calculateScoreWithRuleset,
  getAvailableCategoriesWithRuleset,
} from '../kniffel-rules'

describe('calculateScore', () => {
  describe('Upper section (ones-sixes)', () => {
    it('calculates ones correctly', () => {
      expect(calculateScore('ones', [1, 1, 3, 4, 5])).toBe(2)
      expect(calculateScore('ones', [2, 3, 4, 5, 6])).toBe(0)
    })

    it('calculates twos correctly', () => {
      expect(calculateScore('twos', [2, 2, 2, 1, 3])).toBe(6)
      expect(calculateScore('twos', [1, 3, 4, 5, 6])).toBe(0)
    })

    it('calculates threes correctly', () => {
      expect(calculateScore('threes', [3, 3, 3, 3, 1])).toBe(12)
      expect(calculateScore('threes', [1, 2, 4, 5, 6])).toBe(0)
    })

    it('calculates fours correctly', () => {
      expect(calculateScore('fours', [4, 4, 4, 4, 4])).toBe(20)
      expect(calculateScore('fours', [1, 2, 3, 5, 6])).toBe(0)
    })

    it('calculates fives correctly', () => {
      expect(calculateScore('fives', [5, 5, 1, 2, 3])).toBe(10)
      expect(calculateScore('fives', [1, 2, 3, 4, 6])).toBe(0)
    })

    it('calculates sixes correctly', () => {
      expect(calculateScore('sixes', [6, 6, 6, 1, 2])).toBe(18)
      expect(calculateScore('sixes', [1, 2, 3, 4, 5])).toBe(0)
    })
  })

  describe('Three of a kind', () => {
    it('returns sum of all dice when three match', () => {
      expect(calculateScore('threeOfKind', [3, 3, 3, 2, 1])).toBe(12)
      expect(calculateScore('threeOfKind', [5, 5, 5, 6, 6])).toBe(27)
    })

    it('returns 0 when no three match', () => {
      expect(calculateScore('threeOfKind', [1, 2, 3, 4, 5])).toBe(0)
      expect(calculateScore('threeOfKind', [1, 1, 2, 2, 3])).toBe(0)
    })

    it('accepts four of a kind as three of a kind', () => {
      expect(calculateScore('threeOfKind', [4, 4, 4, 4, 2])).toBe(18)
    })

    it('accepts five of a kind as three of a kind', () => {
      expect(calculateScore('threeOfKind', [5, 5, 5, 5, 5])).toBe(25)
    })
  })

  describe('Four of a kind', () => {
    it('returns sum of all dice when four match', () => {
      expect(calculateScore('fourOfKind', [4, 4, 4, 4, 2])).toBe(18)
      expect(calculateScore('fourOfKind', [3, 3, 3, 3, 6])).toBe(18)
    })

    it('returns 0 when only three match', () => {
      expect(calculateScore('fourOfKind', [3, 3, 3, 2, 1])).toBe(0)
    })

    it('accepts five of a kind as four of a kind', () => {
      expect(calculateScore('fourOfKind', [5, 5, 5, 5, 5])).toBe(25)
    })
  })

  describe('Full house', () => {
    it('returns 25 for valid full house (3+2)', () => {
      expect(calculateScore('fullHouse', [3, 3, 3, 2, 2])).toBe(25)
      expect(calculateScore('fullHouse', [5, 5, 1, 1, 1])).toBe(25)
    })

    it('returns 0 for four of a kind', () => {
      expect(calculateScore('fullHouse', [3, 3, 3, 3, 2])).toBe(0)
    })

    it('returns 0 for five of a kind (kniffel)', () => {
      expect(calculateScore('fullHouse', [1, 1, 1, 1, 1])).toBe(0)
    })

    it('returns 0 for invalid combinations', () => {
      expect(calculateScore('fullHouse', [1, 2, 3, 4, 5])).toBe(0)
      expect(calculateScore('fullHouse', [1, 1, 2, 3, 4])).toBe(0)
    })
  })

  describe('Small straight', () => {
    it('returns 30 for [1,2,3,4] sequence', () => {
      expect(calculateScore('smallStraight', [1, 2, 3, 4, 6])).toBe(30)
      expect(calculateScore('smallStraight', [1, 2, 3, 4, 4])).toBe(30)
    })

    it('returns 30 for [2,3,4,5] sequence', () => {
      expect(calculateScore('smallStraight', [2, 3, 4, 5, 5])).toBe(30)
      expect(calculateScore('smallStraight', [2, 3, 4, 5, 1])).toBe(30)
    })

    it('returns 30 for [3,4,5,6] sequence', () => {
      expect(calculateScore('smallStraight', [3, 4, 5, 6, 1])).toBe(30)
      expect(calculateScore('smallStraight', [3, 4, 5, 6, 6])).toBe(30)
    })

    it('returns 0 for invalid straights', () => {
      expect(calculateScore('smallStraight', [1, 2, 4, 5, 6])).toBe(0)
      expect(calculateScore('smallStraight', [1, 2, 2, 5, 6])).toBe(0)
      expect(calculateScore('smallStraight', [1, 1, 1, 1, 1])).toBe(0)
    })

    it('accepts large straight as small straight', () => {
      expect(calculateScore('smallStraight', [1, 2, 3, 4, 5])).toBe(30)
      expect(calculateScore('smallStraight', [2, 3, 4, 5, 6])).toBe(30)
    })
  })

  describe('Large straight', () => {
    it('returns 40 for [1,2,3,4,5]', () => {
      expect(calculateScore('largeStraight', [1, 2, 3, 4, 5])).toBe(40)
    })

    it('returns 40 for [2,3,4,5,6]', () => {
      expect(calculateScore('largeStraight', [2, 3, 4, 5, 6])).toBe(40)
    })

    it('returns 0 for invalid straights', () => {
      expect(calculateScore('largeStraight', [1, 2, 3, 4, 6])).toBe(0)
      expect(calculateScore('largeStraight', [1, 3, 4, 5, 6])).toBe(0)
    })

    it('returns 0 for small straight', () => {
      expect(calculateScore('largeStraight', [1, 2, 3, 4, 4])).toBe(0)
    })
  })

  describe('Kniffel (five of a kind)', () => {
    it('returns 50 for five matching dice', () => {
      expect(calculateScore('kniffel', [5, 5, 5, 5, 5])).toBe(50)
      expect(calculateScore('kniffel', [1, 1, 1, 1, 1])).toBe(50)
    })

    it('returns 0 for four or fewer matching', () => {
      expect(calculateScore('kniffel', [5, 5, 5, 5, 4])).toBe(0)
      expect(calculateScore('kniffel', [3, 3, 3, 2, 1])).toBe(0)
    })
  })

  describe('Chance', () => {
    it('returns sum of all dice', () => {
      expect(calculateScore('chance', [1, 2, 3, 4, 5])).toBe(15)
      expect(calculateScore('chance', [6, 6, 6, 6, 6])).toBe(30)
      expect(calculateScore('chance', [1, 1, 1, 1, 1])).toBe(5)
    })
  })

  describe('Special categories', () => {
    it('scores twoPairs when two distinct pairs exist', () => {
      expect(calculateScore('twoPairs', [2, 2, 5, 5, 6])).toBe(20)
      expect(calculateScore('twoPairs', [3, 3, 4, 4, 4])).toBe(18)
    })

    it('returns 0 for twoPairs when fewer than two pairs exist', () => {
      expect(calculateScore('twoPairs', [2, 2, 3, 4, 5])).toBe(0)
      expect(calculateScore('twoPairs', [2, 3, 4, 5, 6])).toBe(0)
    })

    it('scores allEven when all dice are even', () => {
      expect(calculateScore('allEven', [2, 2, 4, 4, 6])).toBe(18)
      expect(calculateScore('allEven', [2, 4, 6, 6, 6])).toBe(24)
    })

    it('returns 0 for allEven when any die is odd', () => {
      expect(calculateScore('allEven', [1, 2, 4, 4, 6])).toBe(0)
    })

    it('scores sumAtLeast24 when sum is at least 24', () => {
      expect(calculateScore('sumAtLeast24', [6, 6, 6, 4, 2])).toBe(24)
      expect(calculateScore('sumAtLeast24', [6, 6, 6, 6, 6])).toBe(30)
    })

    it('returns 0 for sumAtLeast24 when sum is below 24', () => {
      expect(calculateScore('sumAtLeast24', [1, 2, 3, 4, 5])).toBe(0)
    })
  })
})

describe('calculateUpperBonus', () => {
  it('returns 35 when upper section sum >= 63', () => {
    const scoresheet: KniffelScoresheet = {
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
    }
    expect(calculateUpperBonus(scoresheet)).toBe(35)
  })

  it('returns 35 when sum equals exactly 63', () => {
    const scoresheet: KniffelScoresheet = {
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
    }
    expect(calculateUpperBonus(scoresheet)).toBe(35)
  })

  it('returns 0 when upper section sum < 63', () => {
    const scoresheet: KniffelScoresheet = {
      ones: 2,
      twos: 4,
      threes: 6,
      fours: 8,
      fives: 10,
      sixes: 12,
    }
    expect(calculateUpperBonus(scoresheet)).toBe(0)
  })

  it('returns 0 for empty scoresheet', () => {
    expect(calculateUpperBonus({})).toBe(0)
  })

  it('ignores lower section when calculating bonus', () => {
    const scoresheet: KniffelScoresheet = {
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
      kniffel: 50,
      chance: 30,
    }
    expect(calculateUpperBonus(scoresheet)).toBe(35)
  })
})

describe('getAvailableCategories', () => {
  it('returns all 13 categories for empty scoresheet', () => {
    const available = getAvailableCategories({})
    expect(available).toHaveLength(13)
    expect(available).toContain('ones')
    expect(available).toContain('kniffel')
    expect(available).toContain('chance')
  })

  it('excludes filled categories', () => {
    const scoresheet: KniffelScoresheet = {
      ones: 3,
      twos: 6,
    }
    const available = getAvailableCategories(scoresheet)
    expect(available).toHaveLength(11)
    expect(available).not.toContain('ones')
    expect(available).not.toContain('twos')
    expect(available).toContain('threes')
  })

  it('returns empty array when all categories filled', () => {
    const scoresheet: KniffelScoresheet = {
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
      threeOfKind: 20,
      fourOfKind: 22,
      fullHouse: 25,
      smallStraight: 30,
      largeStraight: 40,
      kniffel: 50,
      chance: 25,
    }
    expect(getAvailableCategories(scoresheet)).toHaveLength(0)
  })

  it('handles categories filled with 0 points', () => {
    const scoresheet: KniffelScoresheet = {
      ones: 0,
      kniffel: 0,
    }
    const available = getAvailableCategories(scoresheet)
    expect(available).toHaveLength(11)
    expect(available).not.toContain('ones')
    expect(available).not.toContain('kniffel')
  })
})

describe('getAvailableCategoriesWithRuleset', () => {
  const baseRuleset: KniffelRuleset = {
    preset: 'classic',
    allowScratch: true,
    strictStraights: false,
    fullHouseUsesSum: false,
    maxRolls: 3,
    categoryRandomizer: {
      enabled: true,
      disabledCategories: ['chance'],
      specialCategories: ['twoPairs'],
    },
    speedMode: {
      enabled: false,
      autoScore: false,
    },
  }

  it('excludes disabled categories and includes special categories', () => {
    const available = getAvailableCategoriesWithRuleset({}, baseRuleset)
    expect(available).not.toContain('chance')
    expect(available).toContain('twoPairs')
  })
})

describe('autoPickCategory', () => {
  it('picks category with highest score', () => {
    const dice: DiceValues = [5, 5, 5, 5, 5]
    const scoresheet: KniffelScoresheet = {}
    expect(autoPickCategory(dice, scoresheet)).toBe('kniffel')
  })

  it('picks from available categories only', () => {
    const dice: DiceValues = [5, 5, 5, 5, 5]
    const scoresheet: KniffelScoresheet = {
      kniffel: 50,
    }
    // Should pick fives (25) over fourOfKind (25) due to preference
    const result = autoPickCategory(dice, scoresheet)
    expect(['fives', 'fourOfKind', 'threeOfKind', 'chance']).toContain(result)
  })

  it('prefers lower section on ties', () => {
    const dice: DiceValues = [1, 2, 3, 4, 5]
    const scoresheet: KniffelScoresheet = {}
    // largeStraight (40) should win over other categories
    expect(autoPickCategory(dice, scoresheet)).toBe('largeStraight')
  })

  it('handles no good options gracefully', () => {
    const dice: DiceValues = [1, 2, 3, 4, 5]
    const scoresheet: KniffelScoresheet = {
      largeStraight: 40,
      smallStraight: 30,
      chance: 15,
    }
    // Should pick best remaining option
    const result = autoPickCategory(dice, scoresheet)
    expect(result).toBeDefined()
    expect(getAvailableCategories(scoresheet)).toContain(result)
  })

  it('picks lowest-penalty category when scratch disallowed and all available scores are zero', () => {
    const dice: DiceValues = [1, 1, 2, 3, 5]
    const ruleset: KniffelRuleset = {
      preset: 'classic',
      allowScratch: false,
      strictStraights: false,
      fullHouseUsesSum: false,
      maxRolls: 3,
      categoryRandomizer: {
        enabled: true,
        disabledCategories: [
          'ones', 'twos', 'threes', 'fours', 'fives', 'sixes', 'chance'
        ],
        specialCategories: [],
      },
      speedMode: {
        enabled: true,
        autoScore: true,
      },
    }

    const result = autoPickCategory(dice, {}, ruleset)
    expect(result).toBe('threeOfKind')
  })
})

describe('calculateTotalScore', () => {
  it('sums all filled categories', () => {
    const scoresheet: KniffelScoresheet = {
      ones: 3,
      twos: 6,
      chance: 20,
    }
    expect(calculateTotalScore(scoresheet)).toBe(29)
  })

  it('includes upper bonus when applicable', () => {
    const scoresheet: KniffelScoresheet = {
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
    }
    // Sum: 63, bonus: 35, total: 98
    expect(calculateTotalScore(scoresheet)).toBe(98)
  })

  it('returns 0 for empty scoresheet', () => {
    expect(calculateTotalScore({})).toBe(0)
  })

  it('handles full scoresheet', () => {
    const scoresheet: KniffelScoresheet = {
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
      threeOfKind: 20,
      fourOfKind: 22,
      fullHouse: 25,
      smallStraight: 30,
      largeStraight: 40,
      kniffel: 50,
      chance: 25,
    }
    // Upper: 63 + bonus 35 = 98, Lower: 212, Total: 310
    expect(calculateTotalScore(scoresheet)).toBe(310)
  })
})

describe('calculateScoreWithRuleset', () => {
  const baseRuleset: KniffelRuleset = {
    preset: 'classic',
    allowScratch: true,
    strictStraights: false,
    fullHouseUsesSum: false,
    maxRolls: 3,
    categoryRandomizer: {
      enabled: false,
      disabledCategories: [],
      specialCategories: [],
    },
    speedMode: {
      enabled: false,
      autoScore: false,
    },
  }

  it('uses sum for full house when fullHouseUsesSum is true', () => {
    const ruleset: KniffelRuleset = { ...baseRuleset, fullHouseUsesSum: true }
    const dice = [2, 2, 2, 3, 3] as const

    expect(calculateScoreWithRuleset('fullHouse', dice, ruleset)).toBe(12)
  })

  it('requires strict straight patterns when strictStraights is true', () => {
    const ruleset: KniffelRuleset = { ...baseRuleset, strictStraights: true }

    expect(calculateScoreWithRuleset('smallStraight', [1, 2, 3, 4, 5], ruleset)).toBe(30)
    expect(calculateScoreWithRuleset('smallStraight', [2, 3, 4, 5, 6], ruleset)).toBe(0)
    expect(calculateScoreWithRuleset('largeStraight', [2, 3, 4, 5, 6], ruleset)).toBe(40)
    expect(calculateScoreWithRuleset('largeStraight', [1, 2, 3, 4, 5], ruleset)).toBe(0)
  })
})
