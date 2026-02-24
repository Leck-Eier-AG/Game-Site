import { describe, it, expect } from '@jest/globals'
import { buildKniffelRulesetOverrides, resolveKniffelRuleset } from '../kniffel-ruleset'

describe('buildKniffelRulesetOverrides', () => {
  it('builds nested overrides for ruleset toggles', () => {
    const overrides = buildKniffelRulesetOverrides({
      allowScratch: false,
      strictStraights: true,
      fullHouseUsesSum: true,
      maxRolls: 4,
      speedModeEnabled: true,
      categoryRandomizerEnabled: true,
      disabledCategories: ['chance', 'ones'],
      specialCategories: ['twoPairs', 'allEven'],
    })

    expect(overrides).toEqual({
      allowScratch: false,
      strictStraights: true,
      fullHouseUsesSum: true,
      maxRolls: 4,
      draftEnabled: false,
      duelEnabled: false,
      speedMode: {
        enabled: true,
        autoScore: true,
      },
      categoryRandomizer: {
        enabled: true,
        disabledCategories: ['chance', 'ones'],
        specialCategories: ['twoPairs', 'allEven'],
      },
    })
  })
})

describe('resolveKniffelRuleset', () => {
  it('sets defaults for phase2-5 toggles', () => {
    const rules = resolveKniffelRuleset('classic', {})

    expect(rules.columnCount).toBe(1)
    expect(rules.jokerCount).toBe(0)
    expect(rules.jokerMaxPerTurn).toBe(0)
    expect(rules.draftEnabled).toBe(false)
    expect(rules.duelEnabled).toBe(false)
    expect(rules.riskRollEnabled).toBe(false)
    expect(rules.dailyEnabled).toBe(false)
    expect(rules.ladderEnabled).toBe(false)
    expect(rules.constraintsEnabled).toBe(false)
    expect(rules.rogueliteEnabled).toBe(false)
  })
})
