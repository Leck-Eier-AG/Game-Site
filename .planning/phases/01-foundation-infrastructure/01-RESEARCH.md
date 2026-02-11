# Phase 1: Foundation & Infrastructure - Research

**Researched:** 2026-02-11
**Domain:** Full-stack web authentication, real-time WebSocket infrastructure, internationalization
**Confidence:** HIGH

## Summary

This phase requires building a secure, invite-based authentication system with real-time WebSocket infrastructure on top of Next.js App Router. The research focused on identifying the modern standard stack for authentication, session management, real-time communication, and UI components that work seamlessly with Next.js 15+ and the App Router architecture.

The standard approach in 2026 is to use Next.js 15+ with App Router, implement custom authentication using Server Actions (not a third-party auth library for this simple invite-based flow), PostgreSQL with Prisma for data persistence, Socket.IO for real-time WebSocket communication, shadcn/ui + Tailwind CSS for the component library, and next-intl for German language support. Authentication libraries like Auth.js or Clerk are overkill for invite-based auth and introduce unnecessary complexity for a solo developer greenfield project.

**Primary recommendation:** Build custom authentication using Next.js Server Actions with stateless JWT sessions in httpOnly cookies, use Prisma + PostgreSQL for database, Socket.IO for WebSockets, shadcn/ui for components, and next-intl for German translations.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x (App Router) | Full-stack framework | Industry standard for React SSR/SSG, Server Components and Server Actions provide secure auth patterns |
| React | 18.x | UI library | Required by Next.js, provides Hooks for client-side state |
| TypeScript | 5.x | Type safety | Essential for large codebases, catches errors at compile time |
| Prisma | 5.x-6.x | ORM + migrations | Most popular TypeScript-first ORM, excellent DX, schema-first design, strong Next.js integration |
| PostgreSQL | 14+ | Database | Production-grade relational DB, better concurrency than SQLite, supports complex queries |
| Socket.IO | 4.x | WebSocket library | De facto standard for real-time communication, automatic reconnection, fallback transports |
| shadcn/ui | Latest | Component library | Copy-paste components built on Radix UI, full control over code, excellent dark mode support |
| Tailwind CSS | 4.x | CSS framework | Utility-first styling, pairs perfectly with shadcn/ui, CSS-first configuration in v4 |
| next-intl | 3.x | i18n library | Next.js-native internationalization, App Router support, server/client component compatible |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bcrypt | 5.x | Password hashing | Always use for password storage (10-12 salt rounds recommended for 2026) |
| jose | 5.x | JWT creation/verification | Edge Runtime compatible, Next.js recommended for stateless sessions |
| zod | 3.x | Schema validation | Form validation, API input validation, type-safe runtime checks |
| Resend | 3.x | Transactional email | Modern dev-friendly email API, free tier suitable for small communities |
| sonner | Latest | Toast notifications | Lightweight, shadcn/ui integrated, minimal setup, works anywhere in app |
| React Hook Form | 7.x | Form management | Uncontrolled forms, excellent performance, integrates with zod |
| next-themes | 0.3.x | Theme management | Seamless dark mode for Next.js, no flash on load, system preference support |
| Lucide React | Latest | Icon library | shadcn/ui default, tree-shakeable, comprehensive icon set |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prisma | Drizzle ORM | Drizzle is lighter/faster, more SQL-like, better for edge. Prisma has better DX, migrations, and tooling. For solo dev with traditional deployment, Prisma wins. |
| PostgreSQL | SQLite (with Turso) | SQLite simpler for small scale, but PostgreSQL handles concurrency better for real-time multiplayer games. Stick with PostgreSQL. |
| Custom auth | Auth.js/NextAuth | Auth.js adds complexity for simple invite flow. Custom auth with Server Actions is cleaner for this use case. |
| Resend | Nodemailer (SMTP) | Nodemailer requires SMTP server management. Resend is developer-friendly with free tier. Use Resend unless specific SMTP requirements exist. |
| Socket.IO | react-use-websocket (native WebSocket) | Native WebSocket requires manual reconnection logic. Socket.IO provides automatic reconnection, room management, and fallbacks. Essential for game infrastructure. |
| next-intl | react-i18next | react-i18next is framework-agnostic but next-intl is purpose-built for Next.js App Router with better SSR support. |

