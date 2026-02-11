---
phase: 01-foundation-infrastructure
plan: 03
subsystem: ui
tags: [nextjs, react, socket.io, websocket, jose, sidebar, navigation, i18n]

requires:
  - phase: 01-01
    provides: JWT session library, Prisma schema, shadcn/ui components, German translations, custom server
  - phase: 01-02
    provides: Auth pages, server actions (login, logout), getSession from DAL

provides:
  - Protected app layout with sidebar navigation (desktop and mobile)
  - Lobby placeholder page with German "coming soon" message
  - Socket.IO client-server integration with authentication middleware
  - Real-time connection status indicator with auto-reconnection
  - User menu with logout functionality
  - Admin-only navigation guards

affects:
  - 01-04: Admin dashboard will use app shell layout and sidebar navigation
  - 01-05: Verification checkpoint will test WebSocket connection and reconnection
  - Phase 2: Game rooms will use SocketProvider and connection status infrastructure
  - All future features: App navigation structure and WebSocket foundation established

tech-stack:
  added: []
  patterns:
    - App shell layout with server component wrapping client components
    - Socket.IO authentication via JWT session cookie verification
    - React context provider pattern for WebSocket state management
    - Responsive sidebar: desktop fixed vertical, mobile sheet with hamburger
    - Role-based navigation filtering (admin-only links)
    - Connection status indicator with real-time state updates
    - Auto-reconnection with exponential backoff (1s to 30s with jitter)
    - State recovery request on reconnect (stub for Phase 2)

key-files:
  created:
    - src/app/(app)/layout.tsx: Protected app layout with getSession and SocketProvider
    - src/app/(app)/page.tsx: Lobby placeholder with German translations
    - src/components/layout/sidebar.tsx: Desktop vertical sidebar with nav links
    - src/components/layout/mobile-sidebar.tsx: Mobile sheet-based sidebar with hamburger
    - src/components/layout/user-menu.tsx: Dropdown menu with logout action
    - src/components/layout/connection-status.tsx: Real-time connection indicator
    - src/lib/socket/client.ts: Socket.IO client singleton
    - src/lib/socket/provider.tsx: SocketProvider and useSocket hook
  modified:
    - server.js: Added Socket.IO authentication middleware with jose JWT verification

key-decisions:
  - "Socket.IO auth via JWT session cookie: Server-side verification prevents unauthorized connections"
  - "Connection status in sidebar: Real-time visual feedback for WebSocket state"
  - "Auto-reconnection with jitter: Exponential backoff (1s-30s) with randomization factor 0.1"
  - "State recovery request on reconnect: Emit 'request-state' for future game state recovery (PITFALL 6)"
  - "Role-based nav filtering: Admin links only shown to ADMIN role users"

patterns-established:
  - "App layout pattern: Server component fetches session, wraps with SocketProvider, passes user data to client components"
  - "Sidebar component pattern: 'use client' components receive user props from server parent"
  - "Socket.IO auth: Parse session cookie from socket.request.headers.cookie, verify with jose, store userId/role in socket.data"
  - "Connection indicator: useSocket hook provides isConnected state, visual dot + label shows status"

duration: 4min
completed: 2026-02-11
---

# Phase 1 Plan 3: App Shell & WebSocket Summary

**Protected app with responsive sidebar navigation, Socket.IO authentication middleware, and real-time connection status indicator**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-02-11T19:00:39Z
- **Completed:** 2026-02-11T19:04:23Z
- **Tasks:** 2
- **Files created:** 8
- **Files modified:** 1

## Accomplishments

- App shell with responsive sidebar: desktop fixed vertical, mobile sheet with hamburger menu
- Socket.IO integration: JWT authentication middleware in custom server, client provider with React context
- Real-time connection status: green/red indicator showing online/offline state with auto-reconnection
- Admin-only navigation: Administration link filtered by user role
- Lobby placeholder: German "coming soon" message with icon
- User menu: dropdown with logout action in sidebar

## Task Commits

Each task was committed atomically:

1. **Task 1: Build app shell with sidebar navigation and lobby placeholder** - `eae7429` (feat)
2. **Task 2: Integrate Socket.IO with auth middleware, provider, and connection status** - `06cab44` (feat)

**Plan metadata:** (will be committed after STATE.md and ROADMAP.md updates)

## Files Created/Modified

**Created:**
- `src/app/(app)/layout.tsx` - Protected app layout with getSession check and SocketProvider wrapper
- `src/app/(app)/page.tsx` - Lobby placeholder page with German translations
- `src/components/layout/sidebar.tsx` - Desktop vertical sidebar with nav links, connection status, user menu
- `src/components/layout/mobile-sidebar.tsx` - Mobile sheet-based sidebar triggered by hamburger icon
- `src/components/layout/user-menu.tsx` - Dropdown menu with logout action
- `src/components/layout/connection-status.tsx` - Real-time connection indicator (green/red dot + label)
- `src/lib/socket/client.ts` - Socket.IO client singleton with getSocket() function
- `src/lib/socket/provider.tsx` - SocketProvider React context and useSocket hook

**Modified:**
- `server.js` - Added Socket.IO authentication middleware using jose JWT verification

## Decisions Made

- **Socket.IO auth via session cookie:** Server-side JWT verification in io.use() middleware prevents unauthorized WebSocket connections (PITFALL 4)
- **Connection status in sidebar:** Real-time visual feedback for users to see WebSocket connection state
- **Auto-reconnection with jitter:** Exponential backoff (1s-30s) with randomization factor 0.1 prevents thundering herd
- **State recovery on reconnect:** Emit 'request-state' event on reconnect for future game state recovery (PITFALL 6)
- **Role-based nav filtering:** Administration link only shown to users with ADMIN role

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - build passed on first attempt after each task, all verifications successful.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

### Ready to Build

- ✅ Admin dashboard (01-04): App shell and navigation structure complete, can add admin route
- ✅ WebSocket infrastructure ready: Authentication middleware working, provider managing connections
- ✅ Connection status visible: Users can see real-time connection state
- ✅ Role-based navigation: Admin-only links pattern established
- ✅ German translations: All UI strings use de.json translations

### Blockers

None. All app shell and WebSocket infrastructure complete.

### Risks

1. **PostgreSQL not running:** Database must be running for app layout (getSession requires DB query). Mitigated by clear error message if connection fails.
2. **WebSocket connection failures:** If Socket.IO auth fails, connection will be rejected. Console shows "Authentication required" error. Auto-reconnection will retry every 1-30 seconds.

---

*Phase: 01-foundation-infrastructure*
*Plan: 01-03*
*Status: ✅ Complete*
*Completed: 2026-02-11*
*Next: 01-04 (Admin dashboard with invite management and user ban/unban)*
