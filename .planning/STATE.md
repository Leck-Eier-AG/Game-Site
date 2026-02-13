# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Spieler können in Echtzeit gemeinsam klassische deutsche Spiele spielen — wie an einem echten Stammtisch, nur online.
**Current focus:** Phase 4 - Additional Games

## Current Position

Phase: 4 of 5 (Additional Games)
Plan: 10 of 11 in current phase
Status: In progress
Last activity: 2026-02-13 — Completed 04-10-PLAN.md (Poker UI Components)

Progress: [█████████████████████░] 70% (35/50 total plans complete, 10/11 Phase 4 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 35
- Average duration: 5.1 min
- Total execution time: 3.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 (Foundation) | 6/6 | 111 min | 18.5 min |
| 2 (Game Engine) | 10/11 | 31 min | 3.1 min |
| 3 (Virtual Currency) | 15/15 | 51.3 min | 3.4 min |
| 4 (Additional Games) | 10/11 | 65.1 min | 6.5 min |

**Recent Trend:**
- Last 5 plans: 9.5min, 6.0min, 3.4min, 4.9min, 5.8min
- Trend: UI plans (04-07, 04-08, 04-10) ~5min, TDD plans (04-03, 04-05, 04-06) ~10min

*Updated after each plan completion*

| Phase 03 P01 | 174s (2.9min) | 2 tasks | 5 files |
| Phase 03 P02 | 175s (2.9min) | 4 tasks | 4 files |
| Phase 03 P03 | 114s (1.9min) | 2 tasks | 8 files |
| Phase 03 P05 | 252s (4.2min) | 2 tasks | 8 files |
| Phase 03 P06 | 220s (3.7min) | 2 tasks | 5 files |
| Phase 03 P07 | 292s (4.9min) | 2 tasks | 7 files |
| Phase 03 P08 | 392s (6.5min) | 2 tasks | 12 files |
| Phase 03 P09 | 391s (6.5min) | 2 tasks | 9 files |
| Phase 03 P11 | 131s (2.2min) | 2 tasks | 3 files |
| Phase 03 P12 | 206s (3.4min) | 2 tasks | 4 files |
| Phase 03 P13 | 243s (4.05min) | 3 tasks | 1 file |
| Phase 03 P14 | 209s (3.5min) | 2 tasks | 3 files |
| Phase 03 P15 | 158s (2.6min) | 2 tasks | 2 files |
| Phase 04 P01 | 203s (3.4min) | 2 tasks | 10 files |
| Phase 04 P02 | 420s (7.0min) | 2 tasks | 5 files |
| Phase 04 P03 | 607s (10.1min) | 3 tasks (TDD) | 3 files |
| Phase 04 P04 | 204s (3.4min) | 2 tasks | 2 files |
| Phase 04 P05 | 606s (10.1min) | 3 tasks (TDD) | 2 files |
| Phase 04 P06 | 568s (9.5min) | 2 tasks (TDD) | 2 files |
| Phase 04 P07 | 365s (6.0min) | 2 tasks | 7 files |
| Phase 04 P08 | 295s (4.9min) | 2 tasks | 7 files |
| Phase 04 P10 | 350s (5.8min) | 2 tasks | 7 files |

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
- Separate isBetRoom boolean (03-06): Explicit state clearer than relying on betAmount=0 to mean "free room"
- Async payout ratio fetch (03-06): Fetch default payout ratios from SystemSettings on room creation for live config
- Min/max bet per room (03-06): Optional room-level constraints for betting range, not global settings
- Payout ratio client validation (03-06): Sum-to-100% check with inline error prevents invalid submission
- [Phase 03]: Recharts for balance visualization: Industry-standard React charting library
- [Phase 03]: TransferDialog reusable component: Can be triggered from player cards or any user view
- AFK grace period in bet rooms (03-08): 30-second warning before kick/forfeit prevents accidental losses
- Player card transfer integration (03-08): TransferDialog accessible from PlayerList during waiting/ended phases
- Pot display during gameplay (03-08): Animated pot display on game board for transparency in bet rooms
- Detailed payout breakdown (03-08): Per-player payouts with positions shown on results screen
- Real-time balance notification via Socket.IO (03-09): Admin adjustments trigger socket events for instant user balance updates
- Custom starting balance per invite (03-09): Optional customStartingBalance field on Invite model enables per-invite overrides
- Alert thresholds configurable via SystemSettings (03-09): Live economy tuning for suspicious activity detection sensitivity
- ISO string date serialization at boundaries (03-12): Serialize Date objects to ISO strings at server action boundaries to prevent hydration mismatches
- [Phase 03]: Lazy wallet init in transaction context for P2P transfers
- [Phase 03]: Single atomic transaction for transfers (not nested)
- [Phase 03]: 5-second timeout on room creation via Promise.race
- Module scope for timer helper functions (03-13): sendSystemMessage and emitBalanceUpdate moved to module scope for autoPlay/kickPlayerAFK access
- Idempotency pattern for escrow (03-13): Check existingEscrow before debit/create to prevent duplicate charges on rejoin
- Disconnect escrow cleanup (03-13): Mirror room:leave logic - refund PENDING, forfeit LOCKED based on game status
- Use trigger prop for TransferDialog (03-14): TransferDialog accepts trigger prop (not children), consistent with component API
- Remove duplicate form field name (03-14): Only hidden input has name attribute with JSON value for proper FormData parsing
- ?confirmed=true query param flow signaling (03-15): Lobby → game navigation includes confirmation status to prevent double-prompting
- Free rooms and low-stakes bypass confirmation (03-15): Threshold-based UX - only high-stakes bets (>25% balance) show confirmation dialog
- Context-appropriate cancel behavior (03-15): Lobby cancel stays on lobby, game room cancel redirects home
- Custom SVG cards over external library (04-01): Full styling control, zero dependency risk, easier theme customization
- Procedural Web Audio synthesis (04-01): No audio file dependencies, fully customizable casino sounds via oscillators
- 3D CSS card flip transforms (04-01): Hardware-accelerated preserve-3d animations for natural card dealing effects
- Chip denomination breakdown (04-01): Greedy algorithm with standard casino denominations (1, 5, 25, 100, 500, 1000)
- GameType as union type (04-02): Type-safe game type checking ('kniffel' | 'blackjack' | 'roulette' | 'poker')
- Game-specific settings as optional fields (04-02): pokerSettings, blackjackSettings, rouletteSettings on RoomSettings
- Game type guards on Kniffel handlers (04-02): Prevent cross-game action pollution with explicit type checks
- Separate max player limits per game type (04-02): Kniffel 2-6, Blackjack 1-7, Roulette 1-10, Poker 2-9
- Blackjack dealing phase instantaneous (04-03): After all bets placed, cards dealt and immediate transition to player_turn
- Hand status updates through actions (04-03): Status derived from cards but updated via action handlers, not computed properties
- Dealer auto-play on turn transition (04-03): Dealer plays automatically (hit ≤16, stand 17+) and moves to settlement
- Pure function error handling (04-03): Return Error objects instead of throwing for type-safe error checking
- European roulette wheel layout (04-04): 37 numbers (0-36) with correct red/black color assignments
- Flexible calculateBetPayout parameter (04-04): Accepts single number or array for API convenience
- Outside bet constant extraction (04-04): OUTSIDE_BETS array for DRY principle in validation
- Adjacency validation for roulette bets (04-04): Grid-based logic for split/street/corner/line validation
- Manual royal flush detection (04-05): poker-evaluator-ts treats royal flush as straight flush, added isRoyalFlush() check
- Track lastAggressorIndex for betting completion (04-05): Betting round completes when action cycles back to last raiser
- Heads-up blind posting differs (04-05): Dealer posts small blind in heads-up, left of dealer in multi-player
- Blind escalation doubles blinds (04-05): Tournament mode doubles blinds every N hands via lastBlindIncrease tracking
- Folded players contribute but not eligible (04-06): Chips go into pots but folded players cannot win them
- Tie handling remainder to first (04-06): When pot doesn't split evenly, first winner gets remainder chip
- Integer arithmetic for chips (04-06): No floating point to prevent rounding errors in pot calculations
- Conservation invariant testing (04-06): Total distributed must equal total contributed in all pot scenarios
- Per-player Blackjack settlement (04-07): Each player vs dealer independently, not ranked pot distribution
- Blackjack payout ratios (04-07): Blackjack 3:2, insurance 2:1, surrender 0.5x, push returns original bet
- Game handler registration pattern (04-07): registerBlackjackHandlers(socket, io, roomManager, prisma) for modular game integration
- Spin timer management with auto-spin (04-08): If spinTimerSec > 0 and isManualSpin false, auto-spin when timer expires
- Per-spin settlement for Roulette (04-08): Tracks chips across multiple spins, escrow covers buy-in only
- 2D SVG wheel top-down layout (04-08): CSS animation, no 3D dependencies, responsive and performant
- Betting grid click placement (04-08): Standard casino UI, supports all 13 bet types via click handlers
- Seat rotation for poker (04-10): Current user always at position 0 (bottom center) for consistent UX
- Absolute positioning poker seats (04-10): SEAT_POSITIONS map with 9 clockwise positions around oval table
- Timer countdown 30s per action (04-10): Client-side visual countdown with color-coded progress bar
- Rebuy dialog between hands (04-10): Modal offers chip replenishment or spectator mode when chips exhausted
- Quick bet buttons from pot (04-10): Min, 1/2 Pot, 3/4 Pot, Pot calculated dynamically and filtered to valid range

### Pending Todos

None yet.

### Blockers/Concerns

- PostgreSQL database needs to be running for app to load (getSession queries DB, admin dashboard queries users/invites)
- Resend API key needed for email sending in admin dashboard (graceful degradation: invite creation works, email is skipped)
- Next.js 16 middleware deprecation warning (will need to rename to proxy.ts in future version)
- USER-SETUP.md created for Phase 1: Resend and PostgreSQL configuration needed (see 01-USER-SETUP.md)
- **Database migration required:** GameRoom model added to schema but not pushed to database. Run `npx prisma db push` or `npx prisma migrate dev` before using game features


## Session Continuity

Last session: 2026-02-13 19:30 UTC (Phase 4 execution)
Stopped at: Completed 04-10-PLAN.md (Poker UI Components). Oval poker table with 9 rotated seats, community cards with staggered animations, betting controls with raise slider, and rebuy dialog. All 4 casino games now have complete UI implementations.
Resume file: None
Next: Execute 04-11 (final plan in Phase 4) then proceed to Phase 5
