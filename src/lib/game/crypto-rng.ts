// Server-only: uses node:crypto for CSPRNG (SPIEL-07)
import { randomInt } from 'node:crypto'
import type { DiceValue, DiceValues } from '@/types/game'

export function rollDice(count: number = 5): DiceValue[] {
  return Array.from({ length: count }, () => randomInt(1, 7) as DiceValue)
}

export function rollFiveDice(): DiceValues {
  return rollDice(5) as DiceValues
}
