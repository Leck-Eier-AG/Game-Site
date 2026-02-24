import { prisma } from '@/lib/db'

export async function advanceLadderRung(userId: string) {
  return prisma.kniffelLadderProgress.upsert({
    where: { userId },
    update: { rung: { increment: 1 } },
    create: { userId, rung: 1 }
  })
}
