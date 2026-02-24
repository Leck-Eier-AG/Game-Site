# Kniffel Feature Expansion Implementation Plan

> Status note (2026-02-24): Core scaffolding is in place for Phase 2–5 (ruleset fields, triple columns, jokers, draft phase, duel match state, risk roll, daily seed, ladder/daily persistence models, constraints pipeline, effects skeleton, UI toggles, and server wiring). Full gameplay implementations per mode continue to build on this foundation.

## 1) Current Baseline (What exists today)

This codebase already has a solid classic Kniffel core:

- A typed game model (`GameState`, `RoomSettings`, `ScoreCategory`) in `src/types/game.ts`.
- Deterministic rules/scoring helpers (`calculateScore`, category availability, totals) in `src/lib/game/kniffel-rules.ts`.
- A pure state machine (`createInitialState`, `applyAction`, turn flow) in `src/lib/game/state-machine.ts`.
- Room creation UI already supports selecting Kniffel modes and game settings in `src/components/lobby/create-room-dialog.tsx`.

This plan builds on that structure without introducing one-off logic per mode.

---

## 2) Guiding Architecture Decision

Implement all requested variants through a **single Kniffel ruleset configuration** object and mode-specific wrappers:

- Add a normalized `KniffelRuleset` type (server-authoritative) that controls:
  - Score semantics (e.g., full house fixed vs sum, strict vs flexible straights).
  - Turn structure (3 rolls vs optional 4th roll + penalty).
  - Category availability/randomization.
  - Scratch policy (allow/disallow zero-rounds).
  - Optional systems (jokers, perks, curses, boss objectives).
- Keep one state machine and one scoring module; inject ruleset into validations/scoring/turn transitions.
- Build each user-facing “mode” as a predefined ruleset preset + optional progression layer.

This prevents mode-explosion and keeps testing cost bounded.

---

## 3) Delivery Roadmap (phased)

## Phase 0 — Foundation refactor (required before features)

### Scope
1. Add new types in `src/types/game.ts`:
   - `KniffelPreset` (`classic`, `triple`, `draft`, `duel`, `daily`, `ladder`, `roguelite`, etc.).
   - `KniffelRuleset` object (detailed toggles).
   - `MatchState` metadata for multi-round/duel contexts.
   - `ModifiersState` for jokers/perks/curses/bosses.
2. Extend room/game settings:
   - `RoomSettings.kniffelPreset?: KniffelPreset`
   - `RoomSettings.kniffelRuleset?: Partial<KniffelRuleset>` (for advanced custom lobbies).
3. Add a central preset builder in `src/lib/game`:
   - `resolveKniffelRuleset(preset, overrides)`.
4. Thread ruleset through state initialization and action handlers:
   - `createInitialState(..., settings)` attaches resolved ruleset to `GameState`.

### Acceptance criteria
- Classic gameplay remains behaviorally identical when preset=`classic`.
- No UI regressions for existing room creation.

---

## Phase 1 — “Implementation-friendly toggles” + scoring variants (highest ROI)

### Features
1. **Full House = sum of dice** (toggle).
2. **Strict straights** (`small=12345`, `large=23456`) (toggle).
3. **With/without zero-rounds** (`allowScratch=false` blocks 0-scoring selection).
4. **Category randomizer** (disable N categories and add rotating specials).
5. **Speed mode** (hard timer + deterministic auto-score fallback).

### Implementation notes
- `calculateScore(category, dice, ruleset)` signature migration.
- Add special category registry:
  - e.g., `twoPairs`, `allEven`, `sumAtLeast24`.
- Introduce deterministic fallback scorer for timer expiry:
  - Prefer highest legal score.
  - If no legal non-zero and scratch disallowed, pick lowest-penalty legal category by policy.

### Acceptance criteria
- All toggles independently testable.
- Existing tests updated + new matrix tests for strict/flexible rules.

---

## Phase 2 — Classic-plus variants

### A) Triple Kniffel

#### Design
- Per-player scoresheet contains 3 columns for the same categories.
- Column multipliers configurable (default example: x1/x2/x3).
- Turn assignment policy:
  - Option 1: player chooses target column before scoring.
  - Option 2: round-driven column progression.

#### Technical tasks
- Extend scoresheet model:
  - `columns: Array<KniffelScoresheet>`.
- Update total calculation to aggregate weighted column totals.
- Expand UI score table for multi-column rendering.

### B) Joker tokens

#### Design
- Each player starts with configurable `jokerCount` (2–3 default).
- Joker action types:
  - `SET_DIE_VALUE` (bounded to one die per joker use), or
  - `ADJUST_DIE_BY_ONE` (safer/balanced first implementation).

#### Technical tasks
- Add `USE_JOKER` action with strict validation (turn owner, timing, remaining jokers).
- Add per-turn usage cap to avoid multi-joker abuse unless configured.

### Acceptance criteria
- Triple totals and winner calculation correct for all columns.
- Joker events are auditable and replay-safe.

---

## Phase 3 — Competitive match formats

### A) Draft mode
- Create draft sub-phase in state machine:
  - `rolling_pool` -> `draft_claim` -> `scoring`.
- Snake order utility for fairness.
- Start with “claim full roll” before considering die-by-die drafting.

### B) Duels (best-of-N mini-rounds)
- Introduce match envelope:
  - each mini-game uses a category subset of 5.
  - winner gets round point.
