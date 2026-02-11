# Phase 1: Foundation & Infrastructure - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Secure invite-based authentication, admin user management, WebSocket real-time infrastructure, and the app shell that all future game features build on. Everything is in German. No games, no lobby logic, no currency — just the foundation.

</domain>

<decisions>
## Implementation Decisions

### Login & Registration Flow
- First visitor gets a simple setup form (username, email, password) to become admin — no guided tour, just get started
- Invited users register with: username, password, and display name (email already known from invite)
- Login page design: Claude's discretion — pick whatever fits the overall style
- Error feedback via toast notifications (wrong password, expired invite, etc.)

### Admin Dashboard
- Separate /admin route with its own layout, distinct from the main app
- Main view: overview with key stats at top (total users, active now, pending invites), user list below
- Invite management supports both options: send invite via email OR generate a shareable link (for WhatsApp, Discord, etc.)
- Ban flow includes an optional reason/note field for record-keeping

### App Shell & Navigation
- Vertical sidebar navigation — expandable as games are added in later phases
- After login, user lands on an empty lobby placeholder ("Spiele kommen bald") — ready for Phase 2 to populate
- Mobile: sidebar collapses behind hamburger menu icon, slides in when tapped
- Sidebar shows visible connection status indicator (online/offline dot for WebSocket state)

### Visual Style & Branding
- Aesthetic: modern and clean base with subtle traditional/Stammtisch touches
- Dark mode as default color scheme
- Accent color: rich green (Stammtisch felt) for buttons, links, active states
- Typography: Claude's discretion — pick a font stack that complements the dark + green aesthetic

### Claude's Discretion
- Login page layout and design
- Typography/font selection
- Loading states and skeleton designs
- Exact spacing, border radius, shadow values
- Error state visual patterns (beyond toast decision)
- WebSocket reconnection UX details

</decisions>

<specifics>
## Specific Ideas

- The green accent should evoke card table felt — tying into the gaming/Stammtisch tradition
- Dark mode + green creates a casino/game-room atmosphere
- Sidebar navigation chosen specifically because more games will be added in Phase 2 and 4

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-infrastructure*
*Context gathered: 2026-02-11*
