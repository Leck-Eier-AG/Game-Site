import type { KniffelPreset, KniffelRuleset } from '@/types/game'

export interface KniffelRulesetOverridesInput {
  allowScratch: boolean
  strictStraights: boolean
  fullHouseUsesSum: boolean
  maxRolls: number
  speedModeEnabled: boolean
  categoryRandomizerEnabled: boolean
  disabledCategories: KniffelRuleset['categoryRandomizer']['disabledCategories']
  specialCategories: KniffelRuleset['categoryRandomizer']['specialCategories']
  draftEnabled?: boolean
  duelEnabled?: boolean
}

const CLASSIC_RULESET: KniffelRuleset = {
  preset: 'classic',
  allowScratch: true,
  strictStraights: false,
  fullHouseUsesSum: false,
  maxRolls: 3,
  columnCount: 1,
  columnMultipliers: [1],
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
    specialCategories: []
  },
  speedMode: {
    enabled: false,
    autoScore: false
  }
}

const PRESET_RULESETS: Record<KniffelPreset, KniffelRuleset> = {
  classic: CLASSIC_RULESET,
  triple: {
    ...CLASSIC_RULESET,
    preset: 'triple',
    columnCount: 3,
    columnMultipliers: [1, 2, 3]
  },
  draft: { ...CLASSIC_RULESET, preset: 'draft' },
  duel: { ...CLASSIC_RULESET, preset: 'duel' },
  daily: { ...CLASSIC_RULESET, preset: 'daily' },
  ladder: { ...CLASSIC_RULESET, preset: 'ladder' },
  roguelite: { ...CLASSIC_RULESET, preset: 'roguelite' }
}

function mergeRuleset(base: KniffelRuleset, overrides?: Partial<KniffelRuleset>): KniffelRuleset {
  if (!overrides) return base

  return {
    ...base,
    ...overrides,
    categoryRandomizer: {
      ...base.categoryRandomizer,
      ...(overrides.categoryRandomizer || {})
    },
    speedMode: {
      ...base.speedMode,
      ...(overrides.speedMode || {})
    }
  }
}

export function resolveKniffelRuleset(
  preset: KniffelPreset = 'classic',
  overrides?: Partial<KniffelRuleset>
): KniffelRuleset {
  const base = PRESET_RULESETS[preset] || CLASSIC_RULESET
  return mergeRuleset(base, overrides)
}

export function buildKniffelRulesetOverrides(
  input: KniffelRulesetOverridesInput
): Partial<KniffelRuleset> {
  return {
    allowScratch: input.allowScratch,
    strictStraights: input.strictStraights,
    fullHouseUsesSum: input.fullHouseUsesSum,
    maxRolls: input.maxRolls,
    draftEnabled: input.draftEnabled ?? false,
    duelEnabled: input.duelEnabled ?? false,
    speedMode: {
      enabled: input.speedModeEnabled,
      autoScore: input.speedModeEnabled,
    },
    categoryRandomizer: {
      enabled: input.categoryRandomizerEnabled,
      disabledCategories: input.disabledCategories,
      specialCategories: input.specialCategories,
    },
  }
}