**Installation:**
```bash
# Core dependencies
npm install next@latest react@latest react-dom@latest typescript
npm install prisma @prisma/client
npm install socket.io socket.io-client
npm install next-intl

# UI & styling
npm install tailwindcss postcss autoprefixer
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react tw-animate-css
npm install next-themes

# Auth & security
npm install bcrypt jose zod
npm install @types/bcrypt --save-dev

# Forms & UX
npm install react-hook-form @hookform/resolvers
npm install sonner

# Email
npm install resend
```

## Architecture Patterns

### Recommended Project Structure
```
game-site/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth route group (login, register, setup)
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── setup/         # First-time admin setup
│   │   ├── (app)/             # Main app route group (requires auth)
│   │   │   ├── layout.tsx     # App shell with sidebar
│   │   │   ├── page.tsx       # Lobby placeholder
│   │   │   └── admin/         # Admin dashboard routes
│   │   ├── api/
│   │   │   └── socket/        # Socket.IO handler
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles with CSS variables
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── auth/              # Auth-specific components
│   │   ├── layout/            # AppShell, Sidebar, etc.
│   │   └── admin/             # Admin dashboard components
│   ├── lib/
│   │   ├── actions/           # Server Actions (auth, admin)
│   │   ├── db/                # Prisma client singleton
│   │   ├── auth/              # Auth utilities (session, DAL)
│   │   ├── socket/            # Socket.IO client/server utilities
│   │   ├── email/             # Email templates and sender
│   │   └── utils.ts           # cn() helper and other utilities
│   ├── types/                 # Shared TypeScript types
│   └── messages/              # i18n translation files
│       └── de.json            # German translations
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Generated migrations
├── server.js                  # Custom Node.js server (Next.js + Socket.IO)
├── components.json            # shadcn/ui config
└── next.config.js             # Next.js config
```

### Pattern 1: Custom Authentication with Server Actions
**What:** Next.js official pattern for authentication using Server Actions, stateless JWT sessions, and Data Access Layer (DAL).
**When to use:** For custom auth flows like invite-based registration where third-party auth libraries are overkill.
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/authentication

// lib/auth/session.ts
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secretKey = process.env.SESSION_SECRET!
const encodedKey = new TextEncoder().encode(secretKey)

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await new SignJWT({ userId, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)

  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function verifySession() {
  const cookie = (await cookies()).get('session')?.value
  if (!cookie) return null

  try {
    const { payload } = await jwtVerify(cookie, encodedKey, {
      algorithms: ['HS256'],
    })
    return { userId: payload.userId as string }
  } catch (error) {
    return null
  }
}

// lib/auth/dal.ts (Data Access Layer)
import { cache } from 'react'
import { verifySession } from './session'
import { redirect } from 'next/navigation'

export const getSession = cache(async () => {
  const session = await verifySession()
  if (!session) redirect('/login')
  return session
})
```

### Pattern 2: Socket.IO with Next.js Custom Server
**What:** Sharing HTTP server between Next.js and Socket.IO for real-time communication.
**When to use:** When you need WebSocket support with Next.js (cannot deploy to Vercel).
**Example:**
```javascript
// Source: https://socket.io/how-to/use-with-nextjs

// server.js
import { createServer } from 'node:http'
import next from 'next'
import { Server } from 'socket.io'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000

const app = next({ dev, hostname, port })
const handler = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(handler)
  const io = new Server(httpServer)

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})

// app/components/SocketProvider.tsx (client)
'use client'
import { createContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export const SocketContext = createContext<Socket | null>(null)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const socketInstance = io()
    setSocket(socketInstance)
    return () => { socketInstance.disconnect() }
  }, [])

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  )
}
```

### Pattern 3: Invite Token Generation
**What:** Cryptographically secure token generation for invite links using Node.js crypto module.
**When to use:** For email invitations and registration links that must be secure and time-limited.
**Example:**
```typescript
// Source: https://nodejs.org/api/crypto.html

import { randomBytes } from 'crypto'
import { db } from '@/lib/db'

