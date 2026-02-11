# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Spieler können in Echtzeit gemeinsam klassische deutsche Spiele spielen — wie an einem echten Stammtisch, nur online.
**Current focus:** Phase 1 - Foundation & Infrastructure

## Current Position

Phase: 1 of 5 (Foundation & Infrastructure)
Plan: 6 of 6 in current phase
Status: Phase complete - UAT ready
Last activity: 2026-02-11 — Completed 01-06-PLAN.md (Gap closure: root route and invite dialog fixes)

Progress: [██████████] 100% (6/6 Phase 1 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 18.5 min
- Total execution time: 1.9 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 (Foundation) | 6/6 | 111 min | 18.5 min |

**Recent Trend:**
- Last 5 plans: 4min, 4min, 5min, 18min, 62min
- Trend: Two quick plans (01-02, 01-03), then larger plans for admin dashboard (01-04), verification (01-05), and gap closure (01-06)

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
- Fire-and-forget email sending (01-04): Email sent asynchronously to avoid blocking UI
- Graceful email degradation (01-04): App works without RESEND_API_KEY, logs warning and skips sending
- Reuse pending invites (01-04): Return existing link if unused invite exists for email
- Admin self-protection (01-04): Prevent self-ban and ban of other admins
- Delete root placeholder instead of redirecting (01-06): Let Next.js route groups work naturally
- Preserve handleClose for state reset (01-06): Separation of concerns in dialog management

### Pending Todos

None yet.

### Blockers/Concerns

- PostgreSQL database needs to be running for app to load (getSession queries DB, admin dashboard queries users/invites)
- Resend API key needed for email sending in admin dashboard (graceful degradation: invite creation works, email is skipped)
- Next.js 16 middleware deprecation warning (will need to rename to proxy.ts in future version)
- USER-SETUP.md created for Phase 1: Resend and PostgreSQL configuration needed (see 01-USER-SETUP.md)
- **Phase 1 UAT ready:** All foundation code complete, ready for full UAT re-test (3 direct fixes, 3 cascade unblocks)

## Session Continuity

Last session: 2026-02-11 (plan execution)
Stopped at: Completed 01-06-PLAN.md (gap closure for UAT failures)
Resume file: None
Next: Phase 1 complete - Ready for full UAT re-test or Phase 2 planning
