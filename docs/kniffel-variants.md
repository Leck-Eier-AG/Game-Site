# Kniffel Variants

## Triple Kniffel
- Three scoring columns per player.
- Column multipliers (default: x1/x2/x3).
- Players choose the target column when scoring.

## Jokers
- Joker adjusts one die by +1 or -1 (bounded 1–6).
- Per-turn usage cap configurable.

## Draft Mode
- Draft sub-phase after a roll (`draft_claim`).
- Roll pool -> draft claim -> scoring flow.

## Duel Mode
- Best-of-N rounds with a limited category pool.
- Match state tracks round winners.

## Risk Roll
- Optional risk roll after rolls are exhausted.
- If the roll sum is below the threshold, a scratch debt is applied.

## Daily Challenge
- Deterministic daily seed from UTC date.
- One best score per user/day.

## Ladder
- Per-user rung progression and best score tracking.

## Scenario Constraints
- Constraints pipeline (e.g., no chance category).

## Roguelite
- Effect engine with lifecycle hooks.
- Perks, curses, and boss objectives are data-driven effects.
