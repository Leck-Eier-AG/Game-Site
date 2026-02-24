import { applyEffects } from '../kniffel-effects'

describe('applyEffects', () => {
  it('returns unchanged state with no effects', () => {
    const state = { dice: [1, 2, 3, 4, 5] }
    expect(applyEffects(state, 'onBeforeRoll')).toEqual(state)
  })
})
