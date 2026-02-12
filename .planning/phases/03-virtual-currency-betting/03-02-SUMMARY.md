---
phase: 03-virtual-currency-betting
plan: 02
subsystem: wallet
tags: [tdd, pure-functions, financial-logic, state-machine]
dependencies:
  requires: []
  provides: [payout-calculator, escrow-state-machine]
  affects: [game-lifecycle-handlers]
tech-stack:
  added: []
  patterns: [pure-functions, integer-arithmetic, state-machine-transition-table]
key-files:
  created:
    - src/lib/wallet/payout.ts
    - src/lib/wallet/escrow.ts
    - src/lib/wallet/__tests__/payout.test.ts
    - src/lib/wallet/__tests__/escrow.test.ts
  modified: []
decisions:
  - Pure payout calculator using integer arithmetic to avoid floating point precision issues
  - Odd remainder distribution to first tied player ensures total equals pot
  - Sole finisher gets entire pot regardless of configured ratios (edge case handling)
  - Transition table pattern for escrow state machine provides clear validation logic
  - Terminal states (RELEASED, FORFEITED) cannot transition to any other state
  - PENDING cannot transition to FORFEITED (must be refunded instead)
metrics:
  tasks_completed: 2
  duration_minutes: 0
  completed_at: "2026-02-12"
---

# Phase 03 Plan 02: Payout Calculator & Escrow State Machine Summary

**One-liner:** Pure payout calculator with tie splitting and escrow state machine using transition table pattern

## What Was Built

### 1. Payout Calculator (`src/lib/wallet/payout.ts`)

Pure functions for calculating prize distribution from pot using configurable payout ratios.

**Key Features:**
- `calculatePayouts()`: Distributes pot based on rankings and payout ratios
- `validatePayoutRatios()`: Validates ratios sum to 100% and positions are sequential
- Integer arithmetic throughout (Math.floor) to avoid floating point issues
- Tie handling: Split position prize evenly among tied players
- Odd remainder handling: Extra chips go to first player in tie
- Edge case: Sole finisher gets entire pot regardless of ratios

**Types Exported:**
- `FinalRanking`: `{ position: number, userIds: string[] }`
- `PayoutRatio`: `{ position: number, percentage: number }`

**Test Coverage:** 15 tests covering:
- Standard distributions (3-player, 2-player with unclaimed prize)
- Tie handling (2-way tie for 1st, 3-way tie for 1st, 2-way tie for 2nd)
- Odd remainder distribution
- Edge cases (sole finisher, empty rankings, zero pot)
- Invariants (total <= pot, non-negative integers)

### 2. Escrow State Machine (`src/lib/wallet/escrow.ts`)

Enforces valid escrow state transitions for game betting using transition table pattern.

**States:**
- `PENDING`: Bet placed, game not started
- `LOCKED`: Game in progress
- `RELEASED`: Payout distributed (terminal)
- `FORFEITED`: Player left/kicked (terminal)

**Valid Transitions:**
- `PENDING -> LOCKED`: Game starts
- `PENDING -> RELEASED`: Player leaves before game starts (refund)
- `LOCKED -> RELEASED`: Game ends, payout distributed
- `LOCKED -> FORFEITED`: Player leaves mid-game or AFK kicked

**Invalid Transitions:**
- `RELEASED -> *`: Terminal state
- `FORFEITED -> *`: Terminal state
- `PENDING -> FORFEITED`: Cannot forfeit before game starts
- `LOCKED -> PENDING`: Cannot revert to pending

**Functions Exported:**
- `canTransition(from, to)`: Boolean validation
- `getValidTransitions(from)`: Array of valid next states
- `EscrowTransition` type: `{ from, to, reason }`

**Test Coverage:** 14 tests covering all valid and invalid transitions for each state.

## TDD Workflow

Followed strict RED-GREEN pattern as specified in plan:

1. **RED (Test):** Create failing tests for payout calculator (f5b36bf)
   - 195 lines of comprehensive test cases
   - All tests initially failing

2. **GREEN (Implementation):** Implement payout calculator to pass tests (07df50e)
   - 93 lines of pure functions using integer arithmetic
   - All 15 tests passing

