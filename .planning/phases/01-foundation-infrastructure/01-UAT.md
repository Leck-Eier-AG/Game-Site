---
status: complete
phase: 01-foundation-infrastructure
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-06-SUMMARY.md]
started: 2026-02-11T21:00:00Z
updated: 2026-02-11T21:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Admin Account Setup
expected: Navigate to /setup. Dark-themed form with German labels (Benutzername, E-Mail, Anzeigename, Passwort). Submit creates admin account and redirects to app shell.
result: pass

### 2. Login Page
expected: Clear cookies / log out first. Navigate to /login. Dark-themed form with German labels (E-Mail, Passwort). Unauthenticated users should land here (middleware redirect from /).
result: pass

### 3. App Shell & Sidebar Navigation
expected: After login, see a fixed vertical sidebar on desktop with Kniff branding, navigation links (Lobby, Administration for admin users), connection status indicator, and user menu at bottom.
result: pass

### 4. WebSocket Connection Status
expected: In the sidebar, see a connection status indicator. With the custom server running (node server.js), it should show a green dot with "Verbunden". If server is down or using next dev, red dot with "Getrennt".
result: pass

### 5. Admin Dashboard
expected: Click "Administration" in sidebar. See dashboard with statistics cards showing total users, active users, and pending invites. Below that, a user management table listing all users with their roles (ADMIN/USER badges).
result: pass

### 6. Create User Invite
expected: On admin dashboard, click invite button. A dialog opens asking for an email address. Submit creates invite and shows a shareable registration link you can copy.
result: pass

### 7. Invite Registration Flow
expected: Open the invite registration link in a new/incognito browser. See registration form with email pre-filled (read-only), plus username, display name, and password fields. Submit creates account and redirects to app.
result: pass

### 8. User Ban/Unban
expected: On admin dashboard user table, see ban button next to non-admin users. Clicking opens a dialog with optional reason field. After banning, user shows as banned. Unban button appears to reverse it.
result: pass

### 9. User Menu & Logout
expected: In the sidebar, click your user avatar/name to open dropdown menu. Click "Abmelden" (Logout). You are redirected to /login page.
result: pass

### 10. Mobile Responsive Layout
expected: Resize browser to mobile width (< 768px). Sidebar disappears, hamburger menu icon appears. Tapping hamburger opens a slide-out sheet with the same navigation, connection status, and user menu.
result: pass

### 11. German Language
expected: All UI text throughout the app displays in German -- page titles, button labels, form fields, error messages, navigation items, status indicators.
result: pass

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
