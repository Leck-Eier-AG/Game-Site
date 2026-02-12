---
status: diagnosed
phase: 03-virtual-currency-betting
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md, 03-06-SUMMARY.md, 03-07-SUMMARY.md, 03-08-SUMMARY.md, 03-09-SUMMARY.md
started: 2026-02-12T18:00:00Z
updated: 2026-02-12T18:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Balance Display in Sidebar
expected: On any page within the app, the sidebar shows your current chip balance with a coin/wallet icon. The balance is formatted with German number formatting (dot separators). Both desktop sidebar and mobile sidebar show the balance.
result: pass

### 2. Wallet Page Overview
expected: Navigating to /wallet shows a page with your current balance prominently displayed, a 30-day balance history chart (line chart), a daily claim section, a transfer section, and a transaction history list on the right side.
result: pass

### 3. Claim Daily Allowance
expected: On the wallet page, a "Tägliches Guthaben" button shows the claimable amount with an activity multiplier (e.g., "100 Chips (1.0x)"). Clicking it credits your balance, shows a success notification, and the button becomes disabled until the next day. Progress toward weekly bonus is shown.
result: pass

### 4. Transaction History with Filters
expected: On the wallet page, the transaction list shows entries grouped by day ("Heute", "Gestern", or date). Filter tabs (Alle, Gewinne, Verluste, Transfers, Admin) switch which transactions are displayed. Each entry shows an icon, description, colored amount (green for credits, red for debits), and time.
result: pass

### 5. Transfer Chips to Another User
expected: On the wallet page, the transfer form lets you search for a user by name. Typing shows matching users in a dropdown. Selecting a recipient and entering an amount, then submitting, deducts from your balance and credits the recipient. Transfer limits (max per transfer, daily total) are displayed.
result: issue
reported: "error when sending, but it still removes my chips. Invalid `tx.wallet.update()` invocation — An operation failed because it depends on one or more records that were required but not found. No record was found for an update."
severity: blocker

### 6. Create a Bet Room
expected: In the room creation dialog, toggling from "Kostenlos" to "Einsatz" reveals bet settings: preset amount buttons (50, 100, 250, 500), a custom amount input, optional min/max bet fields, and payout ratio configuration. Submitting creates a room with those bet settings.
result: issue
reported: "infinite loading screen when creating a room with bets. same without bets."
severity: blocker

### 7. Lobby Bet/Free Filters
expected: The lobby shows filter tabs "Alle", "Kostenlos", and "Einsatz" with room counts in parentheses. Bet rooms display an amber chip badge showing the bet amount (e.g., "100 Chips"). Free rooms show a green "Kostenlos" badge. Clicking filter tabs filters the room list accordingly.
result: pass

### 8. Join Bet Room (Buy-in)
expected: Joining a bet room deducts the bet amount from your balance. If your balance is insufficient, you join as spectator instead of player. Your sidebar balance updates immediately after joining.
result: skipped
reason: Blocked by room creation bug (Test 6)

### 9. Leave Bet Room Before Start (Refund)
expected: Leaving a bet room before the game has started refunds the full bet amount to your balance. Your sidebar balance updates to reflect the refund.
result: skipped
reason: Blocked by room creation bug (Test 6)

### 10. Pot Display During Gameplay
expected: During a bet room game, an animated pot display shows the total pot amount (bet amount x number of players) on the game board with a chip icon and amber/gold styling. Free rooms do not show a pot display.
result: skipped
reason: Blocked by room creation bug (Test 6)

### 11. Game End Payout Breakdown
expected: After a bet room game ends, the results screen shows a payout breakdown below the podium: each winner's position (with medal icons), their payout amount, and the distribution follows the configured payout ratios (default 60%/30%/10%).
result: skipped
reason: Blocked by room creation bug (Test 6)

### 12. AFK Warning in Bet Rooms
expected: In a bet room, if a player goes inactive, a warning banner appears with a countdown timer and an "Ich bin da!" button. Clicking the button cancels the warning. If the timer expires, the player is kicked and forfeits their bet. In free rooms, AFK kicks happen immediately without warning.
result: skipped
reason: Blocked by room creation bug (Test 6)

### 13. Player Card Chip Transfer
expected: In a game room's player list, each other player shows a "Chips senden" button (visible during waiting and ended phases). Clicking it opens the TransferDialog pre-filled with that player as recipient.
result: skipped
reason: Blocked by room creation bug (Test 6)

### 14. Admin Finance Dashboard
expected: Admin users see a "Finanzen" link with a coin icon in the sidebar. The /admin/finance page shows tabs: Dashboard, Transaktionen, Guthaben, Alarme, Einstellungen. The Dashboard tab shows economy stats (total circulation, average balance, active wallets, daily volume), a 30-day volume chart, transaction type distribution, and top earners/spenders leaderboards.
result: issue
reported: "error when accessing that: A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used"
severity: major

### 15. Admin Transaction Log
expected: The "Transaktionen" tab shows a filterable table of all transactions. A type dropdown filters by transaction type (11 types). A user search field filters by user. Transactions show date, type, user, colored amount, and description. "Mehr laden" button loads more entries.
result: skipped
reason: Blocked by admin finance hydration error (Test 14)

### 16. Admin Balance Adjustment
expected: The "Guthaben" tab lets admin search for a user, see their current balance and frozen status, and adjust their balance (positive or negative) with an optional reason. After adjustment, the affected user's sidebar balance updates in real-time via socket event.
result: skipped
reason: Blocked by admin finance hydration error (Test 14)

