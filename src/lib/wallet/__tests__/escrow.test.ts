import { canTransition, getValidTransitions, EscrowStatus } from '../escrow'

describe('escrow state machine', () => {
  describe('canTransition', () => {
    describe('from PENDING', () => {
      it('should allow PENDING -> LOCKED (game starts)', () => {
        expect(canTransition('PENDING', 'LOCKED')).toBe(true)
      })

      it('should allow PENDING -> RELEASED (player leaves before game starts)', () => {
        expect(canTransition('PENDING', 'RELEASED')).toBe(true)
      })

      it('should NOT allow PENDING -> FORFEITED', () => {
        expect(canTransition('PENDING', 'FORFEITED')).toBe(false)
      })

      it('should NOT allow PENDING -> PENDING', () => {
        expect(canTransition('PENDING', 'PENDING')).toBe(false)
      })
    })

    describe('from LOCKED', () => {
      it('should allow LOCKED -> RELEASED (game ends, payout)', () => {
        expect(canTransition('LOCKED', 'RELEASED')).toBe(true)
      })

      it('should allow LOCKED -> FORFEITED (player leaves mid-game or AFK)', () => {
        expect(canTransition('LOCKED', 'FORFEITED')).toBe(true)
      })

      it('should NOT allow LOCKED -> PENDING', () => {
        expect(canTransition('LOCKED', 'PENDING')).toBe(false)
      })

      it('should NOT allow LOCKED -> LOCKED', () => {
        expect(canTransition('LOCKED', 'LOCKED')).toBe(false)
      })
    })

    describe('from RELEASED', () => {
      it('should NOT allow RELEASED -> any state (terminal)', () => {
        expect(canTransition('RELEASED', 'PENDING')).toBe(false)
        expect(canTransition('RELEASED', 'LOCKED')).toBe(false)
        expect(canTransition('RELEASED', 'RELEASED')).toBe(false)
        expect(canTransition('RELEASED', 'FORFEITED')).toBe(false)
      })
    })

    describe('from FORFEITED', () => {
      it('should NOT allow FORFEITED -> any state (terminal)', () => {
        expect(canTransition('FORFEITED', 'PENDING')).toBe(false)
        expect(canTransition('FORFEITED', 'LOCKED')).toBe(false)
        expect(canTransition('FORFEITED', 'RELEASED')).toBe(false)
        expect(canTransition('FORFEITED', 'FORFEITED')).toBe(false)
      })
    })
  })

  describe('getValidTransitions', () => {
    it('should return valid transitions from PENDING', () => {
      const valid = getValidTransitions('PENDING')
      expect(valid).toHaveLength(2)
      expect(valid).toContain('LOCKED')
      expect(valid).toContain('RELEASED')
    })

    it('should return valid transitions from LOCKED', () => {
      const valid = getValidTransitions('LOCKED')
      expect(valid).toHaveLength(2)
      expect(valid).toContain('RELEASED')
      expect(valid).toContain('FORFEITED')
    })

    it('should return empty array from RELEASED (terminal)', () => {
      const valid = getValidTransitions('RELEASED')
      expect(valid).toHaveLength(0)
    })

    it('should return empty array from FORFEITED (terminal)', () => {
      const valid = getValidTransitions('FORFEITED')
      expect(valid).toHaveLength(0)
    })
  })
})
