# Continue On Another PC

1. Clone the repo and enter it:
```powershell
git clone git@github.com:DerMaxiAufGit/Game-Site.git
cd Game-Site
```

2. Install Node dependencies:
```powershell
npm install
```

3. Create local env file:
- Copy `.env.example` to `.env.local`
- Set at least:
  - `DATABASE_URL`
  - `SESSION_SECRET`

4. Apply database migrations:
```powershell
npx prisma migrate deploy
```

5. Generate Prisma client:
```powershell
npx prisma generate
```

6. (Optional) Seed database:
```powershell
npx prisma db seed
```

7. Start dev server:
```powershell
npm run dev
```

8. If frontend chunks act weird after pulling:
```powershell
rmdir /s /q .next
npm run dev
```

