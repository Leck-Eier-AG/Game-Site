import { prisma } from '@/lib/db'

export async function upsertDailyScore(userId: string, date: string, value: number) {
  const existing = await prisma.dailyChallengeScore.findUnique({
    where: { userId_date: { userId, date } }
  })

  if (!existing) {
    return prisma.dailyChallengeScore.create({
      data: { userId, date, value }
    })
  }

  if (value <= existing.value) {
    return existing
  }

  return prisma.dailyChallengeScore.update({
    where: { userId_date: { userId, date } },
    data: { value }
  })
}
