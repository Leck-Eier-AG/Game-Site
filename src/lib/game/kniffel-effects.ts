import type { Effect, EffectHook } from '@/types/game'

type EffectState = {
  modifiers?: {
    effects?: Effect[]
  }
}

export function applyEffects<T extends EffectState>(state: T, hook: EffectHook): T {
  const effects = state.modifiers?.effects ?? []
  return effects.reduce((next, effect) => {
    if (effect.hook !== hook) {
      return next
    }
    return effect.apply(next) as T
  }, state)
}
