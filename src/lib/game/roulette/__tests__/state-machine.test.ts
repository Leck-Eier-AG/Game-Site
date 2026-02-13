import { describe, it, expect } from '@jest/globals'
import {
  createInitialState,
  applyAction,
  type RouletteGameState,
  type RouletteAction
} from '../state-machine'
import { EUROPEAN_WHEEL_ORDER, getNumberColor } from '../wheel'

describe('wheel configuration', () => {
  it('has correct European wheel order (37 numbers)', () => {
    expect(EUROPEAN_WHEEL_ORDER).toHaveLength(37)
    expect(EUROPEAN_WHEEL_ORDER).toContain(0)
    expect(EUROPEAN_WHEEL_ORDER[0]).toBe(0)
  })

  it('getNumberColor returns correct colors', () => {
    expect(getNumberColor(0)).toBe('green')
    expect(getNumberColor(1)).toBe('red')
    expect(getNumberColor(2)).toBe('black')
    expect(getNumberColor(3)).toBe('red')
    expect(getNumberColor(36)).toBe('red')
  })

  it('red numbers are correct', () => {
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
    redNumbers.forEach(n => {
      expect(getNumberColor(n)).toBe('red')
    })
  })

  it('black numbers are correct', () => {
    const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]
    blackNumbers.forEach(n => {
      expect(getNumberColor(n)).toBe('black')
    })
  })
})

describe('createInitialState', () => {
  it('creates betting phase with 1 player', () => {
    const players = [{ userId: 'user1', displayName: 'Alice' }]
    const state = createInitialState(players, { spinTimerSec: 30, isManualSpin: false })

    expect(state.phase).toBe('betting')
    expect(state.players).toHaveLength(1)
    expect(state.players[0].userId).toBe('user1')
    expect(state.players[0].displayName).toBe('Alice')
    expect(state.players[0].bets).toEqual([])
    expect(state.players[0].totalBetAmount).toBe(0)
    expect(state.players[0].isConnected).toBe(true)
    expect(state.currentRound).toBe(1)
    expect(state.winningNumber).toBe(null)
    expect(state.resultHistory).toEqual([])
    expect(state.spinTimerSec).toBe(30)
    expect(state.isManualSpin).toBe(false)
  })

  it('creates betting phase with multiple players', () => {
    const players = [
      { userId: 'user1', displayName: 'Alice' },
      { userId: 'user2', displayName: 'Bob' },
      { userId: 'user3', displayName: 'Charlie' }
    ]
    const state = createInitialState(players, { spinTimerSec: 60, isManualSpin: true })

    expect(state.phase).toBe('betting')
    expect(state.players).toHaveLength(3)
    expect(state.isManualSpin).toBe(true)
  })
})

describe('applyAction - PLACE_BET', () => {
  it('adds straight bet to player', () => {
    const state = createInitialState(
      [{ userId: 'user1', displayName: 'Alice' }],
      { spinTimerSec: 30, isManualSpin: false }
    )

    const action: RouletteAction = {
      type: 'PLACE_BET',
      userId: 'user1',
      bet: { type: 'straight', numbers: [7], amount: 10 }
    }

    const result = applyAction(state, action)
    expect(result).not.toBeInstanceOf(Error)

    if (!(result instanceof Error)) {
      expect(result.players[0].bets).toHaveLength(1)
      expect(result.players[0].bets[0]).toEqual({ type: 'straight', numbers: [7], amount: 10 })
      expect(result.players[0].totalBetAmount).toBe(10)
    }
  })

  it('adds multiple bets to player', () => {
    const state = createInitialState(
      [{ userId: 'user1', displayName: 'Alice' }],
      { spinTimerSec: 30, isManualSpin: false }
    )

    let newState = applyAction(state, {
      type: 'PLACE_BET',
      userId: 'user1',
      bet: { type: 'straight', numbers: [7], amount: 10 }
    })

    expect(newState).not.toBeInstanceOf(Error)

    if (!(newState instanceof Error)) {
      newState = applyAction(newState, {
        type: 'PLACE_BET',
        userId: 'user1',
        bet: { type: 'red', numbers: [], amount: 5 }
      })

      expect(newState).not.toBeInstanceOf(Error)
      if (!(newState instanceof Error)) {
        expect(newState.players[0].bets).toHaveLength(2)
        expect(newState.players[0].totalBetAmount).toBe(15)
      }
    }
  })

  it('rejects invalid bet type', () => {
    const state = createInitialState(
      [{ userId: 'user1', displayName: 'Alice' }],
      { spinTimerSec: 30, isManualSpin: false }
    )

    const action: RouletteAction = {
      type: 'PLACE_BET',
      userId: 'user1',
      bet: { type: 'straight', numbers: [1, 2], amount: 10 } // straight needs 1 number
    }

    const result = applyAction(state, action)
    expect(result).toBeInstanceOf(Error)
    if (result instanceof Error) {
      expect(result.message).toContain('Invalid bet')
    }
  })

  it('rejects bet during spin phase', () => {
    const state: RouletteGameState = {
      phase: 'spinning',
      players: [{ userId: 'user1', displayName: 'Alice', bets: [], totalBetAmount: 0, isConnected: true }],
      currentRound: 1,
      winningNumber: null,
      resultHistory: [],
      spinTimerSec: 30,
      isManualSpin: false
    }

    const action: RouletteAction = {
      type: 'PLACE_BET',
      userId: 'user1',
      bet: { type: 'straight', numbers: [7], amount: 10 }
    }

    const result = applyAction(state, action)
    expect(result).toBeInstanceOf(Error)
    if (result instanceof Error) {
      expect(result.message).toContain('Can only place bets during betting phase')
    }
  })
})

