import type { KniffelRuleset, PlayerState } from '@/types/game'
import { buildPlayerResults } from '../kniffel-results'
import { getCategoryScore } from '../kniffel-results'

describe('buildPlayerResults', () => {
  it('uses column multipliers and aggregates upper bonus', () => {
    const players: PlayerState[] = [
      {
        userId: 'u1',
        displayName: 'Alice',
        scoresheet: { columns: [{ ones: 63 }, {}, {}] },
        isReady: true,
        isConnected: true,
        lastActivity: 0,
        consecutiveInactive: 0,
      },
      {
        userId: 'u2',
        displayName: 'Bob',
        scoresheet: { columns: [{}, {}, { ones: 3 }] },
        isReady: true,
        isConnected: true,
        lastActivity: 0,
        consecutiveInactive: 0,
      },
    ]
    const ruleset: KniffelRuleset = {
      preset: 'triple',
      allowScratch: true,
      strictStraights: false,
      fullHouseUsesSum: false,
      maxRolls: 3,
      columnCount: 3,
      columnMultipliers: [1, 2, 3],
      columnSelection: 'choose',
      jokerCount: 0,
      jokerMaxPerTurn: 0,
      draftEnabled: false,
      duelEnabled: false,
      riskRollEnabled: false,
      riskRollThreshold: 24,
      dailyEnabled: false,
      ladderEnabled: false,
      constraintsEnabled: false,
      rogueliteEnabled: false,
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

    const results = buildPlayerResults(players, ruleset)

    expect(results[0].userId).toBe('u1')
    expect(results[0].total).toBe(98)
    expect(results[0].upperBonus).toBe(35)
    expect(results[1].total).toBe(9)
  })

  it('aggregates category scores across columns', () => {
    const scoresheet = { columns: [{ ones: 2 }, { ones: 3 }, {}] }

    expect(getCategoryScore(scoresheet, 'ones')).toBe(5)
    expect(getCategoryScore(scoresheet, 'twos')).toBe(0)
  })
})
