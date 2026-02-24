# Security Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix invite URL poisoning, login user enumeration, and socket transfer notification spoofing as documented in `docs/security-review-2026-02-24.md`.

**Architecture:** Allowlist invite origin hosts against `NEXT_PUBLIC_APP_URL`, unify login failure responses with server-side logging, and require server-side verification of transfer notifications via transaction ID before emitting any wallet updates.

**Tech Stack:** Next.js, Node.js, Prisma, Socket.IO.

---

### Task 1: Allowlist Invite Origin Host

**Files:**
- Modify: `src/lib/actions/admin.ts`
- Test: none

**Step 1: Add allowlist helper and fallback**

In `createInvite`, replace the `appUrl` assignment with logic that:
- reads `NEXT_PUBLIC_APP_URL` as the trusted base (fallback to `http://localhost:3000`).
- parses `origin` if present.
- uses `origin` only if its host matches the trusted base host.
- falls back to the trusted base otherwise.

Use this pattern (exact logic; adapt variable names):

```ts
const trustedBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
let appUrl = trustedBase
const origin = formData.get('origin') as string | null
if (origin) {
  try {
    const trustedHost = new URL(trustedBase).host
    const originHost = new URL(origin).host
    if (originHost === trustedHost) {
      appUrl = origin
    }
  } catch {
    // ignore invalid origin
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/actions/admin.ts
git commit -m "fix(security): allowlist invite origin"
```

---

### Task 2: Unify Login Failure Response

**Files:**
- Modify: `src/lib/actions/auth.ts`
- Test: none

**Step 1: Replace banned response with generic failure**

In `login`, when `user.bannedAt` is set:
- log a server-side warning with user id/email.
- return `{ message: 'invalidCredentials' }` (same as other failures).

Example:

```ts
if (user.bannedAt) {
  console.warn('Login blocked for banned user', { userId: user.id, email: user.email })
  return { message: 'invalidCredentials' }
}
```

**Step 2: Commit**

```bash
git add src/lib/actions/auth.ts
git commit -m "fix(security): unify login failure response"
```

---

### Task 3: Verify Transfer Notifications Server-Side

**Files:**
- Modify: `server.js`
- Modify: `src/lib/actions/wallet.ts`
- Modify: `src/components/wallet/transfer-form.tsx`
- Test: none

**Step 1: Return a transactionId from the transfer action**

In `transferFunds`, capture the created `TRANSFER_SENT` transaction ID and return it in the action response:

```ts
return { success: true, transactionId: sentTransaction.id, toUserId, amount }
```

Store the created transaction in a variable inside the transaction block so you can return its `id`.

**Step 2: Emit wallet:transfer-complete with transactionId**

In `TransferForm`, when `state?.success` and a `transactionId` is present, emit:

```ts
socket.emit('wallet:transfer-complete', {
  transactionId: state.transactionId,
  toUserId: state.toUserId,
  amount: state.amount,
})
```

If `transactionId` is missing, skip the emit.

**Step 3: Update event payload to require transactionId**

Update `wallet:transfer-complete` handler to accept `{ transactionId, toUserId, amount }`.

**Step 4: Verify transaction before emitting**

Inside the handler:
- Look up the transaction by id.
- Verify it exists, belongs to `socket.data.userId`, targets `toUserId`, and has status completed (or equivalent final status in your schema).
- Verify the amount matches the transaction amount.
- If any check fails, log and return without emitting.

Use this structure (adapt to actual schema fields):

```js
const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } })
if (!transaction) return
if (transaction.userId !== socket.data.userId) return
if (transaction.relatedUserId !== toUserId) return
if (transaction.type !== 'TRANSFER_SENT') return
if (transaction.amount !== amount) return
```

Then emit balance update and `wallet:transfer-received` as before.

**Step 5: Commit**

```bash
git add server.js src/lib/actions/wallet.ts src/components/wallet/transfer-form.tsx
git commit -m "fix(security): verify transfer notifications"
```

---

### Task 4: Verify Tests

**Files:**
- Test: none

**Step 1: Run tests**

Run: `npm test`
Expected: all suites pass.

**Step 2: Commit (if needed)**

No commit needed unless changes were made.