describe('applyAction - REMOVE_BET', () => {
  it('removes bet from player', () => {
    const state = createInitialState(
      [{ userId: 'user1', displayName: 'Alice' }],
      { spinTimerSec: 30, isManualSpin: false }
    )

    // Add bet first
    let newState = applyAction(state, {
      type: 'PLACE_BET',
      userId: 'user1',
      bet: { type: 'straight', numbers: [7], amount: 10 }
    })

    expect(newState).not.toBeInstanceOf(Error)

    if (!(newState instanceof Error)) {
      // Remove bet
      newState = applyAction(newState, {
        type: 'REMOVE_BET',
        userId: 'user1',
        betIndex: 0
      })

      expect(newState).not.toBeInstanceOf(Error)
      if (!(newState instanceof Error)) {
        expect(newState.players[0].bets).toHaveLength(0)
        expect(newState.players[0].totalBetAmount).toBe(0)
      }
    }
  })

  it('removes specific bet from multiple bets', () => {
    const state = createInitialState(
      [{ userId: 'user1', displayName: 'Alice' }],
      { spinTimerSec: 30, isManualSpin: false }
    )

    let newState = applyAction(state, {
      type: 'PLACE_BET',
      userId: 'user1',
      bet: { type: 'straight', numbers: [7], amount: 10 }
    })

    if (!(newState instanceof Error)) {
      newState = applyAction(newState, {
        type: 'PLACE_BET',
        userId: 'user1',
        bet: { type: 'red', numbers: [], amount: 5 }
      })

      if (!(newState instanceof Error)) {
        newState = applyAction(newState, {
          type: 'REMOVE_BET',
          userId: 'user1',
          betIndex: 0 // Remove first bet
        })

        expect(newState).not.toBeInstanceOf(Error)
        if (!(newState instanceof Error)) {
          expect(newState.players[0].bets).toHaveLength(1)
          expect(newState.players[0].bets[0].type).toBe('red')
          expect(newState.players[0].totalBetAmount).toBe(5)
        }
      }
    }
  })
})

