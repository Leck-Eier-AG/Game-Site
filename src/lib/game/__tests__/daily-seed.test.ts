import { seedFromUtcDate } from '../daily-seed'

describe('seedFromUtcDate', () => {
  it('is deterministic for the same date', () => {
    expect(seedFromUtcDate('2026-02-24')).toBe(seedFromUtcDate('2026-02-24'))
  })
})
