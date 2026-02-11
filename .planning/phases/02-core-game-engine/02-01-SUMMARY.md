---
phase: 02-core-game-engine
plan: 01
subsystem: game-foundation
tags: [prisma, types, rng, 3d-deps, i18n]
requires: [01-06]
provides: [GameRoom model, game types, crypto RNG, 3D dependencies]
affects: [02-02, 02-03, 02-04, 02-05]
tech-stack:
  added: [three, @react-three/fiber, @react-three/drei, @react-three/rapier]
  patterns: [JSON game state, TypeScript type definitions, cryptographic RNG]
key-files:
  created: [prisma/schema.prisma (GameRoom), src/types/game.ts, src/lib/game/crypto-rng.ts]
  modified: [package.json, src/messages/de.json]
key-decisions:
  - Store full game state as JSON in GameRoom.gameState field
  - Use node:crypto randomInt for server-side CSPRNG dice rolling
  - Comprehensive type definitions covering all Phase 2 needs
  - Install 3D deps early to unblock parallel plans
duration: 3 min
completed: 2026-02-11
---

# Phase 2 Plan 1: Foundation Setup Summary

JWT auth with refresh rotation using jose library - **One-liner:** GameRoom model with JSON state, comprehensive game types, cryptographic RNG, and 3D rendering dependencies installed

## Performance

- **Duration:** 3 minutes (179 seconds)
- **Started:** 2026-02-11T20:31:39Z
- **Completed:** 2026-02-11T20:34:38Z
- **Tasks:** 2/2 completed
- **Files:** 3 created, 5 modified

## Accomplishments

### Database Schema
- Added GameRoom model to Prisma schema with all required fields:
  - Basic info: id, name, hostId, gameType
  - Settings: isPrivate, maxPlayers, turnTimer, afkThreshold
  - State: status (waiting/playing/ended), gameState (JSON)
  - Timestamps: createdAt, updatedAt
- Added hostedRooms relation to User model
- Schema validates successfully

### Type System
Created comprehensive game type definitions in `src/types/game.ts`:
- **Dice types:** DiceValue (1-6), DiceValues (5-tuple), KeptDice
- **Game phases:** waiting, rolling, scoring, ended
- **Scoring:** ScoreCategory, KniffelScoresheet (13 categories)
- **Player state:** userId, displayName, scoresheet, ready, connected, activity tracking
- **Game state:** Full game state structure with 13-round tracking
- **Room types:** RoomSettings, RoomInfo for lobby display
- **Communication:** ChatMessage, Socket event payloads
- **Rematch:** RematchVote structure

All types designed to be shared between client and server code.

### Cryptographic RNG
Created `src/lib/game/crypto-rng.ts`:
- Uses node:crypto randomInt for CSPRNG (meets SPIEL-07 requirement)
- Server-only utility for dice rolling
- Exports rollDice(count) and rollFiveDice() functions
- Type-safe returns matching DiceValue and DiceValues types

### 3D Dependencies
Installed complete 3D rendering stack:
- `three` - Core 3D library
- `@types/three` - TypeScript definitions
- `@react-three/fiber` - React renderer for three.js
- `@react-three/drei` - Useful helpers and abstractions
- `@react-three/rapier` - Physics engine for 3D interactions

Dependencies installed early to unblock parallel Plan 02-02 (3D dice scene).

### Internationalization
Added comprehensive German translations to `src/messages/de.json`:
- **game:** Roll actions, turn status, game over, spectating (14 keys)
- **room:** Creation, joining, settings, status, controls (22 keys)
- **scoresheet:** All 13 Kniffel categories plus totals (17 keys)
- **chat:** Messages, system events, placeholder (9 keys)
- **rematch:** Voting and results (5 keys)

Total: 67 new translation keys with proper German umlauts (ä, ö, ü, ß).

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add GameRoom model and game types | c67a65a | prisma/schema.prisma, src/types/game.ts, src/lib/game/crypto-rng.ts |
| 2 | Install 3D deps and translations | 691f4d0 | package.json, package-lock.json, src/messages/de.json |

## Files Created/Modified

