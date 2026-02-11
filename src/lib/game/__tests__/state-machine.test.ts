import { describe, it, expect } from '@jest/globals'
import type { GameState, DiceValue, ScoreCategory } from '@/types/game'
import {
  createInitialState,
  applyAction,
  isValidAction,
  advanceTurn,
  checkGameEnd,
  type GameAction
} from '../state-machine'

describe('createInitialState', () => {
  it('creates initial waiting state with 2 players', () => {
    const players = [
      { userId: 'user1', displayName: 'Alice' },
      { userId: 'user2', displayName: 'Bob' }
    ]
    const settings = { turnTimer: 60, afkThreshold: 3 }

    const state = createInitialState(players, settings)

    expect(state.phase).toBe('waiting')
    expect(state.players).toHaveLength(2)
    expect(state.players[0].userId).toBe('user1')
    expect(state.players[0].displayName).toBe('Alice')
    expect(state.players[0].isReady).toBe(false)
    expect(state.players[0].scoresheet).toEqual({})
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.rollsRemaining).toBe(3)
    expect(state.round).toBe(1)
    expect(state.dice).toEqual([1, 1, 1, 1, 1])
    expect(state.winner).toBe(null)
  })
})

describe('applyAction - PLAYER_READY', () => {
  it('marks player as ready in waiting phase', () => {
    const state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    const action: GameAction = { type: 'PLAYER_READY' }
    const result = applyAction(state, action, 'user1')

    expect(result).not.toBeInstanceOf(Error)
    if (!(result instanceof Error)) {
      expect(result.players[0].isReady).toBe(true)
      expect(result.phase).toBe('waiting') // Not all ready yet
    }
  })

  it('transitions to rolling when all players ready', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    const action: GameAction = { type: 'PLAYER_READY' }
    state = applyAction(state, action, 'user1') as GameState
    state = applyAction(state, action, 'user2') as GameState

    expect(state.phase).toBe('rolling')
  })

  it('returns error if not in waiting phase', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    const action: GameAction = { type: 'PLAYER_READY' }
    state = applyAction(state, action, 'user1') as GameState
    state = applyAction(state, action, 'user2') as GameState // Now in rolling

    const result = applyAction(state, action, 'user1')
    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toContain('Not in waiting phase')
  })
})

describe('applyAction - ROLL_DICE', () => {
  it('rolls dice for current player', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    // Get to rolling phase
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState

    const action: GameAction = {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 4, 5, 6, 2]
    }
    const result = applyAction(state, action, 'user1')

    expect(result).not.toBeInstanceOf(Error)
    if (!(result instanceof Error)) {
      expect(result.dice).toEqual([3, 4, 5, 6, 2])
      expect(result.rollsRemaining).toBe(2)
    }
  })

  it('keeps specified dice when rolling', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState

    // First roll
    state = applyAction(state, {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 3, 5, 6, 2]
    }, 'user1') as GameState

    // Second roll - keep the two 3s
    const action: GameAction = {
      type: 'ROLL_DICE',
      keptDice: [true, true, false, false, false],
      newDice: [1, 1, 3, 4, 5] // newDice indices 2,3,4 will be used
    }
    const result = applyAction(state, action, 'user1')

    expect(result).not.toBeInstanceOf(Error)
    if (!(result instanceof Error)) {
      expect(result.dice[0]).toBe(3) // kept
      expect(result.dice[1]).toBe(3) // kept
      expect(result.dice[2]).toBe(3) // new
      expect(result.dice[3]).toBe(4) // new
      expect(result.dice[4]).toBe(5) // new
    }
  })

  it('returns error if not current player', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState

    const action: GameAction = {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 4, 5, 6, 2]
    }
    const result = applyAction(state, action, 'user2') // user2 not current player

    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toContain('Not your turn')
  })

  it('returns error if no rolls remaining', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState

    // Use all 3 rolls
    state = applyAction(state, {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 4, 5, 6, 2]
    }, 'user1') as GameState

    state = applyAction(state, {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 4, 5, 6, 2]
    }, 'user1') as GameState

    state = applyAction(state, {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 4, 5, 6, 2]
    }, 'user1') as GameState

    // Try 4th roll
    const result = applyAction(state, {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 4, 5, 6, 2]
    }, 'user1')

    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toContain('No rolls remaining')
  })

  it('returns error if not in rolling phase', () => {
    const state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    const action: GameAction = {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 4, 5, 6, 2]
    }
    const result = applyAction(state, action, 'user1')

    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toContain('Not in rolling phase')
  })
})