export async function createInvite(email: string, createdBy: string) {
  // Generate cryptographically secure token (32 bytes = 64 hex chars)
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await db.invite.create({
    data: {
      email,
      token,
      expiresAt,
      createdBy,
    },
  })

  return { token, expiresAt }
}

export async function validateInvite(token: string) {
  const invite = await db.invite.findUnique({
    where: { token },
  })

  if (!invite) return { valid: false, reason: 'not-found' }
  if (invite.usedAt) return { valid: false, reason: 'already-used' }
  if (invite.expiresAt < new Date()) return { valid: false, reason: 'expired' }

  return { valid: true, invite }
}
```

### Pattern 4: Server Actions for Form Submission
**What:** Using Server Actions with useActionState for form handling and validation.
**When to use:** For all form submissions (login, register, invite) to keep auth logic server-side.
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/authentication

// lib/actions/auth.ts
'use server'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { createSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function login(prevState: any, formData: FormData) {
  const validatedFields = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { email, password } = validatedFields.data
  const user = await db.user.findUnique({ where: { email } })

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { errors: { email: ['Ungültige Anmeldedaten'] } }
  }

  if (user.bannedAt) {
    return { errors: { email: ['Dein Account wurde gesperrt'] } }
  }

  await createSession(user.id)
  redirect('/')
}

// app/(auth)/login/page.tsx
'use client'
import { useActionState } from 'react'
import { login } from '@/lib/actions/auth'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <form action={action}>
      <input type="email" name="email" required />
      {state?.errors?.email && <p>{state.errors.email}</p>}

      <input type="password" name="password" required />
      {state?.errors?.password && <p>{state.errors.password}</p>}

      <button disabled={pending}>Anmelden</button>
    </form>
  )
}
```

### Pattern 5: WebSocket Reconnection with Exponential Backoff
**What:** Implementing robust reconnection logic with exponential backoff and jitter to prevent server overload.
**When to use:** Essential for game state synchronization where connection reliability is critical.
**Example:**
```typescript
// Source: https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view

import { useEffect, useState } from 'react'
import { Socket } from 'socket.io-client'

export function useSocketWithReconnect(socket: Socket | null) {
  const [isConnected, setIsConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  useEffect(() => {
    if (!socket) return

    // Reconnection config with exponential backoff
    socket.io.reconnectionDelay(1000)        // Initial delay: 1s
    socket.io.reconnectionDelayMax(30000)    // Max delay: 30s
    socket.io.reconnectionAttempts(Infinity) // Infinite attempts
    socket.io.randomizationFactor(0.1)       // 10% jitter

    const onConnect = () => {
      setIsConnected(true)
      setReconnectAttempts(0)
    }

    const onDisconnect = () => {
      setIsConnected(false)
    }

    const onReconnectAttempt = (attempt: number) => {
      setReconnectAttempts(attempt)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.io.on('reconnect_attempt', onReconnectAttempt)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.io.off('reconnect_attempt', onReconnectAttempt)
    }
  }, [socket])

  return { isConnected, reconnectAttempts }
}
```

### Pattern 6: Internationalization with next-intl
**What:** Setting up German language support with next-intl for App Router.
**When to use:** Required for this project - entire UI must be in German.
**Example:**
```typescript
// Source: https://next-intl.dev/docs/getting-started/app-router

// next.config.js
const createNextIntlPlugin = require('next-intl/plugin')
const withNextIntl = createNextIntlPlugin()

module.exports = withNextIntl({
  // Your Next.js config
})

// i18n.ts
import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async () => {
  return {
    locale: 'de',
    messages: (await import(`./messages/de.json`)).default
  }
})

// messages/de.json
{
  "auth": {
    "login": "Anmelden",
    "register": "Registrieren",
    "email": "E-Mail",
    "password": "Passwort",
    "invalidCredentials": "Ungültige Anmeldedaten"
  },
  "admin": {
    "dashboard": "Admin-Dashboard",
    "users": "Nutzer",
    "inviteUser": "Nutzer einladen"
  }
}

// Usage in components
import { useTranslations } from 'next-intl'

export function LoginForm() {
  const t = useTranslations('auth')
  return <button>{t('login')}</button>
}
```

