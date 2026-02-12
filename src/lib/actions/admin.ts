'use server'

import { requireAdmin } from '@/lib/auth/dal'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { sendInviteEmail } from '@/lib/email/invite'

// Validation schemas
const InviteSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  sendEmail: z.boolean().optional(),
  customStartingBalance: z.coerce.number().int().min(0).optional(),
})

const BanUserSchema = z.object({
  userId: z.string().min(1, 'Nutzer-ID erforderlich'),
  reason: z.string().optional(),
})

const UnbanUserSchema = z.object({
  userId: z.string().min(1, 'Nutzer-ID erforderlich'),
})

interface ActionState {
  error?: string
  success?: boolean
  token?: string
  link?: string
}

export async function createInvite(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  try {
    // Check admin access
    const admin = await requireAdmin()

    // Parse and validate form data
    const rawData = {
      email: formData.get('email') as string,
      sendEmail: formData.get('sendEmail') === 'true',
      customStartingBalance: formData.get('customStartingBalance') as string | null,
    }

    const validatedFields = InviteSchema.safeParse(rawData)

    if (!validatedFields.success) {
      return {
        error: validatedFields.error.issues[0]?.message || 'Ungültige Eingabe',
      }
    }

    const { email, sendEmail, customStartingBalance } = validatedFields.data
    const appUrl = (formData.get('origin') as string) || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return { error: 'Ein Nutzer mit dieser E-Mail existiert bereits' }
    }

    // Check if there's already a pending invite
    const existingInvite = await prisma.invite.findFirst({
      where: {
        email: email.toLowerCase(),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    // If pending invite exists, return that link
    if (existingInvite) {
      return {
        success: true,
        token: existingInvite.token,
        link: `${appUrl}/register?token=${existingInvite.token}`,
      }
    }

    // Generate cryptographically secure token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create invite
    await prisma.invite.create({
      data: {
        email: email.toLowerCase(),
        token,
        expiresAt,
        createdBy: admin.userId,
        customStartingBalance: customStartingBalance || null,
      },
    })

    const link = `${appUrl}/register?token=${token}`

    // Send email asynchronously if requested (fire and forget)
    if (sendEmail) {
      sendInviteEmail({
        email: email.toLowerCase(),
        token,
        invitedBy: admin.displayName,
        appUrl,
      }).catch((error) => {
        console.error('Failed to send invite email:', error)
        // Don't fail the request if email fails
      })
    }

    return {
      success: true,
      token,
      link,
    }
  } catch (error) {
    console.error('Create invite error:', error)
    return { error: 'Fehler beim Erstellen der Einladung' }
  }
}

export async function banUser(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  try {
    // Check admin access
    const admin = await requireAdmin()

    // Parse and validate form data
    const rawData = {
      userId: formData.get('userId') as string,
      reason: (formData.get('reason') as string) || undefined,
    }

    const validatedFields = BanUserSchema.safeParse(rawData)

    if (!validatedFields.success) {
      return {
        error: validatedFields.error.issues[0]?.message || 'Ungültige Eingabe',
      }
    }

    const { userId, reason } = validatedFields.data

    // Prevent self-ban
    if (userId === admin.userId) {
      return { error: 'Du kannst dich nicht selbst sperren' }
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!targetUser) {
      return { error: 'Nutzer nicht gefunden' }
    }

    // Prevent banning other admins
    if (targetUser.role === 'ADMIN') {
      return { error: 'Du kannst andere Admins nicht sperren' }
    }

    // Ban user
    await prisma.user.update({
      where: { id: userId },
      data: {
        bannedAt: new Date(),
        bannedReason: reason,
      },
    })

    revalidatePath('/admin')

    return { success: true }
  } catch (error) {
    console.error('Ban user error:', error)
    return { error: 'Fehler beim Sperren des Nutzers' }
  }
}

export async function unbanUser(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  try {
    // Check admin access
    await requireAdmin()

    // Parse and validate form data
    const rawData = {
      userId: formData.get('userId') as string,
    }

    const validatedFields = UnbanUserSchema.safeParse(rawData)

    if (!validatedFields.success) {
      return {
        error: validatedFields.error.issues[0]?.message || 'Ungültige Eingabe',
      }
    }

    const { userId } = validatedFields.data

    // Unban user
    await prisma.user.update({
      where: { id: userId },
      data: {
        bannedAt: null,
        bannedReason: null,
      },
    })

    revalidatePath('/admin')

    return { success: true }
  } catch (error) {
    console.error('Unban user error:', error)
    return { error: 'Fehler beim Entsperren des Nutzers' }
  }
}

export async function getAdminStats() {
  await requireAdmin()

  const [totalUsers, activeUsers, pendingInvites] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { bannedAt: null },
    }),
    prisma.invite.count({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  ])

  return {
    totalUsers,
    activeNow: activeUsers, // v1: just non-banned users (real online count comes later with Socket.IO tracking)
    pendingInvites,
  }
}

export async function getUsers() {
  await requireAdmin()

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      role: true,
      createdAt: true,
      bannedAt: true,
      bannedReason: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return users
}

export async function getInvites() {
  await requireAdmin()

  const invites = await prisma.invite.findMany({
    select: {
      id: true,
      email: true,
      token: true,
      createdAt: true,
      expiresAt: true,
      usedAt: true,
      creator: {
        select: {
          username: true,
          displayName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  })

  return invites
}
