---
phase: 01-foundation-infrastructure
plan: 04
subsystem: admin
tags: [nextjs, react, prisma, resend, admin, email, server-actions]

requires:
  - phase: 01-01
    provides: Prisma schema with User and Invite models, auth library with requireAdmin
  - phase: 01-02
    provides: Auth server actions, requireAdmin DAL function
  - phase: 01-03
    provides: App shell layout with sidebar navigation

provides:
  - Admin dashboard with user statistics (total, active, pending invites)
  - Invite system with email sending and shareable link generation
  - User management with ban/unban functionality and reason tracking
  - Admin-only route protection via layout
  - Email integration using Resend with German HTML templates
  - Server actions for all admin operations

affects:
  - 01-05: Verification checkpoint will test admin dashboard and invite flow
  - Phase 2: Game admin features (room monitoring, moderation) will extend admin dashboard
  - Phase 3: Balance management will add admin actions to this dashboard
  - Phase 5: Enhanced moderation tools will build on ban/unban foundation

tech-stack:
  added: []
  patterns:
    - Server actions with zod validation for admin operations
    - Fire-and-forget email sending (non-blocking)
    - Graceful degradation when email service not configured
    - Cryptographically secure token generation with crypto.randomBytes
    - Admin-only route protection via layout.tsx with requireAdmin
    - Parallel data fetching with Promise.all for dashboard stats
    - Client-side dialog state management for invite and ban flows

key-files:
  created:
    - src/lib/email/invite.ts: Resend email integration with German HTML template
    - src/lib/actions/admin.ts: Server actions for invite, ban, unban, stats, user listing
    - src/app/(app)/admin/layout.tsx: Admin route protection with requireAdmin
    - src/app/(app)/admin/page.tsx: Admin dashboard page with stats and user table
    - src/components/admin/stats-cards.tsx: Dashboard statistics cards
    - src/components/admin/user-table.tsx: User management table with ban/unban actions
    - src/components/admin/invite-dialog.tsx: Invite creation dialog with email/link options
    - src/components/admin/ban-dialog.tsx: User ban dialog with reason field
    - src/components/ui/textarea.tsx: Textarea component for ban reason
  modified: []

key-decisions:
  - "Fire-and-forget email sending: Email is sent asynchronously after invite creation (non-blocking UI)"
  - "Graceful email degradation: App works without RESEND_API_KEY, logs warning and skips sending"
  - "Reuse pending invites: If unused invite exists for email, return existing link instead of creating new one"
  - "Admin protection: Prevent self-ban and ban of other admins"
  - "Secure tokens: Use crypto.randomBytes(32) for invite tokens (64 hex characters)"

patterns-established:
  - "Admin action pattern: All admin server actions call requireAdmin() as first operation"
  - "Email template pattern: HTML email with dark theme matching app aesthetic"
  - "Invite flow pattern: Single action supports both email sending and link generation via sendEmail flag"
  - "Ban tracking: bannedAt timestamp and optional bannedReason string for moderation history"

duration: 5min
completed: 2026-02-11
---

# Phase 1 Plan 4: Admin Dashboard Summary

**Admin dashboard with invite management, user ban/unban, statistics, and Resend email integration**

## Performance

- **Duration:** 5 minutes
- **Started:** 2026-02-11T19:07:03Z
- **Completed:** 2026-02-11T19:12:12Z
- **Tasks:** 2
- **Files created:** 9
- **Files modified:** 0

## Accomplishments

- Admin dashboard displays user statistics (total users, active users, pending invites)
- Invite system supports both email sending via Resend and shareable link generation
- User management table with ban/unban actions and role badges (ADMIN/USER)
- Ban functionality captures optional reason for moderation tracking
- Email integration with German HTML template matching app theme
- Admin-only route protection prevents non-admin access to /admin
- Graceful handling when Resend API key not configured (logs warning, skips email)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create admin server actions and email integration** - `38a56d0` (feat)
2. **Task 2: Build admin dashboard UI (stats, user table, invite dialog, ban dialog)** - `9d818d1` (feat)

**Plan metadata:** (will be committed after STATE.md and ROADMAP.md updates)

## Files Created/Modified

**Created:**
- `src/lib/email/invite.ts` - Resend email integration with German HTML template
- `src/lib/actions/admin.ts` - Server actions for createInvite, banUser, unbanUser, getAdminStats, getUsers, getInvites
- `src/app/(app)/admin/layout.tsx` - Admin route protection with requireAdmin check
- `src/app/(app)/admin/page.tsx` - Admin dashboard page combining stats and user table
- `src/components/admin/stats-cards.tsx` - Statistics cards component with green accent icons
- `src/components/admin/user-table.tsx` - User management table with ban/unban buttons
- `src/components/admin/invite-dialog.tsx` - Invite creation dialog with email/link options
- `src/components/admin/ban-dialog.tsx` - Ban user dialog with optional reason textarea
- `src/components/ui/textarea.tsx` - shadcn/ui Textarea component for ban reason input

**Modified:**
None - all new files for admin dashboard feature

## Decisions Made

- **Fire-and-forget email sending:** Email is sent asynchronously after invite creation to avoid blocking the UI. Uses `.catch()` for error logging without failing the request.
- **Graceful email degradation:** App detects missing RESEND_API_KEY, logs warning to console, and skips email sending. Invite creation still succeeds and returns shareable link.
- **Reuse pending invites:** If an unused, unexpired invite already exists for an email, return the existing link instead of creating a duplicate invite.
- **Admin self-protection:** Server actions prevent admin from banning themselves or other admins (validation in banUser action).
- **Secure token generation:** Invite tokens use `crypto.randomBytes(32).toString('hex')` for 64-character cryptographically secure tokens.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - build passed on first attempt after each task, all verifications successful.

## User Setup Required

**External services require manual configuration.** See [01-USER-SETUP.md](./01-USER-SETUP.md) for:
- Resend API key and from email configuration
- PostgreSQL database setup (local or hosted)
- Environment variable setup
- Verification commands

## Next Phase Readiness

### Ready to Build

- ✅ Admin dashboard complete with all planned features
- ✅ Invite system functional (email + link generation)
- ✅ User management (ban/unban) working
- ✅ Statistics aggregation complete
- ✅ Email integration ready (works with or without Resend configured)
- ✅ All German translations in place
- ✅ Mobile-responsive UI with dark theme

### Blockers

1. **Resend API key needed for email sending:** Admin can create invites and generate links, but email sending is skipped until RESEND_API_KEY is configured in .env.local. See 01-USER-SETUP.md for setup instructions.
2. **PostgreSQL must be running:** Database connection required for admin dashboard to load (getSession and admin queries). Local PostgreSQL or hosted service needed.

### Risks

None. Admin dashboard is fully functional with graceful degradation for missing email service.

---

*Phase: 01-foundation-infrastructure*
*Plan: 01-04*
*Status: ✅ Complete*
*Completed: 2026-02-11*
*Next: 01-05 (Full flow verification checkpoint)*