**Created:**
- `prisma/schema.prisma` - Added GameRoom model (18 lines)
- `src/types/game.ts` - Game type definitions (114 lines)
- `src/lib/game/crypto-rng.ts` - Cryptographic RNG utility (11 lines)

**Modified:**
- `prisma/schema.prisma` - Added hostedRooms relation to User
- `package.json` - Added 5 3D dependencies
- `package-lock.json` - Lockfile updated (57 packages added)
- `src/messages/de.json` - Added 67 German translation keys

## Decisions Made

### 1. JSON Game State Storage
**Decision:** Store full game state as JSON in GameRoom.gameState field rather than separate tables.

**Rationale:**
- Game state is transient (only exists during active games)
- Atomic updates easier with JSON than multiple related rows
- Simpler queries (single read/write vs joins)
- Flexible schema for future game types

**Impact:** All game state management will read/write JSON. Phase 2 plans will use GameState type from game.ts.

### 2. Cryptographic RNG on Server
**Decision:** Use node:crypto randomInt for dice rolling, server-side only.

**Rationale:**
- Meets SPIEL-07 requirement for CSPRNG
- Prevents client-side manipulation
- More secure than Math.random()
- Node crypto module is built-in, no dependencies

**Impact:** All dice rolls must happen server-side. Client only receives results via Socket.IO events.

### 3. Comprehensive Type System Upfront
**Decision:** Define all game types in plan 02-01 rather than incrementally.

**Rationale:**
- Parallel plans (02-02 through 02-05) can start immediately
- Type-driven development prevents interface mismatches
- Shared types ensure client/server consistency
- Early validation catches design issues

**Impact:** All subsequent Phase 2 plans import types from @/types/game. Changes to game logic may require type updates here.

### 4. Early 3D Dependency Installation
**Decision:** Install three.js and R3F in foundation plan rather than in 02-02.

**Rationale:**
- Unblocks parallel execution of 02-02 (dice scene)
- Large dependency download separate from implementation work
- Catches dependency conflicts early
- Build verification includes 3D imports

**Impact:** Plan 02-02 can start immediately. Build times increase slightly due to 3D deps.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

### TypeScript Error on Existing Test File
**Issue:** Test file `src/lib/game/__tests__/kniffel-rules.test.ts` references non-existent module `../kniffel-rules`.

**Impact:** TypeScript compilation shows error, but doesn't block build.

**Resolution:** Expected - test file exists from prior work, implementation will come in future plan (likely 02-03 or 02-04). Not a blocker for this plan's success criteria.

**Verification:** `npm run build` succeeds (build doesn't run tests). Types created in this plan compile successfully.

## Next Phase Readiness

### Immediate Blockers
None. All subsequent Phase 2 plans can proceed.

### Plan Dependencies Met
- ✅ Plan 02-02 (3D Dice Scene): Types and 3D deps available
- ✅ Plan 02-03 (Game Logic): GameState types and crypto-rng ready
- ✅ Plan 02-04 (Room System): RoomInfo, RoomSettings, GameRoom model ready
- ✅ Plan 02-05 (Socket Events): Event payload types defined

### Concerns for Phase 2
1. **Database migration needed:** GameRoom model added to schema but not pushed to database yet. User will need to run `npx prisma db push` or `npx prisma migrate dev` before using game features.

2. **Test file ahead of implementation:** kniffel-rules.test.ts exists but implementation doesn't. This is fine for TDD workflow, but should be tracked.

3. **JSON schema validation:** GameState stored as JSON but not validated. Consider adding runtime validation (Zod) in future plans.

### Recommendations
1. Document database migration step in Phase 2 USER-SETUP.md
2. Implement kniffel-rules.ts in next game logic plan
3. Consider adding JSON schema validation for gameState field
4. Create migration to add GameRoom table before deploying Phase 2

## Phase 2 Foundation Complete

All foundational elements in place:
- ✅ Database schema ready
- ✅ Type system complete
- ✅ RNG utility available
- ✅ 3D dependencies installed
- ✅ Translations ready

Phase 2 parallel execution can begin.
