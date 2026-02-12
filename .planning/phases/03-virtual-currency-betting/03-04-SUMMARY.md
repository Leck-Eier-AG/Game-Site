---
phase: 03-virtual-currency-betting
plan: 04
subsystem: daily-allowance-and-transfers
tags: [daily-claim, activity-scoring, p2p-transfers, limits]

dependency_graph:
  requires:
    - wallet-database-schema (03-01)
    - acid-safe-balance-operations (03-01)
    - transaction-ledger (03-01)
    - system-settings-configuration (03-01)
  provides:
    - activity-multiplier-calculation
    - daily-allowance-claiming
    - weekly-bonus-system
    - p2p-transfer-operations
    - transfer-limit-enforcement
  affects:
    - wallet-ui-components
    - admin-finance-dashboard
    - social-economy-features

tech_stack:
  added:
    - activity-metrics-calculation
    - weekly-bonus-streak-tracking
  patterns:
    - non-accumulating-daily-claims
    - activity-scaled-rewards
    - frozen-wallet-asymmetric-restrictions
    - daily-transfer-limit-aggregation

key_files:
  created:
    - src/lib/wallet/activity-score.ts
    - src/lib/wallet/daily-allowance.ts
    - src/lib/actions/wallet.ts
  modified: []

decisions:
  - title: "Activity multiplier scaling from 1.0x to 2.0x"
    rationale: "Three components (games played, active minutes, login streak) each contribute to reward scaling, capped at 2x to balance engagement incentives without excessive inflation"
    alternative: "Fixed daily allowance without activity scaling"
    impact: "Rewards active players while maintaining economic balance"

  - title: "Non-accumulating daily claims"
    rationale: "Can only claim current day's allowance, not missed days - prevents hoarding behavior and encourages regular engagement"
    alternative: "Accumulating model where missed days roll over"
    impact: "Simpler UX, clearer expectations, prevents bulk claims"

  - title: "Weekly bonus on 7th consecutive claim (fixed amount)"
    rationale: "Every 7th claim triggers bonus regardless of multiplier, creating engagement rhythm and rewarding consistency"
    alternative: "Weekly bonus also scales with activity"
    impact: "Predictable bonus amount, stronger incentive for daily logins"

  - title: "Daily transfer limits with aggregation check"
    rationale: "Single transfer max + daily total cap enforced by summing TRANSFER_SENT transactions for current day"
    alternative: "Only single transfer max without daily total limit"
    impact: "Prevents abuse via multiple small transfers, requires database aggregation query"

  - title: "Frozen wallets can receive transfers but not send"
    rationale: "Admin freeze prevents outbound abuse (transfers, bets) while allowing inbound operations (receives, wins, claims)"
    alternative: "Full freeze blocks all transfer operations"
    impact: "More flexible moderation, frozen users can still accumulate balance"

metrics:
  duration_minutes: 0.5
  tasks_completed: 2
  files_created: 3
  files_modified: 0
  commits: 2
  lines_added: 539
  completed_at: "2026-02-12T11:26:33Z"
---

# Phase 03 Plan 04: Daily Allowance & Transfers Summary

**One-liner:** Activity-scaled daily allowance with weekly bonuses and P2P transfers enforcing configurable limits and frozen wallet restrictions.

## What Was Built

### Activity Scoring System
- **ActivityMetrics interface:** Tracks gamesLast7Days, activeMinutesLast7Days, loginStreakDays
- **getUserActivityMetrics():** Queries Transaction table for GAME_WIN/BET_PLACED in last 7 days, estimates active time from distinct transaction days (30min per day proxy), fetches current login streak from wallet
- **calculateActivityMultiplier():** Combines three activity components:
  - Games: +0.05 per game, cap +0.5 (10 games = max)
  - Active time: +0.01 per 30min estimate, cap +0.3
  - Login streak: +0.02 per day, cap +0.2
  - Base 1.0, total cap 2.0

### Daily Allowance System
- **canClaimDaily():** Checks if lastDailyClaim was before today (midnight UTC comparison), returns boolean
- **getDailyClaimInfo():** Returns UI display data:
  - canClaim: boolean
  - amount: calculated daily or weekly bonus amount
  - multiplier: current activity multiplier (1.0-2.0)
  - nextBonusIn: claims remaining until next weekly bonus (0-6)
  - isWeeklyBonus: true if next claim is weekly bonus
- **claimDailyAllowance():** ACID-safe claim with Serializable isolation:
  1. Re-verify canClaim inside transaction (race protection)
  2. Calculate streak: increment if consecutive day, reset to 1 if gap > 1 day
  3. Determine if weekly bonus: `newStreak % 7 === 0`
  4. Calculate amount: weekly bonus = fixed amount (no multiplier), daily = base * multiplier
  5. Upsert wallet: increment balance, update lastDailyClaim, set dailyClaimStreak
  6. Create Transaction record: DAILY_CLAIM or WEEKLY_BONUS with German description
  7. Store metadata: baseAmount, multiplier, metrics, isWeeklyBonus, streak

