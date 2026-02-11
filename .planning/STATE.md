# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Spieler können in Echtzeit gemeinsam klassische deutsche Spiele spielen — wie an einem echten Stammtisch, nur online.
**Current focus:** Phase 1 - Foundation & Infrastructure

## Current Position

Phase: 1 of 5 (Foundation & Infrastructure)
Plan: 3 of 5 in current phase
Status: In progress
Last activity: 2026-02-11 — Completed 01-03-PLAN.md (App shell and WebSocket)

Progress: [███░░░░░░░] 60% (3/5 Phase 1 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 5.7 min
- Total execution time: 0.28 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 (Foundation) | 3/5 | 17 min | 5.7 min |

**Recent Trend:**
- Last 5 plans: 9min, 4min, 4min
- Trend: Stable (4min this plan matching recent average)

*Updated after each plan completion*

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

### Pending Todos

None yet.

### Blockers/Concerns

- PostgreSQL database needs to be running for `prisma db push` (schema validates, but can't push without DB)
- Resend API key needed for email sending (placeholder in .env.local, won't block until Plan 04)
- Next.js 16 middleware deprecation warning (will need to rename to proxy.ts in future version)

## Session Continuity

Last session: 2026-02-11 (plan execution)
Stopped at: Completed 01-03-PLAN.md, app shell and WebSocket infrastructure ready
Resume file: None
Next: 01-04 (Admin dashboard with invite management and user ban/unban)