describe('applyAction - CHOOSE_CATEGORY', () => {
  it('scores category and advances turn', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState

    // Roll dice
    state = applyAction(state, {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 3, 3, 4, 5]
    }, 'user1') as GameState

    const action: GameAction = { type: 'CHOOSE_CATEGORY', category: 'threes' }
    const result = applyAction(state, action, 'user1')

    expect(result).not.toBeInstanceOf(Error)
    if (!(result instanceof Error)) {
      expect(result.players[0].scoresheet.threes).toBe(9) // 3*3
      expect(result.currentPlayerIndex).toBe(1) // Advanced to Bob
      expect(result.rollsRemaining).toBe(3) // Reset
    }
  })

  it('returns error if category already scored', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState

    state = applyAction(state, {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 3, 3, 4, 5]
    }, 'user1') as GameState

    // Score threes
    state = applyAction(state, { type: 'CHOOSE_CATEGORY', category: 'threes' }, 'user1') as GameState

    // Player 2's turn - try to score threes again (shouldn't happen but test validation)
    state = applyAction(state, {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 3, 3, 4, 5]
    }, 'user2') as GameState

    // Go back to player 1 somehow - actually let's finish player 2's turn first
    state = applyAction(state, { type: 'CHOOSE_CATEGORY', category: 'ones' }, 'user2') as GameState

    // Now player 1 again
    state = applyAction(state, {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 3, 3, 4, 5]
    }, 'user1') as GameState

    const result = applyAction(state, { type: 'CHOOSE_CATEGORY', category: 'threes' }, 'user1')

    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toContain('Category already scored')
  })

  it('returns error if not current player', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState

    state = applyAction(state, {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 3, 3, 4, 5]
    }, 'user1') as GameState

    const action: GameAction = { type: 'CHOOSE_CATEGORY', category: 'threes' }
    const result = applyAction(state, action, 'user2') // Not user2's turn

    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toContain('Not your turn')
  })

  it('returns error if no rolls taken yet', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState

    // Try to score without rolling
    const action: GameAction = { type: 'CHOOSE_CATEGORY', category: 'threes' }
    const result = applyAction(state, action, 'user1')

    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toContain('Must roll at least once')
  })
})

describe('advanceTurn', () => {
  it('advances to next player', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    state.phase = 'rolling'
    state.currentPlayerIndex = 0

    const newState = advanceTurn(state)

    expect(newState.currentPlayerIndex).toBe(1)
    expect(newState.rollsRemaining).toBe(3)
  })

  it('wraps around to first player', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    state.phase = 'rolling'
    state.currentPlayerIndex = 1

    const newState = advanceTurn(state)

    expect(newState.currentPlayerIndex).toBe(0)
  })

  it('increments round when all players completed current round', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    state.phase = 'rolling'
    state.round = 1
    state.currentPlayerIndex = 1
    // Both players scored one category
    state.players[0].scoresheet.ones = 5
    state.players[1].scoresheet.twos = 10

    const newState = advanceTurn(state)

    expect(newState.round).toBe(2)
    expect(newState.currentPlayerIndex).toBe(0)
  })
})

describe('checkGameEnd', () => {
  it('sets phase to ended and determines winner', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    // Fill all categories for both players
    state.players[0].scoresheet = {
      ones: 5, twos: 10, threes: 15, fours: 20, fives: 25, sixes: 30,
      threeOfKind: 20, fourOfKind: 25, fullHouse: 25,
      smallStraight: 30, largeStraight: 40, kniffel: 50, chance: 25
    }
    state.players[1].scoresheet = {
      ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18,
      threeOfKind: 15, fourOfKind: 20, fullHouse: 25,
      smallStraight: 30, largeStraight: 40, kniffel: 0, chance: 20
    }

    const newState = checkGameEnd(state)

    expect(newState.phase).toBe('ended')
    expect(newState.winner).toBe('user1') // Alice has higher score
  })
})

describe('isValidAction', () => {
  it('validates ROLL_DICE action', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState

    const action: GameAction = {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 4, 5, 6, 2]
    }

    expect(isValidAction(state, action, 'user1')).toBe(true)
    expect(isValidAction(state, action, 'user2')).toBe(false) // Not their turn
  })

  it('validates CHOOSE_CATEGORY action', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState
    state = applyAction(state, {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 3, 3, 4, 5]
    }, 'user1') as GameState

    const action: GameAction = { type: 'CHOOSE_CATEGORY', category: 'threes' }

    expect(isValidAction(state, action, 'user1')).toBe(true)
    expect(isValidAction(state, action, 'user2')).toBe(false)
  })
})

describe('game flow integration', () => {
  it('completes full game with 2 players and 13 rounds', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    // Get to rolling phase
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState

    const categories: ScoreCategory[] = [
      'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
      'threeOfKind', 'fourOfKind', 'fullHouse',
      'smallStraight', 'largeStraight', 'kniffel', 'chance'
    ]

    // Play 13 rounds
    for (let round = 0; round < 13; round++) {
      // Player 1's turn
      state = applyAction(state, {
        type: 'ROLL_DICE',
        keptDice: [false, false, false, false, false],
        newDice: [1, 2, 3, 4, 5]
      }, 'user1') as GameState

      state = applyAction(state, {
        type: 'CHOOSE_CATEGORY',
        category: categories[round]
      }, 'user1') as GameState

      // Player 2's turn
      state = applyAction(state, {
        type: 'ROLL_DICE',
        keptDice: [false, false, false, false, false],
        newDice: [1, 2, 3, 4, 5]
      }, 'user2') as GameState

      state = applyAction(state, {
        type: 'CHOOSE_CATEGORY',
        category: categories[round]
      }, 'user2') as GameState
    }

    expect(state.phase).toBe('ended')
    expect(state.round).toBe(14) // Advanced past 13
    expect(state.winner).toBeTruthy()
  })
})