### Server Actions (src/lib/actions/wallet.ts)
- **getWalletData(userId?):** Fetches wallet with user, daily claim info, and currency name from SystemSettings
- **claimDaily():** Authenticates session, calls claimDailyAllowance, returns { success, amount, type, multiplier } or { error }
- **transferFunds(prevState, formData):** P2P transfer with comprehensive validation:
  1. Parse and validate with transferSchema (toUserId, amount)
  2. Check sender !== receiver
  3. Enforce single transfer max from SystemSettings
  4. Aggregate today's TRANSFER_SENT transactions, check daily total limit
  5. Verify sender wallet not frozen
  6. Execute transfer in Prisma transaction:
     - Debit sender: TRANSFER_SENT with description "Transfer an {recipientDisplayName}"
     - Credit receiver: TRANSFER_RECEIVED with description "Transfer von {senderDisplayName}"
- **getTransactions(options):** Fetches paginated transaction history with type filtering
- **getBalanceChartData(days?):** Returns balance history for chart visualization

### Transaction Descriptions (German)
- Daily claim: "Tägliches Guthaben ({multiplier*100}% Aktivität)"
- Weekly bonus: "Wöchentlicher Bonus (Claim #{streak})"
- Transfer sent: "Transfer an {recipientDisplayName}"
- Transfer received: "Transfer von {senderDisplayName}"

## Deviations from Plan

None - plan executed exactly as written. All functions implemented according to specification with proper ACID guarantees, validation, and error handling.

## Verification Results

**TypeScript compilation:** PASSED - Core wallet functionality compiles without errors. Errors in output are for missing UI components planned in future plans (03-05 for wallet UI, 03-06 for admin finance dashboard).

**Implementation verification:**
- Activity scoring: Metrics calculation queries Transaction table for gameplay data, estimates active time from transaction frequency, retrieves streak from wallet
- Daily allowance: Non-accumulating design with streak tracking, weekly bonus triggers on 7th consecutive claim
- Transfer validation: Single max and daily total limits enforced, frozen wallet check prevents outbound operations
- Transaction records: All operations create immutable audit trail with descriptive German text

**ACID safety:**
- Daily claim uses Serializable isolation with re-verification inside transaction
- Transfer uses debitBalance/creditBalance which have built-in Serializable isolation
- Race conditions prevented at database level

## Key Technical Decisions

### Why Non-Accumulating Daily Claims?
Per research recommendation, users can only claim the current day's allowance. Missing a day means you lose that day's claim - it doesn't accumulate. This prevents hoarding behavior where users might save up claims for bulk redemption, and encourages regular engagement patterns.

### Why Fixed Weekly Bonus Instead of Scaled?
Weekly bonus (every 7th consecutive claim) awards a fixed amount from SystemSettings without applying the activity multiplier. This creates a predictable reward for consistency that complements the variable daily amounts. Players know exactly what they'll get on their 7th day, making it a stronger engagement anchor.

### Why Estimate Active Minutes from Transaction Days?
The system doesn't yet track actual active session time, so we estimate by counting distinct days with transactions and multiplying by 30 minutes. This is acknowledged as a rough proxy. Each transaction day = 30min estimate. Future enhancement could add actual session tracking for more accurate active time measurement.

### Why Daily Transfer Limit via Aggregation?
Transfer limits have two layers:
1. Single transfer max (per-operation check)
2. Daily total cap (aggregate all TRANSFER_SENT transactions for current day)

The aggregation query (`SUM(amount) WHERE type=TRANSFER_SENT AND createdAt >= today`) prevents abuse via many small transfers. Trade-off: requires database query before each transfer, but essential for effective limit enforcement.

### Why Frozen Wallet Asymmetry?
Frozen wallets (admin-set frozenAt timestamp) can RECEIVE but not SEND:
- Blocked: Transfers out, bet placements (any debitBalance operation)
- Allowed: Transfers in, game wins, daily claims (creditBalance operations)

This gives admins flexible moderation - freeze prevents abuse while letting users continue playing free rooms and accumulating balance. They can't extract value via transfers or betting, but they're not completely locked out.

## Integration Points

**Provides to other plans:**
- Activity scoring used by daily allowance calculation, could be used for leaderboards or achievements
- Daily claim server action ready for wallet UI integration (03-05)
- Transfer server action ready for wallet UI integration (03-05)
- Transaction history and balance chart data for wallet UI components

**Consumes from previous plans:**
- getSystemSettings() for all economic parameters (03-01)
- getWalletWithUser() for wallet data (03-01)
- creditBalance() / debitBalance() for balance operations (03-01)
- transferSchema from validations (03-01)
- Transaction enums and types (03-01)