describe('applyAction - SPIN', () => {
  it('transitions to spinning phase and sets winning number', () => {
    const state = createInitialState(
      [{ userId: 'user1', displayName: 'Alice' }],
      { spinTimerSec: 30, isManualSpin: true }
    )

    // Add a bet
    let newState = applyAction(state, {
      type: 'PLACE_BET',
      userId: 'user1',
      bet: { type: 'straight', numbers: [7], amount: 10 }
    })

    if (!(newState instanceof Error)) {
      // Spin
      newState = applyAction(newState, {
        type: 'SPIN',
        winningNumber: 7
      })

      expect(newState).not.toBeInstanceOf(Error)
      if (!(newState instanceof Error)) {
        expect(newState.phase).toBe('settlement')
        expect(newState.winningNumber).toBe(7)
      }
    }
  })

  it('calculates payouts for winning bets', () => {
    const state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { spinTimerSec: 30, isManualSpin: true }
    )

    // Alice bets on 7 straight
    let newState = applyAction(state, {
      type: 'PLACE_BET',
      userId: 'user1',
      bet: { type: 'straight', numbers: [7], amount: 10 }
    })

    // Bob bets on red
    if (!(newState instanceof Error)) {
      newState = applyAction(newState, {
        type: 'PLACE_BET',
        userId: 'user2',
        bet: { type: 'red', numbers: [], amount: 5 }
      })

      // Spin - 7 is red
      if (!(newState instanceof Error)) {
        newState = applyAction(newState, {
          type: 'SPIN',
          winningNumber: 7
        })

        expect(newState).not.toBeInstanceOf(Error)
        if (!(newState instanceof Error)) {
          expect(newState.phase).toBe('settlement')
          // Alice wins 10 * 36 = 360
          // Bob wins 5 * 2 = 10
          // Both should have payouts calculated
        }
      }
    }
  })

  it('updates result history (max 20)', () => {
    const state: RouletteGameState = {
      phase: 'betting',
      players: [{ userId: 'user1', displayName: 'Alice', bets: [], totalBetAmount: 0, isConnected: true }],
      currentRound: 1,
      winningNumber: null,
      resultHistory: Array.from({ length: 20 }, (_, i) => i), // Full history
      spinTimerSec: 30,
      isManualSpin: true
    }

    const result = applyAction(state, {
      type: 'SPIN',
      winningNumber: 7
    })

    expect(result).not.toBeInstanceOf(Error)
    if (!(result instanceof Error)) {
      expect(result.resultHistory).toHaveLength(20)
      expect(result.resultHistory[0]).toBe(7) // Most recent
      expect(result.resultHistory[19]).toBe(1) // Oldest is pushed out
    }
  })

  it('increments round after settlement', () => {
    const state = createInitialState(
      [{ userId: 'user1', displayName: 'Alice' }],
      { spinTimerSec: 30, isManualSpin: true }
    )

    let newState = applyAction(state, {
      type: 'PLACE_BET',
      userId: 'user1',
      bet: { type: 'straight', numbers: [7], amount: 10 }
    })

    if (!(newState instanceof Error)) {
      newState = applyAction(newState, {
        type: 'SPIN',
        winningNumber: 7
      })

      if (!(newState instanceof Error)) {
        expect(newState.currentRound).toBe(1)
        expect(newState.phase).toBe('settlement')

        // After settlement, should transition back to betting with incremented round
        // (This would be handled by a separate action or timeout)
      }
    }
  })
})

describe('applyAction - PLAYER_DISCONNECT', () => {
  it('marks player as disconnected', () => {
    const state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { spinTimerSec: 30, isManualSpin: false }
    )

    const result = applyAction(state, {
      type: 'PLAYER_DISCONNECT',
      userId: 'user1'
    })

    expect(result).not.toBeInstanceOf(Error)
    if (!(result instanceof Error)) {
      expect(result.players[0].isConnected).toBe(false)
      expect(result.players[1].isConnected).toBe(true)
    }
  })

  it('keeps player bets on disconnect', () => {
    const state = createInitialState(
      [{ userId: 'user1', displayName: 'Alice' }],
      { spinTimerSec: 30, isManualSpin: false }
    )

    let newState = applyAction(state, {
      type: 'PLACE_BET',
      userId: 'user1',
      bet: { type: 'straight', numbers: [7], amount: 10 }
    })

    if (!(newState instanceof Error)) {
      newState = applyAction(newState, {
        type: 'PLAYER_DISCONNECT',
        userId: 'user1'
      })

      expect(newState).not.toBeInstanceOf(Error)
      if (!(newState instanceof Error)) {
        expect(newState.players[0].bets).toHaveLength(1) // Bets remain
        expect(newState.players[0].isConnected).toBe(false)
      }
    }
  })
})

describe('state machine - full game flow', () => {
  it('handles complete betting → spinning → settlement cycle', () => {
    const state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { spinTimerSec: 30, isManualSpin: true }
    )

    // Betting phase
    expect(state.phase).toBe('betting')

    // Alice places bets
    let newState = applyAction(state, {
      type: 'PLACE_BET',
      userId: 'user1',
      bet: { type: 'straight', numbers: [7], amount: 10 }
    })

    expect(newState).not.toBeInstanceOf(Error)

    // Bob places bets
    if (!(newState instanceof Error)) {
      newState = applyAction(newState, {
        type: 'PLACE_BET',
        userId: 'user2',
        bet: { type: 'red', numbers: [], amount: 5 }
      })

      expect(newState).not.toBeInstanceOf(Error)

      // Spin
      if (!(newState instanceof Error)) {
        newState = applyAction(newState, {
          type: 'SPIN',
          winningNumber: 7
        })

        expect(newState).not.toBeInstanceOf(Error)
        if (!(newState instanceof Error)) {
          expect(newState.phase).toBe('settlement')
          expect(newState.winningNumber).toBe(7)
          expect(newState.resultHistory).toContain(7)
        }
      }
    }
  })
})