### Anti-Patterns to Avoid
- **Storing JWT in localStorage:** Creates XSS vulnerability. Always use httpOnly cookies.
- **Auth checks only in layouts:** Due to partial rendering, layouts don't re-render on navigation. Check auth in DAL functions and leaf components.
- **Returning null from layout if unauthorized:** Next.js has multiple entry points; this won't protect nested routes or Server Actions.
- **Client-side only auth checks:** Security decisions must happen server-side. Client checks are UX only.
- **Using middleware for database queries:** Middleware runs on every prefetch request. Only use for cookie-based optimistic checks.
- **Synchronous bcrypt:** Blocks event loop. Always use `bcrypt.hash()` and `bcrypt.compare()` (async versions).
- **Hardcoding secrets:** Store SESSION_SECRET and email API keys in `.env.local`, never commit to git.
- **Socket.IO without custom server:** Next.js default server doesn't support WebSockets. Must use custom server.js.
- **No reconnection strategy:** WebSocket connections drop. Implement exponential backoff with jitter.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management | Custom session storage and encryption | jose + httpOnly cookies pattern from Next.js docs | JWT signing/verification is complex, easy to get wrong. Jose is Edge Runtime compatible, well-tested. |
| Password hashing | Custom hash implementation | bcrypt with 10-12 salt rounds | bcrypt is battle-tested, includes salt generation, resistant to rainbow table attacks. Rolling your own crypto is dangerous. |
| Form validation | Manual validation logic | zod + React Hook Form | Type-safe runtime validation, automatic TypeScript inference, reusable schemas for client and server. |
| Toast notifications | Custom notification system | sonner | Handles stacking, positioning, animations, auto-dismiss, promise states. Very lightweight (~5KB). |
| WebSocket reconnection | Manual retry logic | Socket.IO built-in reconnection | Exponential backoff with jitter, connection state management, automatic room rejoining already implemented. |
| Dark mode | Custom theme switching | next-themes | Prevents flash on load, handles system preference, localStorage persistence, no flicker on SSR. |
| Email templates | String concatenation HTML | React Email (optional, works with Resend) | Type-safe email templates as React components, preview mode, good defaults for email clients. |
| Invite token generation | `Math.random()` or `Date.now()` | `crypto.randomBytes()` | Cryptographically secure randomness from OS. Math.random() is predictable and insecure for tokens. |
| Database queries | Raw SQL strings | Prisma | Type-safe queries, automatic migrations, excellent DX. Prevents SQL injection, catches errors at compile time. |
| Responsive UI | Custom media queries | Tailwind responsive modifiers + shadcn/ui | Mobile-first utilities (sm:, md:, lg:), consistent breakpoints, battle-tested responsive patterns. |

**Key insight:** Authentication and real-time infrastructure have too many edge cases and security implications to build from scratch. Use established patterns and libraries. The time saved on not debugging subtle session bugs or reconnection race conditions is immense.

## Common Pitfalls

