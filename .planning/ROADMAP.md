# Roadmap: Kniff - Deutsche Spieleseite

## Overview

This roadmap delivers a real-time multiplayer gaming platform for classic German games in five phases. We build foundation infrastructure first (auth, WebSocket, database), validate architecture with Kniffel as MVP, add virtual currency and betting, expand with three additional games (Poker, Blackjack, Roulette), and finish with polish and community features. Each phase delivers a coherent, verifiable capability that enables the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Infrastructure** - Invite-based auth, WebSocket infrastructure, database layer
- [ ] **Phase 2: Core Game Engine (Kniffel MVP)** - First playable game validates architecture
- [ ] **Phase 3: Virtual Currency & Betting** - Economic layer with ACID transactions
- [ ] **Phase 4: Additional Games** - Poker, Blackjack, Roulette complete game suite
- [ ] **Phase 5: Polish & Community** - Themes, statistics, enhanced lobby, moderation

## Phase Details

### Phase 1: Foundation & Infrastructure
**Goal**: Secure invite-based authentication and real-time infrastructure work correctly
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, ECHT-01, ECHT-02, UI-01, UI-02
**Success Criteria** (what must be TRUE):
  1. First visitor can create admin account and access admin dashboard
  2. Admin can invite users via email with cryptographically secure tokens
  3. Invited user can register via link and log in with credentials
  4. User session persists across browser refresh and reconnects after network interruption
  5. Admin can ban and unban users
  6. All UI labels and messages display in German
  7. Interface is responsive and usable on mobile devices
**Plans**: 6 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffolding, database schema, and core auth library (Complete: 2026-02-11)
- [x] 01-02-PLAN.md — Auth pages (admin setup, login, invite registration) (Complete: 2026-02-11)
- [x] 01-03-PLAN.md — App shell with sidebar and WebSocket infrastructure (Complete: 2026-02-11)
- [x] 01-04-PLAN.md — Admin dashboard with invite management and ban/unban (Complete: 2026-02-11)
- [x] 01-05-PLAN.md — Full flow verification checkpoint (Complete: 2026-02-11)
- [x] 01-06-PLAN.md — UAT gap closure: root page shadow fix and invite dialog fix (Complete: 2026-02-11)

### Phase 2: Core Game Engine (Kniffel MVP)
**Goal**: Players can play Kniffel in real-time at shared tables
**Depends on**: Phase 1
**Requirements**: RAUM-01, RAUM-02, RAUM-03, RAUM-04, RAUM-05, SPIEL-01, SPIEL-07, SPIEL-08, ECHT-03
**Success Criteria** (what must be TRUE):
  1. User can create game room specifying Kniffel as game type
  2. Other users can see and join open Kniffel rooms from lobby
  3. Players at table can take turns rolling dice and filling scoresheet
  4. All players see identical game state in real-time as each player takes their turn
  5. Game enforces turn timers and auto-plays if player goes inactive
  6. Players can send text messages to others at their table
  7. Inactive players are automatically removed from room after timeout
  8. Empty rooms are cleaned up automatically
**Plans**: 11 plans

Plans:
- [x] 02-01-PLAN.md — Database schema, game types, 3D dependencies, German translations (Complete: 2026-02-11)
- [x] 02-02-PLAN.md — Kniffel scoring algorithm (TDD) (Complete: 2026-02-11)
- [x] 02-03-PLAN.md — Game state machine (TDD) (Complete: 2026-02-11)
- [x] 02-04-PLAN.md — Room lifecycle server handlers (Socket.IO) (Complete: 2026-02-11)
- [x] 02-05-PLAN.md — 3D dice scene (React Three Fiber + Rapier physics) (Complete: 2026-02-11)
- [x] 02-06-PLAN.md — Lobby UI with room browsing and creation (Complete: 2026-02-11)
- [x] 02-07-PLAN.md — Game room page with scoresheet and turn timer (Complete: 2026-02-11)
- [x] 02-08-PLAN.md — Table chat and spectator mode (Complete: 2026-02-11)
- [ ] 02-09-PLAN.md — Core game loop: server handlers using state machine and scoring imports
- [ ] 02-10-PLAN.md — Turn timers, auto-play, AFK detection, rematch voting, results UI
- [ ] 02-11-PLAN.md — Full game verification checkpoint

