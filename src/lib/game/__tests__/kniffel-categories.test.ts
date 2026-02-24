import { describe, it, expect } from '@jest/globals'
import { getResultsLowerCategories } from '../kniffel-categories'

describe('getResultsLowerCategories', () => {
  it('includes special categories for results display', () => {
    expect(getResultsLowerCategories()).toEqual([
      'threeOfKind',
      'fourOfKind',
      'fullHouse',
      'smallStraight',
      'largeStraight',
      'kniffel',
      'chance',
      'twoPairs',
      'allEven',
      'sumAtLeast24',
    ])
  })
})