### Pitfall 1: Session Not Refreshed on Activity
**What goes wrong:** User's session expires while actively using the app, forcing unexpected logout.
**Why it happens:** JWT has expiration time but no mechanism to extend it automatically. Developer forgets to implement session refresh logic.
**How to avoid:** Implement session refresh in middleware or layout that updates expiration on each request:
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value
  if (session) {
    const payload = await decrypt(session)
    if (payload) {
      // Refresh session expiration
      const res = NextResponse.next()
      res.cookies.set('session', await encrypt({
        ...payload,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }), {
        httpOnly: true,
        secure: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      return res
    }
  }
  return NextResponse.next()
}
```
**Warning signs:** Users report getting logged out while actively playing, session expiration complaints.

### Pitfall 2: Race Condition on First Admin Setup
**What goes wrong:** Multiple users access `/setup` simultaneously, creating multiple admin accounts.
**Why it happens:** Check for existing users and user creation are separate operations without transaction or lock.
**How to avoid:** Use database unique constraint on admin role and handle error, or use transaction:
```typescript
// lib/actions/setup.ts
export async function setupAdmin(data: SetupData) {
  // Check if any user exists (race condition window here)
  const existingUsers = await db.user.count()
  if (existingUsers > 0) {
    return { error: 'Setup already completed' }
  }

  // Better: use unique constraint and try/catch
  try {
    await db.user.create({
      data: {
        ...data,
        role: 'ADMIN', // Unique constraint on role='ADMIN' in schema
      }
    })
  } catch (error) {
    if (error.code === 'P2002') { // Prisma unique constraint violation
      return { error: 'Admin already exists' }
    }
    throw error
  }
}
```
**Warning signs:** Multiple admin accounts in database after first setup, confusion about who is "real" admin.

### Pitfall 3: Invite Link Reuse After Registration
**What goes wrong:** Invite token can be used multiple times to create accounts, or token isn't marked as used.
**Why it happens:** Developer forgets to mark token as used or doesn't validate `usedAt` field.
**How to avoid:** Mark token as used in same transaction as user creation:
```typescript
export async function registerWithInvite(token: string, data: RegisterData) {
  const invite = await validateInvite(token) // checks usedAt, expiresAt
  if (!invite.valid) return { error: invite.reason }

  // Use transaction to mark invite as used atomically
  await db.$transaction([
    db.user.create({
      data: { ...data, email: invite.invite.email }
    }),
    db.invite.update({
      where: { token },
      data: { usedAt: new Date() }
    })
  ])
}
```
**Warning signs:** Multiple accounts created with same invite token, invite tokens working after user registered.

### Pitfall 4: Socket.IO Connection Before Authentication
**What goes wrong:** Unauthenticated users can connect to Socket.IO and potentially access game rooms.
**Why it happens:** Socket.IO connection doesn't verify session cookie or user authentication.
**How to avoid:** Verify session in Socket.IO connection middleware:
```typescript
// server.js
io.use(async (socket, next) => {
  const sessionCookie = socket.request.headers.cookie
    ?.split('; ')
    .find(c => c.startsWith('session='))
    ?.split('=')[1]

  if (!sessionCookie) {
    return next(new Error('Authentication required'))
  }

  try {
    const payload = await verifySession(sessionCookie)
    socket.data.userId = payload.userId
    next()
  } catch (error) {
    next(new Error('Invalid session'))
  }
})
```
**Warning signs:** Unauthenticated WebSocket connections in logs, security concerns about room access.

### Pitfall 5: No Loading State During Server Action
**What goes wrong:** Form submits, nothing happens for 1-2 seconds, user clicks again creating duplicate requests.
**Why it happens:** Forgetting to use `pending` state from `useActionState` to disable button and show loading.
**How to avoid:** Always use `pending` state to disable form and show feedback:
```typescript
const [state, action, pending] = useActionState(loginAction, undefined)

return (
  <form action={action}>
    <button disabled={pending}>
      {pending ? 'Anmelden...' : 'Anmelden'}
    </button>
  </form>
)
```
**Warning signs:** Users report "double clicks", duplicate user records, frustrated UX feedback.

### Pitfall 6: WebSocket State Not Synced After Reconnection
**What goes wrong:** User reconnects after disconnect, but game state is stale or missing.
**Why it happens:** No state recovery mechanism after reconnect. Server doesn't resend current state.
**How to avoid:** Request state snapshot on reconnect:
```typescript
socket.on('connect', () => {
  // On initial connect or reconnect, request current state
  socket.emit('request-state')
})

socket.on('state-snapshot', (state) => {
  // Restore full state
  setGameState(state)
})
```
**Warning signs:** Users report "state loss" after network hiccup, games get "stuck" after reconnect.

### Pitfall 7: Banned User Can Still Access Via Existing Session
**What goes wrong:** Admin bans user, but user continues playing with active session until it expires.
**Why it happens:** Session verification only checks if session is valid, not if user is currently banned.
**How to avoid:** Check `bannedAt` field in DAL session verification:
```typescript
export const getSession = cache(async () => {
  const session = await verifySession()
  if (!session) redirect('/login')

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, bannedAt: true }
  })

  if (!user || user.bannedAt) {
    await deleteSession()
    redirect('/login')
  }

  return { userId: user.id }
})
```
**Warning signs:** Banned users still playing, admin confusion about ban effectiveness, delayed ban enforcement.

### Pitfall 8: Email Sending Blocks Request
**What goes wrong:** Invite creation takes 2-3 seconds because email sending happens synchronously.
**Why it happens:** Email API call happens in Server Action before returning response.
**How to avoid:** Send emails asynchronously or use queue (for v1, async is sufficient):
```typescript
export async function inviteUser(email: string) {
  const { token } = await createInvite(email, userId)

  // Don't await email sending - fire and forget
  sendInviteEmail(email, token).catch(error => {
    console.error('Failed to send invite email:', error)
    // Consider retry logic or queue for production
  })

  return { success: true, message: 'Einladung erstellt' }
}
```
**Warning signs:** Slow admin dashboard, "loading" spinners for 2-3 seconds on simple actions, timeout errors.

## Code Examples

Verified patterns from official sources:

### Database Schema (Prisma)
```prisma
// Source: https://www.prisma.io/docs/guides/authjs-nextjs
// Adapted for invite-based auth

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  username      String    @unique
  displayName   String
  passwordHash  String
  role          Role      @default(USER)
  createdAt     DateTime  @default(now())
  bannedAt      DateTime?
  bannedReason  String?

  createdInvites Invite[] @relation("CreatedBy")
}