- End condition: first to majority of rounds or fixed N completed.

### C) Push-your-luck 4th roll
- Add optional action `TAKE_RISK_ROLL` when `rollsRemaining=0`.
- On selecting risk roll, set mandatory scratch debt unless threshold is met.
- Threshold policy configurable by preset (e.g., total dice sum >= 24).

### Acceptance criteria
- Match formats run without breaking classic turn order.
- Rematch and end-game payloads include round-level results.

---

## Phase 4 — Solo/puzzle content systems

### A) Daily Challenge
- Daily seed generator (`UTC date -> seed`).
- Seeded RNG wiring for deterministic rolls across all participants.
- Persist one score per user/day + streak tracking + leaderboard query.

### B) Target-score ladder
- Ladder profile table:
  - current rung, retries left, best score per rung.
- Ruleset may tighten by rung (optional).

### C) Scenario constraints
- Implement composable “constraint rules” pipeline:
  - no chance category,
  - fill upper section first,
  - temporary reroll caps.

### Acceptance criteria
- Daily run reproducible from seed in tests.
- Ladder/scenario constraints enforced server-side only.

---

## Phase 5 — Roguelite meta-progression

### A) Relics/perks
- Reward hook after turn/round with weighted 1-of-3 choices.
- Effects represented as declarative modifiers applied by hooks.

### B) Curses
- Negative modifiers using same hook system (pre-roll, post-score).

### C) Boss fights
- Timed objective contract:
  - objective type, turns left, success/failure outcomes.

### Technical approach
- Add lightweight effect engine with lifecycle hooks:
  - `onTurnStart`, `onBeforeRoll`, `onAfterRoll`, `onScore`, `onRoundEnd`.
- Effects are data-first and serializable for multiplayer sync.

### Acceptance criteria
- Effects deterministic and conflict-resolved by hook priority.
- Clear client UX for active effects and remaining durations.

---

## 4) Data model and persistence changes

## Core schema additions
- Game state JSON:
  - `ruleset`, `activeCategories`, `disabledCategories`, `specialCategories`.
  - `playerResources` (jokers, relics, curses).
  - `matchState` for duels/draft progression.
  - `dailySeed` / `scenarioId` metadata.
- New persisted entities (Prisma):
  - `DailyChallengeScore`.
  - `KniffelLadderProgress`.
  - Optional `KniffelMatchHistory` for analytics/replays.

## Migration strategy
- Backward-compatible read path:
  - if old state lacks `ruleset`, infer `classic` defaults.
- Version tag in game state (`rulesVersion`) for future migrations.

---

## 5) API and socket event extensions

Add versioned events rather than mutating old contracts silently:

- `game:use-joker`
- `game:take-risk-roll`
- `game:choose-perk`
- `game:draft-claim`
- `daily:submit` / `daily:leaderboard`

For each new event, enforce:
- idempotency keys,
- server timestamping,
- explicit error codes (not just strings) for client UX.

---

## 6) UI/UX implementation plan

## Lobby / room creation
- Add `Kniffel Preset` selector with quick descriptions.
- Advanced accordion for toggles:
  - strict straights,
  - full house sum,
  - scratches on/off,
  - speed timer,
  - category randomizer.

## In-game HUD
- Resource chips for jokers/perks/curses.
- Draft queue / snake order indicator.
- Duel round scoreboard and progress meter.
- Boss objective banner with countdown.

## Score sheet
- Dynamic category renderer driven by active category config.
- Triple-column table variant with column multipliers.

---

## 7) Testing strategy (must scale with mode count)

1. **Unit tests (rules):**
   - Score invariants by ruleset matrix.
   - Straight/full-house variant behavior.
2. **State machine tests:**
   - Action legality by phase/mode.
   - Draft order, risk roll penalties, scratch policies.
3. **Property tests (optional but recommended):**
   - Determinism from seed.
   - No illegal state transitions.
4. **Integration tests:**
   - Full game flows for each preset family.
5. **Snapshot/replay tests:**
   - Event log replay yields exact same final state.

Add test fixtures for every preset to avoid ad-hoc setup duplication.

---

## 8) Rollout and risk management

## Feature-flag rollout
- Ship in this order:
  1) toggles/scoring variants,
  2) triple + jokers,
  3) duel/push-your-luck,
  4) draft,
  5) daily/ladder,
  6) roguelite.
- Keep non-classic presets disabled by default in production until telemetry is healthy.

## Telemetry to track
- mode adoption rate,
- average game duration,
- disconnect/timeout frequency,
- per-mode completion rate,
- score distribution drift after rule changes.

## Key risks
- Complexity explosion in state machine -> mitigated by ruleset + hooks architecture.
- UI overload -> mitigated by presets-first, advanced options hidden by default.
- Balance issues -> mitigated by server-configurable values + live tuning.

---

## 9) Suggested milestone breakdown (engineering-ready)

- **Milestone A (1 sprint):** Phase 0 + Phase 1.
- **Milestone B (1 sprint):** Triple Kniffel + Jokers.
- **Milestone C (1 sprint):** Duels + Push-your-luck.
- **Milestone D (1 sprint):** Draft mode.
- **Milestone E (1–2 sprints):** Daily + Ladder + Scenarios.
- **Milestone F (2 sprints):** Roguelite system (perks/curses/boss).

If capacity is tight, stop after Milestone C: this already delivers strong mode variety with moderate complexity.
