import type { KniffelRuleset, KniffelScoresheet, PlayerState, ScoreCategory } from '@/types/game'
import { calculateTotalScoreWithRuleset, calculateUpperBonus } from './kniffel-rules'
import { resolveKniffelRuleset } from './kniffel-ruleset'

function calculateUpperBonusForScoresheet(scoresheet: KniffelScoresheet | { columns: KniffelScoresheet[] }) {
  if ('columns' in scoresheet) {
    return scoresheet.columns.reduce((sum, column) => sum + calculateUpperBonus(column), 0)
  }
  return calculateUpperBonus(scoresheet)
}

export function getCategoryScore(
  scoresheet: KniffelScoresheet | { columns: KniffelScoresheet[] },
  category: ScoreCategory
) {
  if ('columns' in scoresheet) {
    return scoresheet.columns.reduce((sum, column) => sum + (column[category] ?? 0), 0)
  }
  return scoresheet[category] ?? 0
}

export function buildPlayerResults(players: PlayerState[], ruleset?: KniffelRuleset) {
  const effectiveRuleset = ruleset ?? resolveKniffelRuleset('classic')

  return players
    .map((player) => ({
      ...player,
      total: calculateTotalScoreWithRuleset(player.scoresheet, effectiveRuleset),
      upperBonus: calculateUpperBonusForScoresheet(player.scoresheet)
    }))
    .sort((a, b) => b.total - a.total)
}
