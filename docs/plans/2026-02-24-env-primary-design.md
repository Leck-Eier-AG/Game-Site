# Env Primary With .env.local Fallback Design

**Date:** 2026-02-24
**Owner:** Codex + user

## Goal
Make `.env` the primary configuration file while preserving `.env.local` as an optional fallback/override. Update all docs and runtime messages to match.

## Scope
- Clarify environment file priority in docs and app messages.
- Keep current `process.env` usage unchanged.
- Ensure server env loading explicitly documents `.env` first, `.env.local` second.

## Non-Goals
- Removing `.env.local` support.
- Introducing new config tooling.
- Changing production deployment behavior.

## Approach
- Keep Next.js env loading behavior via `@next/env`.
- Update docs to instruct `.env` as primary and `.env.local` as fallback.
- Update in-app warnings/messages that mention `.env.local` only.

## Files to Update
- `server.js` (comment/clarity about load order)
- `README.md`
- `docs/continue-on-another-pc.md`
- `docs/plans/2026-02-23-readme-release-setup.md`
- `docs/plans/2026-02-23-readme-release-setup-design.md`
- `docs/plans/2026-02-23-agents-md.md`
- `src/lib/email/invite.ts` (warning text)
- `AGENTS.md`

## Risks
Low. No behavior change expected beyond documentation clarity.

## Validation
- Manual: run with `.env` only; run with `.env` + `.env.local` to confirm override works.
