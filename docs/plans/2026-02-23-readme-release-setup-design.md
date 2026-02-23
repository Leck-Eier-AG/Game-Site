# README Production Setup + Minor Release Design

Date: 2026-02-23
Repo: DerMaxiAufGit/Game-Site
Branch: master

## Summary
Create a root `README.md` that guides release users through production setup on a Linux server with Node.js. Include database initialization steps using Prisma. Then publish a new minor GitHub release (v0.2.0) that includes the README.

## Goals
- Provide a clear, step-by-step production setup guide for users who download a release ZIP.
- Include environment configuration and Prisma migration/seed steps.
- Commit the README and push to GitHub.
- Create a new minor release (v0.2.0) with auto-generated notes.

## Non-Goals
- Development setup instructions.
- Changing application behavior or code.
- Adding deployment automation (systemd, Docker, etc.).

## Approach
- Add root `README.md` with production-only setup steps:
  - Prerequisites (Linux server with Node.js + npm, PostgreSQL)
  - Download/unzip release
  - Install deps (`npm install`)
  - Configure env (`.env.example` -> `.env.local`)
  - Prisma migrate/seed (`npx prisma migrate deploy`, `npx prisma db seed`)
  - Build (`npm run build`)
  - Start (`npm run start`)
  - Access URL/port and basic troubleshooting
- Commit and push the README to GitHub.
- Create GitHub release `v0.2.0` targeting `master` with generated notes.

## Error Handling
- If GitHub auth/permissions fail, stop and report.
- If release tag exists, stop and ask how to proceed.

## Verification
- Confirm `README.md` exists and contains setup steps.
- Confirm release `v0.2.0` exists via `gh release list`.

## Rollback
- If needed, delete release `v0.2.0` and/or revert README commit.
