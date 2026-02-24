import { isCategoryAllowedByConstraints } from '../constraints'

describe('isCategoryAllowedByConstraints', () => {
  it('blocks chance when noChance constraint is present', () => {
    expect(isCategoryAllowedByConstraints(['noChance'], 'chance')).toBe(false)
    expect(isCategoryAllowedByConstraints(['noChance'], 'ones')).toBe(true)
  })
})
