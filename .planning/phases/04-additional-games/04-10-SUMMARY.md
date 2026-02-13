---
phase: 04-additional-games
plan: 10
subsystem: ui
tags: [poker, texas-holdem, react, socket.io, ui-components, casino]

# Dependency graph
requires:
  - phase: 04-01
    provides: Casino UI primitives (Card, FeltTable, ChipStack)
  - phase: 04-05
    provides: Poker state machine with PokerGameState, PokerPlayer types
  - phase: 04-09
    provides: Game room page with gameType routing pattern

provides:
  - Oval poker table UI with 9 seat positions
  - Player seat components with cards, chips, status indicators
  - Community cards with dealing animations
  - Pot display with main pot and side pot support
  - Betting controls with raise slider and quick bet buttons
  - Rebuy dialog for chip replenishment between hands
  - Full poker game integration into room routing

affects: [04-11]

# Tech tracking
tech-stack:
  added: ['@radix-ui/react-slider (via shadcn/ui)']
  patterns:
    - Seat rotation: Current user always at position 0 (bottom center)
    - Absolute positioning for oval table layout
    - Phase-based card visibility (preflop→flop→turn→river→showdown)
    - Dealer/SB/BB position calculation with heads-up special case

key-files:
  created:
    - src/components/poker/PokerTable.tsx
    - src/components/poker/PlayerSeat.tsx
    - src/components/poker/CommunityCards.tsx
    - src/components/poker/PotDisplay.tsx
    - src/components/poker/BettingControls.tsx
    - src/components/ui/slider.tsx
  modified:
    - src/app/game/[roomId]/page.tsx

key-decisions:
  - "Seat rotation pattern: Current user always at position 0 for consistent UX"
  - "Absolute positioning with SEAT_POSITIONS map for oval table layout"
  - "Timer countdown starts at 30s per action, visual progress bar with color coding"
  - "Rebuy dialog shown between hands when chips exhausted, spectator mode if declined"
  - "Quick bet buttons calculated from pot size (1/2, 3/4, full pot)"

patterns-established:
  - "Poker seat rotation: Map physical seat indices to visual positions with current user always at bottom"
  - "Dealer/SB/BB badge overlay on avatar with absolute positioning"
  - "Phase labels in German for all poker betting rounds"
  - "Community card reveal tied to phase with placeholder borders for unrevealed cards"

# Metrics
duration: 5.8min
completed: 2026-02-13
---

# Phase 04 Plan 10: Poker UI Summary

**Oval poker table with 9 rotated seats, community cards with staggered animations, betting controls with raise slider, and rebuy dialog**

## Performance

- **Duration:** 5.8 min (350 seconds)
- **Started:** 2026-02-13T19:24:20Z
- **Completed:** 2026-02-13T19:30:10Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Complete poker UI with signature oval table layout and 9 fixed seat positions
- Seat rotation algorithm ensures current player always at bottom center
- Betting controls with German labels, raise slider, and quick pot-based bets
- Rebuy dialog for chip replenishment with spectator mode fallback
- Full integration into game room routing with poker-specific socket events

## Task Commits

Each task was committed atomically:

1. **Task 1: Build Poker table layout and player seats** - `f18b78b` (feat)
2. **Task 2: Build betting controls and wire into game room page** - `d6ab361` (feat)

## Files Created/Modified

### Created
- `src/components/poker/PokerTable.tsx` - Main poker table with oval layout, 9 seats, center area for community cards and pot
- `src/components/poker/PlayerSeat.tsx` - Player seat with avatar, hole cards (face-down/up), chip count, status indicators, dealer/SB/BB badges
- `src/components/poker/CommunityCards.tsx` - 5-card community area with staggered slide-in animations based on phase
- `src/components/poker/PotDisplay.tsx` - Main pot and side pot display with ChipStack components
- `src/components/poker/BettingControls.tsx` - Action buttons (Passen, Schieben, Mitgehen, Erhöhen, All-In), raise slider with min/max, quick bet buttons
- `src/components/ui/slider.tsx` - Shadcn/ui slider component for raise amount control

### Modified
- `src/app/game/[roomId]/page.tsx` - Added PokerTable routing, poker socket events (rebuy-available, hand-end), rebuy dialog

## Decisions Made

1. **Seat rotation pattern**: Current user always rendered at position 0 (bottom center) by slicing and rotating the players array. Physical dealer/SB/BB indices recalculated relative to rotated view. Provides consistent UX regardless of join order.

2. **Absolute positioning for seats**: SEAT_POSITIONS map defines 9 positions clockwise around oval using CSS absolute positioning. Seats 0-8 arranged: bottom-center, bottom-left, middle-left, top-left, top-center, top-right, middle-right, bottom-right, bottom-right-center.

3. **Timer countdown client-side**: 30-second countdown starts when player becomes active, visual progress bar with color coding (green>10s, yellow>5s, red≤5s). Server enforces timeout, client provides UX.

4. **Rebuy dialog between hands**: When player chips reach 0, server emits poker:rebuy-available with amount. Modal dialog offers rebuy or spectator mode. Clears on poker:hand-end event.

5. **Quick bet buttons**: Calculated from pot size: Min (minRaise), 1/2 Pot, 3/4 Pot, Pot, All-In. Filtered to valid range (≥minRaise, ≤maxRaise).

6. **Phase-based card visibility**: Community cards shown based on phase: 0 preflop, 3 flop, 4 turn, 5 river/showdown. Placeholders with dashed borders for unrevealed cards.

7. **Heads-up blind positioning**: Special case when playerCount === 2, dealer posts small blind (not left of dealer). Matches standard poker tournament rules.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing shadcn/ui slider component**
- **Found during:** Task 1 (BettingControls implementation)
- **Issue:** BettingControls imports `@/components/ui/slider` but component didn't exist
- **Fix:** Ran `npx shadcn@latest add slider --yes` to install Radix UI slider primitive
- **Files modified:** src/components/ui/slider.tsx (created), package.json, package-lock.json
- **Verification:** Import succeeds, build passes
- **Committed in:** f18b78b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Slider component required for raise amount control. Standard shadcn/ui installation, no scope creep.

## Issues Encountered

None - plan executed smoothly with clear component hierarchy.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Poker UI complete and ready for server-side integration testing
- All 4 casino games (Blackjack, Roulette, Poker) now have complete UI implementations
- Plan 04-11 can proceed with final integration testing across all game types
- Potential enhancements for future: Hand strength indicator during play, action history panel, multi-table tournament UI

---
*Phase: 04-additional-games*
*Completed: 2026-02-13*