### 17. Admin Wallet Freeze/Unfreeze
expected: On the Guthaben tab, after selecting a user, admin can freeze or unfreeze their wallet. A frozen wallet shows a timestamp and tooltip explaining restrictions (can play but cannot bet or transfer). Frozen users cannot make outbound transfers or place bets.
result: skipped
reason: Blocked by admin finance hydration error (Test 14)

### 18. Suspicious Activity Alerts
expected: The "Alarme" tab shows detected suspicious activity: large transfers over threshold, daily limit violations, and rapid balance drops. Alerts are color-coded (amber warning, red critical). When no issues exist, a green "Keine verdächtigen Aktivitäten" card is shown. The tab badge shows alert count when alerts exist.
result: skipped
reason: Blocked by admin finance hydration error (Test 14)

### 19. Admin System Settings
expected: The "Einstellungen" tab shows a form with all economic parameters: currency name, starting balance, daily allowance, weekly bonus, transfer limits, default bet presets, payout ratios (editable table), AFK grace period, and alert thresholds. Saving updates take effect immediately without redeployment.
result: issue
reported: "there is no Einstellungen tab"
severity: major

### 20. Custom Starting Balance on Invite
expected: In the admin invite dialog, an optional "Individuelles Startguthaben" field allows setting a custom starting balance for that invite. The placeholder shows the current default (e.g., "Standard: 1000"). When a user registers via that invite, they receive the custom amount instead of the default.
result: skipped
reason: User skipped (admin finance page inaccessible)

## Summary

total: 20
passed: 5
issues: 4
pending: 0
skipped: 11

## Gaps

- truth: "Transfer deducts from sender and credits recipient atomically"
  status: failed
  reason: "User reported: error when sending, but it still removes my chips. Invalid tx.wallet.update() — No record was found for an update."
  severity: blocker
  test: 5
  root_cause: "creditBalance() in transactions.ts line 144 calls tx.wallet.update() without checking if wallet exists. When recipient has never accessed their wallet (lazy init not triggered), the update fails. Sender already debited in separate call."
  artifacts:
    - path: "src/lib/wallet/transactions.ts"
      issue: "creditBalance() assumes wallet exists, no upsert or lazy init"
    - path: "src/lib/actions/wallet.ts"
      issue: "transferFunds() calls creditBalance() for recipient without ensuring wallet exists"
  missing:
    - "creditBalance() needs to handle missing wallet — either upsert or trigger lazy init before update"
  debug_session: ".planning/debug/p2p-transfer-wallet-update-error.md"

- truth: "Room creation works for both free and bet rooms"
  status: failed
  reason: "User reported: infinite loading screen when creating a room with bets. same without bets."
  severity: blocker
  test: 6
  root_cause: "RoomManager.createRoom() was made async (line 40) to fetch SystemSettings payout ratios. The room:create handler (line 674) uses await correctly. Likely cause: Prisma Client not regenerated after SystemSettings model was added, making prisma.systemSettings undefined and throwing TypeError. For free rooms, another issue may exist — needs deeper investigation during fix."
  artifacts:
    - path: "server.js"
      issue: "room:create handler at line 674-714, createRoom() at line 40-89, SystemSettings query at line 47"
  missing:
    - "Run npx prisma generate to regenerate Prisma Client"
    - "Add defensive check for prisma.systemSettings existence"
    - "Investigate why free rooms also hang (should skip Prisma query)"
  debug_session: ".planning/debug/room-creation-infinite-loading.md"

- truth: "Admin finance page loads without errors"
  status: failed
  reason: "User reported: hydration mismatch error when accessing /admin/finance — A tree hydrated but some attributes of the server rendered HTML didn't match the client properties."
  severity: major
  test: 14
  root_cause: "Date objects from Prisma passed directly to client components without serialization. getAdminTransactionLog() returns items with createdAt: Date fields. TransactionLog formats with Intl.DateTimeFormat('de-DE') which produces different output on server vs client due to timezone/locale differences."
  artifacts:
    - path: "src/lib/actions/admin-finance.ts"
      issue: "getAdminTransactionLog() returns Date objects without serialization (line 183-186)"
    - path: "src/components/admin/transaction-log.tsx"
      issue: "Interface defines createdAt: Date, formatted with Intl.DateTimeFormat (line 36, 77, 247)"
    - path: "src/app/(app)/admin/finance/page.tsx"
      issue: "Server component passes unserialized transaction log to client (lines 26, 69)"
  missing:
    - "Serialize dates to ISO strings in server action before passing to client components"
    - "Update TransactionLog interface to accept string instead of Date for createdAt"
  debug_session: ".planning/debug/admin-finance-hydration-missing-tab.md"

- truth: "Einstellungen tab exists on admin finance page"
  status: failed
  reason: "User reported: there is no Einstellungen tab"
  severity: major
  test: 19
  root_cause: "Tab exists in code (page.tsx line 61 and lines 80-82). Likely consequence of hydration error from Bug 14 — page crashes during hydration before all tabs render. Fixing the hydration error should resolve this."
  artifacts:
    - path: "src/app/(app)/admin/finance/page.tsx"
      issue: "Tab defined at line 61 and content at lines 80-82, but hydration crash prevents rendering"
  missing:
    - "Fix hydration error (Gap 3) — tab should appear once page renders correctly"
  debug_session: ".planning/debug/admin-finance-hydration-missing-tab.md"
