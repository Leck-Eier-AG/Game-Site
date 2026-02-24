import { upsertDailyScore } from '../daily-challenge'
import { prisma } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  prisma: {
    dailyChallengeScore: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    }
  }
}))

describe('upsertDailyScore', () => {
  it('creates a score when none exists', async () => {
    const create = prisma.dailyChallengeScore.create as jest.Mock
    const findUnique = prisma.dailyChallengeScore.findUnique as jest.Mock

    findUnique.mockResolvedValue(null)
    create.mockResolvedValue({ value: 200 })

    const result = await upsertDailyScore('u1', '2026-02-24', 200)

    expect(findUnique).toHaveBeenCalledWith({ where: { userId_date: { userId: 'u1', date: '2026-02-24' } } })
    expect(create).toHaveBeenCalledWith({ data: { userId: 'u1', date: '2026-02-24', value: 200 } })
    expect(result.value).toBe(200)
  })

  it('updates when new score is higher', async () => {
    const findUnique = prisma.dailyChallengeScore.findUnique as jest.Mock
    const update = prisma.dailyChallengeScore.update as jest.Mock

    findUnique.mockResolvedValue({ value: 150 })
    update.mockResolvedValue({ value: 200 })

    const result = await upsertDailyScore('u1', '2026-02-24', 200)

    expect(update).toHaveBeenCalledWith({
      where: { userId_date: { userId: 'u1', date: '2026-02-24' } },
      data: { value: 200 }
    })
    expect(result.value).toBe(200)
  })
})
