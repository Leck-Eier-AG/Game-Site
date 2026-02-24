# Kniffel Variants Design (Phase-by-Phase)

Date: 2026-02-24

## Goals
- Implement Kniffel variants in a phased, low-regression manner.
- Keep a single state machine and scoring core, driven by a server-authoritative ruleset.
- Preserve classic behavior when preset is `classic`.

## Scope
This design covers Phase 2–5 of `docs/kniffel-variants-implementation-plan.md`:
- Phase 2: Triple Kniffel, Joker Tokens
- Phase 3: Draft Mode, Duels, Risk Roll
- Phase 4: Daily Challenge, Ladder, Scenario Constraints
- Phase 5: Roguelite meta-progression (relics, curses, bosses)

## Architecture Overview
- A normalized `KniffelRuleset` drives scoring, turn flow, optional systems, and category availability.
- A single state machine (`src/lib/game/state-machine.ts`) remains the only turn/flow engine.
- All presets resolve to a ruleset via `resolveKniffelRuleset(preset, overrides)`.
- Match/mode-specific state is stored in a `matchState` and `modifiersState` envelope, attached to the main `GameState`.

## Phase 2 Design

### Triple Kniffel
- Scoresheet model gains `columns: KniffelScoresheet[]` (3 columns default).
- Each column has a multiplier; defaults: x1/x2/x3, stored in ruleset.
- Players choose the target column at scoring time.
- Total score = sum of each column total * multiplier.
- Ruleset additions:
  - `columnCount: number` (default 3)
  - `columnMultipliers: number[]` (default [1,2,3])
  - `columnSelection: "choose"`

### Joker Tokens
- Player resources include `jokers` with configurable count.
- Action: `USE_JOKER` with dice adjustment `+1/-1` on a single die.
- Validation:
  - Only current player
  - Only during rolling phase
  - Only if `jokers > 0`
  - Enforce `jokerMaxPerTurn` (default 1)
- Ruleset additions:
  - `jokerCount: number`
  - `jokerMaxPerTurn: number`

## Phase 3 Design

### Draft Mode
- Introduce draft sub-phase:
  - `rolling_pool` -> `draft_claim` -> `scoring`
- First iteration: draft the entire roll (not die-by-die).
- Snake order utility for fairness.
- Match state stores draft order, pool history, and current claimant.

### Duels (Best-of-N)
- Match envelope tracks round index and round winners.
- Each round uses a subset of 5 categories.
- End condition: first to majority of rounds or fixed N completed.

### Risk Roll (4th roll)
- Optional `TAKE_RISK_ROLL` when `rollsRemaining=0`.
- If total dice sum < threshold, apply mandatory scratch debt.
- Threshold configurable by preset (ruleset).

## Phase 4 Design

### Daily Challenge
- Deterministic seed from UTC date -> seed.
- Server-only validation for seed and final score.
- Persist best score per user/day and track streak.

### Ladder
- Persist per-user ladder progress.
- Optional per-rung tightening of ruleset.

### Scenario Constraints
- Constraint pipeline applied in state-machine validation.
- Examples:
  - No chance category
  - Fill upper section first
  - Temporary reroll caps

## Phase 5 Design

### Roguelite Meta-Progression
- Add a lightweight effect engine with lifecycle hooks:
  - `onTurnStart`, `onBeforeRoll`, `onAfterRoll`, `onScore`, `onRoundEnd`
- Effects are data-first, deterministic, and serializable.
- Relics/perks are positive effects; curses are negative; bosses are timed objectives.
- Boss objectives: turn limit + success/failure outcome definitions.

## Testing Strategy
- Extend existing unit tests for new ruleset features.
- Add state-machine tests per mode to verify turn/phase integrity.
- Introduce deterministic RNG tests for daily seed and draft order.

## Rollout
- Implement phases sequentially, completing all acceptance criteria for each phase before moving to the next.
- Keep classic ruleset behavior unchanged.
