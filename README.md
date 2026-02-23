# Game-Site

## Production Setup (Linux)

### Prerequisites
- Linux server with Node.js and npm installed
- PostgreSQL database

### 1) Download and unzip the release
Unzip the release archive, then open a terminal in the extracted folder.

### 2) Install dependencies
```bash
npm install
```

### 3) Configure environment
Copy the example env file and edit it:
```bash
cp .env.example .env.local
```

Set these values in `.env.local`:
- `DATABASE_URL` (PostgreSQL connection string)
- `SESSION_SECRET` (generate with `openssl rand -base64 32`)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_APP_URL`

### 4) Initialize the database
Run migrations and seed initial data:
```bash
npx prisma migrate deploy
npx prisma db seed
```

### 5) Build the app
```bash
npm run build
```

### 6) Start the server
```bash
npm run start
```

### 7) Open the app
By default it runs at:
```
http://localhost:3000
```
(or whatever you set in `NEXT_PUBLIC_APP_URL`).

## Troubleshooting
- Missing env values: verify `.env.local` is present and filled out.
- DB connection errors: check `DATABASE_URL` and that PostgreSQL is running.
- App complains about missing system settings: run `npx prisma db seed`.
