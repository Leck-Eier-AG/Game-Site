# README Production Setup + Minor Release Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a production setup README for release users, push it to GitHub, and create a new minor release (v0.2.0).

**Architecture:** A root `README.md` will document production-only setup steps for a Linux server with Node.js and PostgreSQL, including Prisma migrate/seed, build, and start commands. The change is committed, pushed, and a GitHub release is created with auto-generated notes.

**Tech Stack:** Node.js, Prisma, Git, GitHub CLI (`gh`).

---

### Task 1: Create Root README With Production Setup Steps

**Files:**
- Create: `README.md`
- Modify: none
- Test: none

**Step 1: Write README content**

Create `README.md` with the following sections and exact commands:
- Title: `# Game-Site`
- `## Production Setup (Linux)`
  - Prereqs: Linux server with Node.js + npm and PostgreSQL
  - Download and unzip release
  - `cd` into release directory
  - Install deps: `npm install`
  - Create env: copy `.env.example` to `.env.local`
  - Fill env values: `DATABASE_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`
  - Prisma deploy: `npx prisma migrate deploy`
  - Seed: `npx prisma db seed`
  - Build: `npm run build`
  - Start: `npm run start`
  - Access: `http://localhost:3000` (or configured URL)
- `## Troubleshooting`
  - Missing env vars → check `.env.local`
  - DB connection errors → verify `DATABASE_URL` and Postgres running
  - Seed required → run `npx prisma db seed` if app complains about missing system settings

**Step 2: Commit README**

```bash
git add README.md
git commit -m "docs: add production setup README"
```

### Task 2: Push README Commit to GitHub

**Files:**
- Create: none
- Modify: none
- Test: none

**Step 1: Push branch**

Run: `git push -u origin feature/readme-release`

Expected: branch pushed to GitHub.

### Task 3: Merge README To master (Fast-Forward)

**Files:**
- Create: none
- Modify: none
- Test: none

**Step 1: Switch to master**

Run: `git checkout master`

**Step 2: Pull latest**

Run: `git pull --ff-only origin master`

Expected: master up to date.

**Step 3: Fast-forward merge**

Run: `git merge --ff-only feature/readme-release`

Expected: master fast-forwards to README commit.

**Step 4: Push master**

Run: `git push`

Expected: master updated on GitHub.

### Task 4: Create Minor Release v0.2.0

**Files:**
- Create: none
- Modify: none
- Test: none

**Step 1: Check for existing tag/release**

Run: `git tag -l v0.2.0`

Expected: no output.

Run: `gh release list --limit 20`

Expected: no `v0.2.0` listed.

**Step 2: Create release**

Run: `gh release create v0.2.0 --target master --title "v0.2.0" --generate-notes`

Expected: release URL returned.

**Step 3: Verify**

Run: `gh release view v0.2.0 --json tagName,name`

Expected: `tagName` and `name` equal `v0.2.0`.
