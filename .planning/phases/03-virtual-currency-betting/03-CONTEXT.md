# Phase 3: Virtual Currency & Betting - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Virtual wallet system with optional room betting for games. Users have a balance, can earn through daily allowances and game winnings, send currency to each other, and bet on game rooms. Admins have full economic control through a dedicated finance page and system settings. Creating new game types or expanding game functionality is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Betting flow
- Room creator sets bet amount upfront — players see it before joining
- Separate toggle for "free" vs "bet" room (not just bet=0) — different room badges/labels in lobby
- Buy-in deducted on join — refunded if leaving before game starts
- Confirmation dialog when bet exceeds 25% of player's current balance (percentage-based threshold)
- Leaving mid-game in bet room = forfeit buy-in — pot distributed among finishers
- AFK in bet rooms gets a grace period warning before kick/forfeit
- Preset bet amounts (e.g. 50, 100, 250, 500) plus custom input option
- No hard global min/max limits — reasonable defaults with full creator freedom
- Room creator can set min/max bet for their room
- Room creator can configure payout ratios with reasonable defaults (e.g. 1st: 60%, 2nd: 30%, 3rd: 10%)
- Tied players split the prize for their position evenly
- Pot always visible on game board during gameplay
- Results screen shows detailed payout breakdown per player ('+240 Chips (1. Platz)')
- Bet rooms visible in lobby with chip icon + bet amount badge AND filter tabs (Free/Bet)
- Players with insufficient balance can still see bet rooms and join as spectators

### Balance display & wallet
- Balance always visible in sidebar as persistent widget
- Sidebar balance clickable — hover shows mini popover (last 3 transactions), click navigates to full wallet page
- Animated counter on balance changes — number ticks up/down with green/red flash
- Full dedicated wallet page with:
  - Balance graph over time (line chart) at top
  - Transaction list grouped by day with filter controls (all, wins, losses, transfers, admin adjustments)
  - Each transaction descriptive: 'Kniffel gewonnen (1. Platz)', 'Einsatz: Raum ABC', 'Admin-Gutschrift'
- Currency name is admin-configurable in system settings (not hardcoded)

### Economic tuning
- Starting balance set globally by admin in system settings (no hardcoded default)
- Daily allowance for ALL players (not just zero-balance) — manual claim button on wallet page ('Tägliches Guthaben abholen')
- Daily amount scales with player activity (more active = slightly more)
- Weekly bonus: bigger reward every ~7 days, rest of days are same amount
- Player-to-player transfers supported — like PayPal for the platform
- Transfer limits configurable by admin in system settings
- Send money from wallet page OR directly from any user's profile/player card

### Admin balance tools
- Dedicated admin finance page (separate from existing admin dashboard)
- Full economy dashboard: charts showing total circulation, daily transaction volume, top earners/spenders, average balance
- Balance adjustments with optional reason field (logged either way)
- Bulk balance adjustments — select multiple users or 'all users' and apply change at once
- Full transaction log showing everything: game payouts, bets, P2P transfers, daily claims, admin adjustments — filterable
- Configurable alerts for suspicious activity (e.g. transfers > threshold, rapid balance drops) — shown in dashboard
- Balance freeze option: admin can freeze a user's wallet (user can play free rooms but can't bet or transfer)

### System settings (admin)
- Full economic config page: currency name, starting balance, daily allowance amount, weekly bonus amount, transfer limits, default bet presets, default payout ratios, AFK grace period for bet rooms, alert thresholds

### Claude's Discretion
- Database schema design for transactions (ACID compliance)
- Escrow implementation for active bets
- Activity scoring algorithm for daily allowance scaling
- Chart library choice for balance graph and admin dashboard
- API design for balance operations
- Real-time balance update mechanism (WebSocket events)

</decisions>

<specifics>
## Specific Ideas

- Player-to-player transfers described as "like PayPal" — should feel familiar and easy
- Sidebar balance with hover popover for quick glance, full page for details
- Room creator has significant control: bet amount, min/max, payout ratios — but always with reasonable defaults
- System settings centralize all economic configuration — admin shouldn't need to touch code
- "Stammtisch" atmosphere: everyone can spectate bet rooms even without balance

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-virtual-currency-betting*
*Context gathered: 2026-02-12*