model Invite {
  id        String    @id @default(cuid())
  email     String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  createdBy   String
  creator     User     @relation("CreatedBy", fields: [createdBy], references: [id])

  @@index([token])
  @@index([email])
}

enum Role {
  ADMIN
  USER
}
```

### Toast Notification Pattern
```typescript
// Source: https://ui.shadcn.com/docs/components/sonner

// app/layout.tsx (add to root layout)
import { Toaster } from 'sonner'

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}

// Usage anywhere in app (client or server component)
import { toast } from 'sonner'

// Client component
function LoginForm() {
  const handleSubmit = async () => {
    const result = await loginAction(formData)
    if (result.error) {
      toast.error('Anmeldung fehlgeschlagen', {
        description: result.error
      })
    } else {
      toast.success('Erfolgreich angemeldet')
    }
  }
}

// Server Action
'use server'
export async function deleteUser(userId: string) {
  await db.user.delete({ where: { id: userId } })

  // Can call toast from Server Action via revalidate + redirect
  // Or return message and show toast in client
  return { message: 'Nutzer gelöscht' }
}
```

### Environment Variables
```bash
# .env.local (NEVER commit this file)

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gamesite"

# Session
SESSION_SECRET="generate-with-openssl-rand-base64-32"

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxx"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router + API Routes | App Router + Server Actions | Next.js 13+ (2023) | Server Actions provide secure server-side mutations without API routes. Simpler auth patterns. |
| NextAuth.js v4 | Auth.js v5 (NextAuth rebrand) | Late 2024 | Universal `auth()` function, App Router-first design. Still overkill for simple invite auth. |
| client-side i18n (react-i18next) | Server-side i18n (next-intl) | App Router era (2023+) | Better SSR support, no language flash, server component compatibility. |
| Tailwind v3 (tailwind.config.js) | Tailwind v4 (CSS-first config) | 2025 | Configuration in CSS file (@theme), simpler setup, no more JS config file bloat. |
| tailwindcss-animate plugin | tw-animate-css | Tailwind v4 (2025) | New animation plugin compatible with v4 architecture, installed by default in shadcn/ui. |
| iron-session | jose for JWTs | Next.js official recommendation (2025+) | Edge Runtime compatibility, simpler API, Next.js docs use jose as example. |
| Prisma 4 (Rust query engine) | Prisma 5-7 (TypeScript query engine) | Late 2025 | Pure TypeScript, smaller bundle, better edge compatibility. Still schema-first. |
| Custom WebSocket auth | Socket.IO middleware auth | Socket.IO v4+ | Built-in middleware makes auth check easier, cleaner separation of concerns. |

**Deprecated/outdated:**
- **getServerSideProps/getStaticProps:** Replaced by async Server Components and `fetch` with caching
- **API Routes for mutations:** Replaced by Server Actions for most use cases
- **next-i18next:** Still works but next-intl is purpose-built for App Router
- **iron-session for stateless sessions:** jose is simpler and Edge Runtime compatible
- **Class components:** Function components with Hooks are standard
- **Vercel deployment with WebSockets:** Not possible. Socket.IO requires custom server (VPS/container deployment)

