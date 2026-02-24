# Security Fixes Design (2026-02-24)

## Goal
Address the three security findings from `docs/security-review-2026-02-24.md`:
1) invite URL poisoning via untrusted origin,
2) login user enumeration via banned response,
3) socket transfer notification spoofing and balance disclosure.

## Scope
- Admin invite URL construction and email link generation.
- Login error responses for failed auth and banned users.
- Socket transfer notification handling for wallet transfers.

## Non-Goals
- Implementing rate limiting or lockouts.
- Adding new security logging infrastructure beyond targeted logs.
- Refactoring unrelated socket or wallet flows.

## Approach
- **Invite URL allowlist:** Accept `origin` only if its host matches the host of `NEXT_PUBLIC_APP_URL`. Otherwise use `NEXT_PUBLIC_APP_URL` (or localhost if unset). This preserves flexibility for multi-host setups while preventing untrusted origins from controlling the invite URL.
- **Login response unification:** Return a generic `invalidCredentials` message for all login failures (including banned accounts). Log ban attempts server-side.
- **Transfer notification verification:** Require a `transactionId` on the `wallet:transfer-complete` socket event. Validate the transaction belongs to the sender, targets the recipient, and is completed before emitting notifications.

## Files
- `src/lib/actions/admin.ts`
- `src/lib/actions/auth.ts`
- `server.js`
- (Potentially) any client/type definitions for transfer event payloads

## Error Handling
- Invalid/mismatched `origin` → fallback to trusted base URL.
- Invalid/unauthorized transfer notifications → log and ignore.
- Banned login attempt → log and return generic failure.

## Validation
- Run `npm test`.
- Manual sanity: create invite with custom origin (allowed/blocked) and verify link.
- Manual sanity: emit transfer-complete with invalid transactionId and confirm no notification.
