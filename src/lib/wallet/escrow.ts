/**
 * Escrow State Machine
 *
 * Enforces valid escrow state transitions for game betting.
 * States: PENDING, LOCKED, RELEASED, FORFEITED
 */

export type EscrowStatus = 'PENDING' | 'LOCKED' | 'RELEASED' | 'FORFEITED'

/**
 * Transition table defining valid state changes
 */
const VALID_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  PENDING: ['LOCKED', 'RELEASED'],
  LOCKED: ['RELEASED', 'FORFEITED'],
  RELEASED: [],
  FORFEITED: [],
}

/**
 * Check if a transition from one state to another is valid
 */
export function canTransition(from: EscrowStatus, to: EscrowStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

/**
 * Get all valid transitions from a given state
 */
export function getValidTransitions(from: EscrowStatus): EscrowStatus[] {
  return VALID_TRANSITIONS[from]
}

/**
 * Type for describing a state transition with context
 */
export type EscrowTransition = {
  from: EscrowStatus
  to: EscrowStatus
  reason: string
}
