# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Spieler können in Echtzeit gemeinsam klassische deutsche Spiele spielen — wie an einem echten Stammtisch, nur online.
**Current focus:** Phase 3 - Virtual Currency Betting

## Current Position

Phase: 3 of 5 (Virtual Currency Betting)
Plan: 5 of 10 in current phase
Status: In progress
Last activity: 2026-02-12 — Completed 03-05-PLAN.md (Admin finance dashboard)

Progress: [██████████████████░░] 36% (18/50 total plans complete, 4/10 Phase 3 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 18
- Average duration: 6.9 min
- Total execution time: 2.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 (Foundation) | 6/6 | 111 min | 18.5 min |
| 2 (Game Engine) | 10/11 | 31 min | 3.1 min |
| 3 (Virtual Currency) | 4/10 | 11.1 min | 2.8 min |

**Recent Trend:**
- Last 5 plans: 5min, 2.9min, 2.9min, 1.9min, 4.2min
- Trend: Phase 3 maintaining solid velocity

*Updated after each plan completion*

| Phase 03 P01 | 174s (2.9min) | 2 tasks | 5 files |
| Phase 03 P02 | 175s (2.9min) | 4 tasks | 4 files |
| Phase 03 P03 | 114s (1.9min) | 2 tasks | 8 files |
| Phase 03 P05 | 252s (4.2min) | 2 tasks | 8 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Einladungsbasiert statt offene Registrierung: Kontrolle über Nutzerkreis, Community-Charakter
- Virtuelles Guthaben statt echtes Geld: Kein Glücksspiel-Recht, Spaß im Vordergrund
- Kniffel + Casino als v1, Rest als v2: Machbarer Umfang für erste Version
- Echtzeit statt rundenbasiert: Stammtisch-Gefühl, gemeinsames Erleben
- Multiple Themes mit Nutzerauswahl: Personalisierung, verschiedene Geschmäcker
- Use Prisma v6 over v7 (01-01): v7 config changes not stable yet
- Tailwind v4 CSS-based config (01-01): New @theme directive in CSS instead of JS config
- jose over jsonwebtoken (01-01): Edge Runtime compatible for middleware
- useActionState for forms (01-02): React 19 pattern, cleaner than useFormState
- Force dynamic rendering on DB-dependent pages (01-02): Prevents build-time DB queries
- Server-side invite validation (01-02): Better UX than client-side error after submit
- Socket.IO auth via JWT session cookie (01-03): Server-side verification prevents unauthorized connections
- Auto-reconnection with jitter (01-03): Exponential backoff 1s-30s with randomization factor 0.1
- State recovery on reconnect (01-03): Emit 'request-state' for future game state recovery (PITFALL 6)
- Fire-and-forget email sending (01-04): Email sent asynchronously to avoid blocking UI
- Graceful email degradation (01-04): App works without RESEND_API_KEY, logs warning and skips sending
- Reuse pending invites (01-04): Return existing link if unused invite exists for email
- Admin self-protection (01-04): Prevent self-ban and ban of other admins
- Delete root placeholder instead of redirecting (01-06): Let Next.js route groups work naturally
- Preserve handleClose for state reset (01-06): Separation of concerns in dialog management
- JSON game state storage (02-01): Store full game state as JSON in GameRoom.gameState for atomic updates
- Cryptographic RNG server-side (02-01): Use node:crypto randomInt for CSPRNG dice rolling
- Comprehensive type system upfront (02-01): Define all game types early to unblock parallel plans
- Early 3D dependency installation (02-01): Install three.js and R3F in foundation to unblock Plan 02-02
- Frequency counting for scoring (02-02): Build counts[1..6] array for efficient pattern detection in Kniffel
- Full house edge case (02-02): Must be exactly 3+2, not 4 or 5 of same kind
- Auto-pick tie-breaking (02-02): Prefer lower section categories when multiple score same points
- TDD RED-GREEN-REFACTOR (02-02): Write failing tests, implement to pass, refactor - atomic commits per phase
- Direct index mapping for kept dice (02-03): keptDice[i] = true keeps state.dice[i], false uses newDice[i]
- Return Error objects not throw (02-03): Functional paradigm, errors are values for type safety
- Round increments when all players complete (02-03): Prevents premature advancement if players at different paces
- Pure state machine functions (02-03): No side effects, caller generates randomness via crypto RNG
- In-memory room storage (02-04): Use Map for room state, no DB writes during gameplay for performance
- UUID room IDs (02-04): node:crypto randomUUID for secure, unguessable room identifiers
- Spectator mode (02-04): Users joining in-progress games become spectators, not players
- Host reassignment (02-04): First player becomes host when original host leaves
- Real-time lobby updates (02-04): Broadcast room:list-update on all changes, no polling needed
- Canvas texture die faces (02-05): Procedural generation eliminates image assets, fully customizable
- Physics impulse rolling (02-05): Rapier impulse/torque for realistic tumbling, 3s auto-snap ensures completion
- Kinematic kept dice (02-05): Switch to kinematic RigidBody prevents kept dice from moving during roll
- Green glow kept state (02-05): Emissive green matches app accent, clearly distinguishes kept dice
- Chat message 500-char limit (02-08): Prevents abuse, keeps chat performant
- Room chat history 100 messages (02-08): Balance between context and memory usage
- Spectators included in chat (02-08): Creates "Stammtisch" atmosphere where everyone can talk
- System messages on game events (02-08): Join/leave/kick broadcast with isSystem flag for styling
- isAnimating gates scoresheet (02-07): Prevents category selection during dice roll physics animation
- Dynamic import for R3F components (02-07): ssr: false prevents Next.js SSR errors with React Three Fiber
- Server timestamp sync for timer (02-07): Calculate from server's turnStartedAt to prevent client drift
- Scoresheet view modes (02-07): Compact (own scores) and full table (all players) with toggle button
- Auto-play uses imported autoPickCategory (02-10): Zero inline scoring duplication, single source of truth
- Turn timer auto-rolls if needed (02-10): Check rollsRemaining === 3, auto-roll before picking category
- AFK kick adjusts game state (02-10): Remove player, end game if <2 remain, adjust currentPlayerIndex
- Rematch resets to waiting room (02-10): Clear gameState, reset isReady, emit rematch-accepted/declined
- GameResults podium styling (02-10): Gold/silver/bronze for top 3, trophy/medal icons
- RematchVote progress indicator (02-10): Visual bar showing votedYes / required threshold
- tsx for TypeScript imports (02-09): Use tsx to run server.js with TS module imports, simplest approach
- Server delegates to state machine (02-09): All game logic via applyAction, createInitialState from imported modules
- Ready toggle in waiting phase (02-09): game:player-ready toggles directly, not via state machine (room-level concept)
- Filter ready players on start (02-09): game:start moves non-ready to spectators before creating initial state
- Serializable isolation for balance ops (03-01): Prisma interactive transactions with Serializable isolation prevent race conditions
- Lazy wallet initialization (03-01): Create wallet with starting balance on first access, no migration needed
- Frozen wallets asymmetric (03-01): Can receive (transfers, wins, claims) but cannot send (bets, transfers)
- Transaction ledger immutable (03-01): All balance changes create transaction records with type, amount, description, metadata
- Escrow balance separation (03-02): In-game bets held in escrowBalance, isolated from main balance until payout
- Split-pot Dutch auction (03-02): Winner takes 75% of pot, remaining 25% split among losers proportionally
- User-specific Socket.IO rooms (03-03): Join user:{userId} room on connect for targeted balance:updated events
- Balance in SocketProvider (03-03): Global reactive balance state accessible via useSocket hook
- Animated balance with flash effects (03-03): CountUp transitions with green/red CSS keyframe flashes on changes
- Lazy popover transaction fetch (03-03): Emit wallet:recent-transactions only when popover opens, not on mount
- Activity multiplier 1.0x to 2.0x (03-04): Three components (games, time, streak) contribute to daily allowance scaling
- Non-accumulating daily claims (03-04): Can only claim current day, missed days don't roll over
- Weekly bonus fixed amount (03-04): 7th consecutive claim triggers bonus without multiplier for predictability
- Daily transfer limits with aggregation (03-04): Single max + daily total cap prevents abuse via multiple small transfers
- Recharts for admin charts (03-05): Industry-standard React charting library with TypeScript support for economy dashboard
- Cursor pagination for transaction log (03-05): createdAt timestamp cursor prevents page drift, 50-item pages for performance
- Live settings without deployment (03-05): Database-backed SystemSettings enables real-time economy tuning
- Separate admin finance page (03-05): Dedicated /admin/finance route for economy control distinct from user management

### Pending Todos

None yet.

### Blockers/Concerns

- PostgreSQL database needs to be running for app to load (getSession queries DB, admin dashboard queries users/invites)
- Resend API key needed for email sending in admin dashboard (graceful degradation: invite creation works, email is skipped)
- Next.js 16 middleware deprecation warning (will need to rename to proxy.ts in future version)
- USER-SETUP.md created for Phase 1: Resend and PostgreSQL configuration needed (see 01-USER-SETUP.md)
- **Database migration required:** GameRoom model added to schema but not pushed to database. Run `npx prisma db push` or `npx prisma migrate dev` before using game features

## Session Continuity

Last session: 2026-02-12 (plan execution)
Stopped at: Completed 03-05-PLAN.md (Admin finance dashboard)
Resume file: None
Next: Continue Phase 3 with Plan 03-06 (next in sequence)
