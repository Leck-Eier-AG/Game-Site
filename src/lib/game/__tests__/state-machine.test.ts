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

  it('uses ruleset maxRolls when provided', () => {
    const players = [
      { userId: 'user1', displayName: 'Alice' },
      { userId: 'user2', displayName: 'Bob' }
    ]
    const settings = {
      turnTimer: 60,
      afkThreshold: 3,
      kniffelRuleset: { maxRolls: 4 }
    }

    const state = createInitialState(players, settings)

    expect(state.rollsRemaining).toBe(4)
  })

  it('creates scoresheet columns for triple preset', () => {
    const players = [
      { userId: 'user1', displayName: 'Alice' },
      { userId: 'user2', displayName: 'Bob' }
    ]
    const settings = {
      turnTimer: 60,
      afkThreshold: 3,
      kniffelPreset: 'triple'
    }

    const state = createInitialState(players, settings)
    const scoresheet = state.players[0].scoresheet as { columns: Record<string, unknown>[] }

    expect(scoresheet.columns).toHaveLength(3)
  })

  it('initializes duel match state when duel enabled', () => {
    const players = [
      { userId: 'user1', displayName: 'Alice' },
      { userId: 'user2', displayName: 'Bob' }
    ]
    const settings = {
      turnTimer: 60,
      afkThreshold: 3,
      kniffelRuleset: { duelEnabled: true }
    }

    const state = createInitialState(players, settings)

    expect(state.matchState?.mode).toBe('duel')
    expect(state.matchState?.round).toBe(1)
    expect(state.matchState?.roundWinners).toEqual([])
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

  it('runs onBeforeRoll effects', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3 }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState
    state = {
      ...state,
      modifiers: {
        effects: [
          {
            hook: 'onBeforeRoll',
            apply: (s: GameState) => ({ ...s, effectApplied: true })
          }
        ]
      }
    }

    const result = applyAction(state, {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 4, 5, 6, 2]
    }, 'user1')

    expect(result).not.toBeInstanceOf(Error)
    if (!(result instanceof Error)) {
      expect((result as GameState & { effectApplied?: boolean }).effectApplied).toBe(true)
    }
  })

  it('transitions to draft_claim after rolling in draft mode', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3, kniffelRuleset: { draftEnabled: true } }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState

    const result = applyAction(state, {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [3, 4, 5, 6, 2]
    }, 'user1')

    expect(result).not.toBeInstanceOf(Error)
    if (!(result instanceof Error)) {
      expect(result.phase).toBe('draft_claim')
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

  it('scores category into chosen column', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3, kniffelPreset: 'triple' }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState
    state = { ...state, dice: [1, 1, 1, 1, 1], rollsRemaining: 2 }

    const action: GameAction = { type: 'CHOOSE_CATEGORY', category: 'ones', columnIndex: 1 }
    const result = applyAction(state, action, 'user1')

    expect(result).not.toBeInstanceOf(Error)
    if (!(result instanceof Error)) {
      const scoresheet = result.players[0].scoresheet as { columns: Record<string, number>[] }
      expect(scoresheet.columns[1].ones).toBe(5)
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

  it('uses ruleset maxRolls when validating first roll requirement', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      {
        turnTimer: 60,
        afkThreshold: 3,
        kniffelRuleset: { maxRolls: 4 }
      }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState

    const result = applyAction(state, { type: 'CHOOSE_CATEGORY', category: 'threes' }, 'user1')

    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toContain('Must roll at least once')
  })

  it('returns error when scratch is disallowed and score is zero', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      {
        turnTimer: 60,
        afkThreshold: 3,
        kniffelRuleset: { allowScratch: false }
      }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState

    state = applyAction(state, {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [1, 2, 3, 4, 5]
    }, 'user1') as GameState

    const result = applyAction(state, { type: 'CHOOSE_CATEGORY', category: 'fullHouse' }, 'user1')

    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toContain('Scratch not allowed')
  })

  it('allows auto score when scratch is disallowed and speed mode is enabled', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      {
        turnTimer: 60,
        afkThreshold: 3,
        kniffelRuleset: {
          allowScratch: false,
          speedMode: { enabled: true, autoScore: true }
        }
      }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState

    state = applyAction(state, {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [1, 2, 3, 4, 5]
    }, 'user1') as GameState

    const result = applyAction(
      state,
      { type: 'CHOOSE_CATEGORY', category: 'fullHouse', auto: true },
      'user1'
    )

    expect(result).not.toBeInstanceOf(Error)
    if (!(result instanceof Error)) {
      expect(result.players[0].scoresheet.fullHouse).toBe(0)
    }
  })

  it('returns error when category is disabled by ruleset', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      {
        turnTimer: 60,
        afkThreshold: 3,
        kniffelRuleset: {
          categoryRandomizer: {
            enabled: true,
            disabledCategories: ['chance'],
            specialCategories: []
          }
        }
      }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState

    state = applyAction(state, {
      type: 'ROLL_DICE',
      keptDice: [false, false, false, false, false],
      newDice: [1, 2, 3, 4, 5]
    }, 'user1') as GameState

    const result = applyAction(state, { type: 'CHOOSE_CATEGORY', category: 'chance' }, 'user1')

    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toContain('Category disabled')
  })
})

