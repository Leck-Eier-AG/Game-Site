import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.SESSION_SECRET!
const encodedKey = new TextEncoder().encode(secretKey)

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/setup']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Skip middleware for static files, API routes, and Next.js internals
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.includes('.')
  ) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('session')?.value

  // For public routes
  if (publicRoutes.includes(path)) {
    // If already logged in, redirect away from login/register
    if (sessionCookie && (path === '/login' || path === '/register')) {
      try {
        await jwtVerify(sessionCookie, encodedKey, { algorithms: ['HS256'] })
        return NextResponse.redirect(new URL('/', request.url))
      } catch {
        // Invalid session, allow access to login/register
        return NextResponse.next()
      }
    }

    // Allow access to public routes
    return NextResponse.next()
  }

  // For protected routes, require valid session
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // Verify session and refresh it
    const { payload } = await jwtVerify(sessionCookie, encodedKey, {
      algorithms: ['HS256'],
    })

    // Refresh session expiry
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const response = NextResponse.next()

    // Re-sign the token with updated expiration
    const { SignJWT } = await import('jose')
    const newSession = await new SignJWT({
      userId: payload.userId,
      role: payload.role,
      expiresAt: expiresAt.toISOString(),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(encodedKey)

    response.cookies.set('session', newSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      sameSite: 'lax',
      path: '/',
    })

    return response
  } catch (error) {
    // Invalid session, redirect to login
    console.error('Middleware session verification failed:', error)
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
