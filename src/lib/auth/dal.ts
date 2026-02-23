import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { verifySession } from './session'
import { prisma } from '@/lib/db'
import type { UserRole } from '@/types'

export interface SessionData {
  userId: string
  role: UserRole
  username: string
  displayName: string
}

export const getSession = cache(async (): Promise<SessionData> => {
  const session = await verifySession()

  if (!session) {
    redirect('/login')
  }

  // Check if user exists and is not banned
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      bannedAt: true,
    },
  })

  // If user not found or banned, clear session and redirect
  if (!user || user.bannedAt) {
    redirect('/login')
  }

  return {
    userId: user.id,
    role: user.role as UserRole,
    username: user.username,
    displayName: user.displayName,
  }
})

export const getOptionalSession = cache(
  async (): Promise<SessionData | null> => {
    const session = await verifySession()

    if (!session) return null

    // Check if user exists and is not banned
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        bannedAt: true,
      },
    })

    // If user not found or banned, clear session
    if (!user || user.bannedAt) {
      return null
    }

    return {
      userId: user.id,
      role: user.role as UserRole,
      username: user.username,
      displayName: user.displayName,
    }
  }
)

export async function requireAdmin(): Promise<SessionData> {
  const session = await getSession()

  if (session.role !== 'ADMIN') {
    redirect('/')
  }

  return session
}