describe('applyAction - USE_JOKER', () => {
  it('consumes joker and adjusts die', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      {
        turnTimer: 60,
        afkThreshold: 3,
        kniffelRuleset: { jokerCount: 1, jokerMaxPerTurn: 1 }
      }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState
    state = { ...state, dice: [1, 2, 3, 4, 5], rollsRemaining: 2 }

    const result = applyAction(state, { type: 'USE_JOKER', dieIndex: 0, delta: 1 }, 'user1')

    expect(result).not.toBeInstanceOf(Error)
    if (!(result instanceof Error)) {
      expect(result.dice[0]).toBe(2)
      expect(result.modifiers?.jokersByUserId?.user1).toBe(0)
    }
  })
})

describe('applyAction - TAKE_RISK_ROLL', () => {
  it('allows risk roll after rolls exhausted', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      {
        turnTimer: 60,
        afkThreshold: 3,
        kniffelRuleset: { riskRollEnabled: true, riskRollThreshold: 24 }
      }
    )

    state = applyAction(state, { type: 'PLAYER_READY' }, 'user1') as GameState
    state = applyAction(state, { type: 'PLAYER_READY' }, 'user2') as GameState
    state = { ...state, dice: [1, 1, 1, 1, 1], rollsRemaining: 0 }

    const result = applyAction(state, {
      type: 'TAKE_RISK_ROLL',
      newDice: [6, 6, 6, 6, 1]
    }, 'user1')

    expect(result).not.toBeInstanceOf(Error)
    if (!(result instanceof Error)) {
      expect(result.dice).toEqual([6, 6, 6, 6, 1])
      expect(result.matchState?.riskDebt).toBe(false)
    }
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

  it('resets rollsRemaining based on ruleset maxRolls', () => {
    let state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      {
        turnTimer: 60,
        afkThreshold: 3,
        kniffelRuleset: { maxRolls: 4 }
      }
    )

    state.phase = 'rolling'
    state.currentPlayerIndex = 0
    state.rollsRemaining = 1

    const newState = advanceTurn(state)

    expect(newState.rollsRemaining).toBe(4)
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

  it('uses column multipliers when determining winner', () => {
    const state = createInitialState(
      [
        { userId: 'user1', displayName: 'Alice' },
        { userId: 'user2', displayName: 'Bob' }
      ],
      { turnTimer: 60, afkThreshold: 3, kniffelPreset: 'triple' }
    )

    state.players[0].scoresheet = { columns: [{ ones: 6 }, {}, {}] }
    state.players[1].scoresheet = { columns: [{}, {}, { ones: 3 }] }

    const newState = checkGameEnd(state)

    expect(newState.winner).toBe('user2')
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