3. **RED (Test):** Create failing tests for escrow state machine (1c3b76b)
   - 85 lines covering all state transition paths
   - All tests initially failing

4. **GREEN (Implementation):** Implement escrow state machine (8dd36a3)
   - 41 lines with transition table pattern
   - All 14 tests passing

**Total:** 29 tests, 414 lines of test code, 134 lines of implementation code

## Verification Results

```bash
npm test -- --testPathPatterns="wallet"
```

**Result:** All tests pass
- Test Suites: 2 passed, 2 total
- Tests: 29 passed, 29 total
- Time: 0.2s

## Deviations from Plan

None - plan executed exactly as written. TDD workflow followed precisely with RED-GREEN commits for each feature.

## Key Technical Details

### Payout Calculator Edge Cases

1. **Tie Splitting:** Position prize divided evenly among tied players
   - Example: 60% of 1000 = 600, split 2 ways = 300 each
   - 2nd place skipped when two players tie for 1st

2. **Odd Remainder:** Extra chips distributed to first player in tie
   - Example: 598 / 3 = 199 each + 1 remainder → [200, 199, 199]

3. **Sole Finisher:** Gets entire pot regardless of ratios
   - Prevents unfair outcome when all others forfeit

4. **Integer Arithmetic:** Math.floor used throughout
   - Prevents floating point precision issues
   - Ensures total payout never exceeds pot

### Escrow State Machine Design

1. **Transition Table:** Const object mapping states to allowed next states
   - Simple lookup provides O(1) validation
   - Clear visual structure for all transitions

2. **Terminal States:** RELEASED and FORFEITED cannot transition further
   - Prevents invalid state changes after completion

3. **Invalid PENDING->FORFEITED:** Players leaving before game starts get refund (RELEASED)
   - Only LOCKED players can forfeit

## Integration Points

### Payout Calculator
- **Called by:** Game end handler
- **Input:** Total pot, final rankings, payout ratios
- **Output:** Map<userId, payoutAmount>
- **Usage pattern:** `calculatePayouts(room.pot, rankings, DEFAULT_RATIOS)`

### Escrow State Machine
- **Called by:** Room lifecycle handlers (start, end, leave, kick)
- **Input:** Current escrow status, desired next status
- **Output:** Boolean validation
- **Usage pattern:** `if (canTransition(escrow.status, 'LOCKED')) { ... }`

## Next Steps

These pure functions are ready for integration into:
1. Game lifecycle handlers (Phase 03, Plan 03)
2. Wallet transaction system (Phase 03, Plan 04)
3. Room bet validation (Phase 03, Plan 05)

## Success Criteria Met

- [x] All payout calculation tests pass including tie splitting and remainder handling
- [x] Total payout always equals total pot (or less with unclaimed positions)
- [x] Escrow state machine rejects all invalid transitions
- [x] Test coverage includes edge cases (sole finisher, empty rankings, zero pot)
- [x] TDD workflow followed with RED-GREEN commits
- [x] No tests skipped or pending

## Self-Check: PASSED

**Created files exist:**
```bash
[ -f "src/lib/wallet/payout.ts" ] && echo "FOUND: src/lib/wallet/payout.ts"
[ -f "src/lib/wallet/escrow.ts" ] && echo "FOUND: src/lib/wallet/escrow.ts"
[ -f "src/lib/wallet/__tests__/payout.test.ts" ] && echo "FOUND: src/lib/wallet/__tests__/payout.test.ts"
[ -f "src/lib/wallet/__tests__/escrow.test.ts" ] && echo "FOUND: src/lib/wallet/__tests__/escrow.test.ts"
```

**Commits exist:**
```bash
git log --oneline --all | grep -q "f5b36bf" && echo "FOUND: f5b36bf (payout tests)"
git log --oneline --all | grep -q "07df50e" && echo "FOUND: 07df50e (payout implementation)"
git log --oneline --all | grep -q "1c3b76b" && echo "FOUND: 1c3b76b (escrow tests)"
git log --oneline --all | grep -q "8dd36a3" && echo "FOUND: 8dd36a3 (escrow implementation)"
```

All files created and all commits verified.
