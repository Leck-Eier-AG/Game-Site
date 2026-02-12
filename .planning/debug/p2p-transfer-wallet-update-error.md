---
status: diagnosed
trigger: "P2P chip transfer fails with 'No record found for an update' on tx.wallet.update(). The sender's chips are deducted but the recipient never receives them."
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:05:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: Transfer function directly calls tx.wallet.update() on recipient without ensuring wallet exists first
test: Read transferFunds function in wallet.ts actions to verify update sequence
expecting: Will find direct tx.wallet.update() call instead of creditBalance() call
next_action: Read src/lib/actions/wallet.ts

## Symptoms

expected: Sender's chips deducted, recipient receives chips
actual: Sender's chips deducted, recipient never receives chips, error thrown
errors: Invalid tx.wallet.update() invocation — An operation failed because it depends on one or more records that were required but not found. No record was found for an update.
reproduction: Execute P2P chip transfer to recipient who doesn't have an initialized wallet
started: Unknown — likely affects transfers to users without existing wallets

## Eliminated

## Evidence

- timestamp: 2026-02-12T00:01:00Z
  checked: src/lib/actions/wallet.ts lines 175-191
  found: transferFunds() wraps debitBalance() and creditBalance() in prisma.$transaction(), but debitBalance and creditBalance already create their own transactions internally
  implication: Nested transactions - outer transaction has tx client, but inner functions create new transactions, not using the outer tx client

- timestamp: 2026-02-12T00:02:00Z
  checked: src/lib/wallet/transactions.ts lines 130-170 (creditBalance)
  found: creditBalance() creates its own prisma.$transaction and calls tx.wallet.update() on line 144
  implication: creditBalance assumes wallet exists, will fail with "No record found for update" if wallet doesn't exist

- timestamp: 2026-02-12T00:03:00Z
  checked: src/lib/wallet/transactions.ts lines 176-237 (debitBalance)
  found: debitBalance() creates its own prisma.$transaction, checks wallet exists (line 190), then updates
  implication: debitBalance handles non-existent wallet with error, but creditBalance does NOT

- timestamp: 2026-02-12T00:04:00Z
  checked: src/lib/wallet/transactions.ts lines 38-124 (getWalletWithUser)
  found: getWalletWithUser() implements lazy initialization - creates wallet if doesn't exist
  implication: This is the function that should be used to ensure wallet exists before crediting

## Resolution

root_cause: creditBalance() function in src/lib/wallet/transactions.ts (line 144) directly calls tx.wallet.update() without checking if the wallet exists first. When transferring to a user who has never accessed their wallet (lazy initialization not triggered), the update fails with "No record found for an update". The sender's debitBalance() succeeds (it checks wallet exists), but the recipient's creditBalance() fails, leaving the transaction incomplete.
fix: creditBalance() needs to implement upsert logic or call getWalletWithUser() to ensure the wallet exists before attempting to update it. Specifically, line 144 should either: (1) Use tx.wallet.upsert() instead of tx.wallet.update(), OR (2) Call getWalletWithUser(userId) before the transaction to trigger lazy initialization.
verification: Transfer chips to a user who has never logged in or accessed their wallet. The transfer should succeed and both sender and recipient wallets should reflect correct balances.
files_changed: [src/lib/wallet/transactions.ts]
