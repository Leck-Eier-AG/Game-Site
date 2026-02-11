# Phase 01: User Setup Required

**Generated:** 2026-02-11
**Phase:** 01-foundation-infrastructure
**Status:** Incomplete

Complete these items for email invitations and PostgreSQL database to function. Claude automated everything possible; these items require human access to external dashboards/accounts.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `RESEND_API_KEY` | Resend Dashboard (resend.com) → API Keys → Create API Key | `.env.local` |
| [ ] | `RESEND_FROM_EMAIL` | Your verified domain email or use `onboarding@resend.dev` for testing | `.env.local` |
| [ ] | `DATABASE_URL` | PostgreSQL connection string (local or hosted like Neon/Railway) | `.env.local` |

## Account Setup

### Resend (Email Service)

- [ ] **Create Resend account**
  - URL: https://resend.com/signup
  - Skip if: Already have Resend account

### PostgreSQL Database

- [ ] **Set up PostgreSQL database**
  - **Option 1 (Local):** Install PostgreSQL locally and create database
  - **Option 2 (Neon):** Create free serverless PostgreSQL at https://neon.tech
  - **Option 3 (Railway):** Create PostgreSQL at https://railway.app
  - **Option 4 (Supabase):** Create PostgreSQL at https://supabase.com

## Dashboard Configuration

### Resend

- [ ] **Create API Key**
  - Location: Resend Dashboard → API Keys → Create API Key
  - Permission: Full Access
  - Copy key immediately (shown only once)

- [ ] **Verify sender domain (optional for production)**
  - Location: Resend Dashboard → Domains → Add Domain
  - For testing: Use `onboarding@resend.dev` (no verification needed)
  - For production: Add and verify your domain with DNS records

### PostgreSQL

- [ ] **Run database migrations**
  ```bash
  npx prisma db push
  ```
  This creates the User and Invite tables in your database.

## Local Development

### Testing Without Email

The app gracefully handles missing `RESEND_API_KEY`:
- Invite creation still works (generates tokens and links)
- Email sending is skipped with console warning
- Generated links can be manually shared

### Testing With Email

1. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in `.env.local`
2. Use `onboarding@resend.dev` for testing (no domain verification needed)
3. Click "Per E-Mail senden" in admin dashboard to test

## Verification

After completing setup:

```bash
# Check environment variables are set
grep RESEND .env.local
grep DATABASE_URL .env.local

# Verify database connection
npx prisma db push

# Verify build passes
npm run build

# Start development server
npm run dev
```

Expected results:
- Build passes without errors
- Database migrations applied successfully
- Admin dashboard loads at http://localhost:3000/admin
- Invite creation works (with or without email sending)

---

**Once all items complete:** Mark status as "Complete" at top of file.