## Open Questions

Things that couldn't be fully resolved:

1. **Email deliverability in production**
   - What we know: Resend has good free tier, works for transactional emails
   - What's unclear: Will emails land in spam for personal domain? Does SPF/DKIM setup require DNS configuration?
   - Recommendation: Test with real domain in staging. May need to configure SPF/DKIM records. Consider using Resend's shared domain for v1 if personal domain has deliverability issues.

2. **WebSocket scaling for multi-instance deployment**
   - What we know: Socket.IO requires sticky sessions for multi-instance. For single instance on VPS, not an issue.
   - What's unclear: What's the best approach if we eventually need horizontal scaling?
   - Recommendation: Single instance is fine for 20-100 users. If scaling needed later, use Socket.IO Redis adapter for multi-instance support. Not a Phase 1 concern.

3. **Session duration best practices for game site**
   - What we know: 7 days is common, Next.js examples use this
   - What's unclear: Should gaming sessions be longer (30 days) or shorter (24 hours with refresh)?
   - Recommendation: Start with 7 days. Can adjust based on user feedback. Implement session refresh on activity so users don't get logged out mid-game.

4. **PostgreSQL hosting for solo developer**
   - What we know: Need PostgreSQL instance. Options: local, Neon (serverless), Railway, Supabase
   - What's unclear: What's most cost-effective for 20-100 user community?
   - Recommendation: Neon free tier (0.5GB storage) sufficient for v1. Railway or Supabase if Neon limits hit. Self-hosted PostgreSQL on VPS if already running Node server there.

## Sources

### Primary (HIGH confidence)
- Next.js Authentication Guide - https://nextjs.org/docs/app/guides/authentication
- Socket.IO Next.js Integration - https://socket.io/how-to/use-with-nextjs
- shadcn/ui Manual Installation - https://ui.shadcn.com/docs/installation/manual
- Prisma Auth.js Guide - https://www.prisma.io/docs/guides/authjs-nextjs
- Prisma Better Auth Guide - https://www.prisma.io/docs/guides/betterauth-nextjs
- Node.js Crypto Documentation v25.6.1 - https://nodejs.org/api/crypto.html
- next-intl App Router Docs - https://next-intl.dev/docs/getting-started/app-router

### Secondary (MEDIUM confidence)
- WorkOS: Top 5 Next.js Auth Solutions 2026 - https://workos.com/blog/top-authentication-solutions-nextjs-2026
- LogRocket: React Toast Libraries 2025 - https://blog.logrocket.com/react-toast-libraries-compared-2025/
- OneUpTime: WebSocket Reconnection Logic 2026 - https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view
- Mailtrap: Next.js Send Email 2026 - https://mailtrap.io/blog/nextjs-send-email/
- DesignRevision: Prisma vs Drizzle 2026 - https://designrevision.com/blog/prisma-vs-drizzle
- Next.js Templates: Best Databases 2026 - https://nextjstemplates.com/blog/best-database-for-nextjs
- Knock: Top 9 React Notification Libraries 2026 - https://knock.app/blog/the-top-notification-libraries-for-react

### Tertiary (LOW confidence)
- WebSearch results for authentication best practices (multiple sources agreeing)
- WebSearch results for bcrypt best practices (verified with npm docs)
- Community discussions on Socket.IO patterns (consistent recommendations)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified with official Next.js docs, library documentation, and Context7
- Architecture: HIGH - Patterns directly from Next.js authentication guide and Socket.IO official integration
- Pitfalls: MEDIUM-HIGH - Based on Next.js security blog, official docs warnings, and common community issues
- Code examples: HIGH - All examples sourced from official documentation with URLs provided

**Research date:** 2026-02-11
**Valid until:** 2026-03-15 (30 days - stable ecosystem, Next.js 15 is current stable release)

**Notes:**
- This research assumes deployment to VPS/container platform that supports custom Node.js server (Socket.IO requirement)
- Vercel deployment NOT possible due to WebSocket requirement (no WebSocket support on Vercel)
- All recommendations are for greenfield project with solo developer - enterprise auth libraries (Auth.js, Clerk) not recommended for this simple invite-based use case
- German language support is non-negotiable requirement, all UI strings must use next-intl from start
