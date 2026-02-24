import { advanceLadderRung } from '../kniffel-ladder'
import { prisma } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  prisma: {
    kniffelLadderProgress: {
      upsert: jest.fn()
    }
  }
}))

describe('advanceLadderRung', () => {
  it('increments rung', async () => {
    const upsert = prisma.kniffelLadderProgress.upsert as jest.Mock
    upsert.mockResolvedValue({ rung: 1 })

    const result = await advanceLadderRung('u1')

    expect(upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      update: { rung: { increment: 1 } },
      create: { userId: 'u1', rung: 1 }
    })
    expect(result.rung).toBe(1)
  })
})