### Phase 3: Virtual Currency & Betting
**Goal**: Users have virtual wallet that enables optional room betting
**Depends on**: Phase 2
**Requirements**: GUTH-01, GUTH-02, GUTH-03, GUTH-04, GUTH-05, GUTH-06
**Success Criteria** (what must be TRUE):
  1. New user receives 1000 starting balance (or admin override amount)
  2. User sees current balance on every page
  3. Room creator can set optional bet amount when creating room (0 means no betting)
  4. System validates user has sufficient balance before allowing bet
  5. High-stakes bets show confirmation dialog before placement
  6. Admin can add or remove balance from any user
  7. All balance changes are logged in transaction history visible to admin
**Plans**: 10 plans

Plans:
- [ ] 03-01-PLAN.md — Database schema (Wallet, Transaction, BetEscrow, SystemSettings) and core wallet operations
- [ ] 03-02-PLAN.md — Payout calculation and escrow state machine (TDD)
- [ ] 03-03-PLAN.md — Socket.IO balance events and sidebar balance widget with animated counter
- [ ] 03-04-PLAN.md — Daily allowance with activity scaling, weekly bonus, and P2P transfers
- [ ] 03-05-PLAN.md — Admin finance page with economy dashboard, transaction log, and system settings
- [ ] 03-06-PLAN.md — Room creation betting flow (free/bet toggle, presets, payout ratios) and lobby badges/filters
- [ ] 03-07-PLAN.md — Wallet page with balance chart, transaction history, daily claim, and transfer form
- [ ] 03-08-PLAN.md — Escrow lifecycle integration (buy-in, refund, forfeit, payout) with pot display and results breakdown
- [ ] 03-09-PLAN.md — Admin balance tools (adjustments, freeze) and suspicious activity alerts
- [ ] 03-10-PLAN.md — Full Phase 3 verification checkpoint

### Phase 4: Additional Games
**Goal**: Full game suite with Poker, Blackjack, and Roulette available
**Depends on**: Phase 3
**Requirements**: SPIEL-02, SPIEL-03, SPIEL-04, SPIEL-05, SPIEL-06
**Success Criteria** (what must be TRUE):
  1. User can play Texas Hold'em Poker with other players including blinds, raises, and all-in
  2. User can play Blackjack solo against the house
  3. User can play Blackjack with other players at multiplayer table
  4. User can play Roulette solo against the house
  5. User can play Roulette with other players at multiplayer table
  6. All game outcomes use server-side cryptographic random number generation
  7. Betting works correctly for all games with proper escrow and payout
**Plans**: TBD

Plans:
- TBD during phase planning

### Phase 5: Polish & Community
**Goal**: Enhanced user experience with statistics, themes, and moderation tools
**Depends on**: Phase 4
**Requirements**: UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. User can switch between multiple visual themes (dark, light, classic)
  2. User has profile page showing statistics (games played, won, balance history)
  3. Lobby supports pagination and filtering when many rooms exist
  4. Admin has enhanced tools to monitor active rooms and moderate chat
  5. Reconnection recovery is robust with clear user feedback
  6. AFK detection works reliably across all game types
**Plans**: TBD

Plans:
- TBD during phase planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Infrastructure | 6/6 | Complete | 2026-02-11 |
| 2. Core Game Engine (Kniffel MVP) | 10/11 | In progress | - |
| 3. Virtual Currency & Betting | 0/10 | Not started | - |
| 4. Additional Games | 0/TBD | Not started | - |
| 5. Polish & Community | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-11*
*Last updated: 2026-02-12 (Phase 3 planned: 10 plans in 5 waves for virtual currency and betting)*