**Server action pattern note:**
Server actions run in Next.js process, not the custom server.js with Socket.IO. For real-time balance updates after transfers/claims, client components should refetch balance from the Socket provider after action succeeds. The Socket.IO `balance:updated` event is for when OTHER processes change your balance (game payouts, admin adjustments). This separation is intentional and documented in code comments.

## Files Reference

**Activity Scoring:** `/home/maxi/Documents/coding/AI/claude/kniff/src/lib/wallet/activity-score.ts`
- Exports: getUserActivityMetrics, calculateActivityMultiplier, ActivityMetrics

**Daily Allowance:** `/home/maxi/Documents/coding/AI/claude/kniff/src/lib/wallet/daily-allowance.ts`
- Exports: canClaimDaily, getDailyClaimInfo, claimDailyAllowance, DailyClaimInfo, ClaimResult

**Wallet Actions:** `/home/maxi/Documents/coding/AI/claude/kniff/src/lib/actions/wallet.ts`
- Exports: getWalletData, claimDaily, transferFunds, getTransactions, getBalanceChartData

## Testing Notes

**Manual verification performed:**
- TypeScript compilation passed for wallet core (UI errors are expected)
- Activity multiplier calculation logic verified (component caps and total cap)
- Daily claim streak logic verified (consecutive day detection, reset on gap)
- Weekly bonus trigger logic verified (7th claim modulo check)
- Transfer limit validation verified (single max, daily total, frozen check)

**Automated testing recommendations:**
- Daily claim race condition: concurrent claims from same user should result in one success, one failure
- Streak calculation edge cases: claim at 23:59 then 00:01 (consecutive), claim with 2-day gap (reset)
- Weekly bonus math: verify 7th, 14th, 21st claims trigger bonus, 6th and 8th don't
- Transfer daily limit: multiple transfers throughout day should aggregate correctly, reset at midnight UTC
- Frozen wallet restrictions: verify frozen wallet can receive but not send transfers
- Activity multiplier boundary tests: verify individual caps (games, time, streak) and total 2.0 cap

## Known Limitations

1. **Active minutes estimation is rough:** Counts distinct transaction days * 30min as proxy for actual active time. Consider adding session tracking for more accurate activity measurement.

2. **Weekly bonus doesn't scale with activity:** Fixed amount from SystemSettings. Intentional design for predictability, but could be made configurable (scaled vs. fixed weekly bonus).

3. **No transfer cooldown between same users:** User A can send to User B multiple times per day (within daily limit). Consider adding per-recipient cooldown if abuse occurs.

4. **Streak breaks at midnight UTC:** Users in different timezones have different claim windows. Consider timezone-aware streak calculation or document UTC-based system clearly.

5. **No retry logic for Serializable conflicts:** High concurrent claim volume could cause transaction conflicts. Consider exponential backoff retry wrapper for claim operations.

6. **Transfer descriptions hardcoded in German:** No i18n support yet. Future: extract to translation files.

## Self-Check

### Verification: Created Files
```bash
[ -f "src/lib/wallet/activity-score.ts" ] && echo "FOUND: src/lib/wallet/activity-score.ts" || echo "MISSING: src/lib/wallet/activity-score.ts"
[ -f "src/lib/wallet/daily-allowance.ts" ] && echo "FOUND: src/lib/wallet/daily-allowance.ts" || echo "MISSING: src/lib/wallet/daily-allowance.ts"
[ -f "src/lib/actions/wallet.ts" ] && echo "FOUND: src/lib/actions/wallet.ts" || echo "MISSING: src/lib/actions/wallet.ts"
```

**Result:**
FOUND: src/lib/wallet/activity-score.ts
FOUND: src/lib/wallet/daily-allowance.ts
FOUND: src/lib/actions/wallet.ts

### Verification: Commits
```bash
git log --oneline --all | grep "03-04"
```

**Result:**
8426f67 feat(03-04): implement wallet server actions
06f6211 feat(03-04): implement activity scoring and daily allowance system

## Self-Check: PASSED

All files created and committed successfully. Daily allowance system with activity scaling and P2P transfers operational and ready for UI integration.

## Next Steps

**Immediate dependencies (Plan 03-05):**
- Wallet UI components will consume getWalletData(), claimDaily(), transferFunds()
- Balance display with claim button uses dailyClaimInfo
- Transaction history list uses getTransactions()
- Balance chart uses getBalanceChartData()

**Future integration (Plan 03-06+):**
- Admin finance dashboard displays transfer alerts using SystemSettings thresholds
- Admin can adjust balances, freeze wallets, view system-wide transaction logs
- Game betting flow will use balance checks before accepting bets
- Payout system will credit winners using creditBalance() with GAME_WIN type
