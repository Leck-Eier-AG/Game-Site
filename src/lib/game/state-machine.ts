import type {
  GameState,
  GamePhase,
  PlayerState,
  DiceValue,
  DiceValues,
  ScoreCategory,
  KniffelScoresheet,
  KniffelMode,
  TeamInfo,
  KniffelPreset,
  KniffelRuleset
} from '@/types/game'
import { calculateScoreWithRuleset, calculateTotalScore } from './kniffel-rules'
import { resolveKniffelRuleset } from './kniffel-ruleset'

// Action types
export type GameAction =
  | { type: 'PLAYER_READY' }
  | { type: 'ROLL_DICE'; keptDice: boolean[]; newDice: DiceValue[] }
  | { type: 'CHOOSE_CATEGORY'; category: ScoreCategory; auto?: boolean }
  | { type: 'PLAYER_DISCONNECT'; userId: string }
  | { type: 'PLAYER_RECONNECT'; userId: string }

/**
 * Create initial game state in waiting phase
 */
export function createInitialState(
  players: Array<{ userId: string; displayName: string }>,
  settings: {
    turnTimer: number
    afkThreshold: number
    kniffelMode?: KniffelMode
    kniffelPreset?: KniffelPreset
    kniffelRuleset?: Partial<KniffelRuleset>
    teams?: TeamInfo[]
  }
): GameState {
  const teamByUserId = new Map<string, string>()
  for (const team of settings.teams || []) {
    for (const memberUserId of team.memberUserIds) {
      teamByUserId.set(memberUserId, team.id)
    }
  }

  const playerStates: PlayerState[] = players.map(p => ({
    userId: p.userId,
    displayName: p.displayName,
    teamId: teamByUserId.get(p.userId),
    scoresheet: {},
    isReady: false,
    isConnected: true,
    lastActivity: Date.now(),
    consecutiveInactive: 0
  }))

  const ruleset = resolveKniffelRuleset(settings.kniffelPreset || 'classic', settings.kniffelRuleset)

  const maxRolls = ruleset.maxRolls || 3

  return {
    phase: 'waiting',
    kniffelMode: settings.kniffelMode || 'classic',
    ruleset,
    rulesVersion: 1,
    teams: settings.teams || [],
    players: playerStates,
    spectators: [],
    currentPlayerIndex: 0,
    dice: [1, 1, 1, 1, 1],
    keptDice: [false, false, false, false, false],
    rollsRemaining: maxRolls,
    round: 1,
    turnStartedAt: null,
    turnDuration: settings.turnTimer,
    winner: null
  }
}

/**
 * Apply an action to the game state
 * Returns new state or Error if action is invalid
 */
export function applyAction(
  state: GameState,
  action: GameAction,
  userId: string
): GameState | Error {
  // Game ended - no actions allowed
  if (state.phase === 'ended') {
    return new Error('Game is over')
  }

  switch (action.type) {
    case 'PLAYER_READY':
      return handlePlayerReady(state, userId)

    case 'ROLL_DICE':
      return handleRollDice(state, userId, action.keptDice, action.newDice)

    case 'CHOOSE_CATEGORY':
      return handleChooseCategory(state, userId, action.category, action.auto)

    case 'PLAYER_DISCONNECT':
      return handlePlayerDisconnect(state, action.userId)

    case 'PLAYER_RECONNECT':
      return handlePlayerReconnect(state, action.userId)

    default:
      return new Error('Unknown action type')
  }
}

/**
 * Check if an action is valid for the current state
 */
export function isValidAction(
  state: GameState,
  action: GameAction,
  userId: string
): boolean {
  const result = applyAction(state, action, userId)
  return !(result instanceof Error)
}

/**
 * Advance to the next player's turn
 */
export function advanceTurn(state: GameState): GameState {
  const maxRolls = state.ruleset?.maxRolls || 3
  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length

  // Check if we completed a full round
  let newRound = state.round
  if (nextPlayerIndex === 0) {
    // Back to first player - check if round should increment
    const categoriesScored = Object.keys(state.players[0].scoresheet).length
    if (categoriesScored === state.round) {
      newRound = state.round + 1
    }
  }

  const newState: GameState = {
    ...state,
    currentPlayerIndex: nextPlayerIndex,
    rollsRemaining: maxRolls,
    keptDice: [false, false, false, false, false],
    round: newRound,
    turnStartedAt: Date.now()
  }

  // Check if game should end (after round 13)
  if (newRound > 13) {
    return checkGameEnd(newState)
  }

  return newState
}

/**
 * Check if game should end and determine winner
 */
export function checkGameEnd(state: GameState): GameState {
  // Calculate total scores for all players
  const scores = state.players.map(player => ({
    userId: player.userId,
    total: calculateTotalScore(player.scoresheet)
  }))

  // Find winner (highest score)
  const winner = scores.reduce((prev, current) =>
    current.total > prev.total ? current : prev
  )

  return {
    ...state,
    phase: 'ended',
    winner: winner.userId
  }
}

// Action handlers

function handlePlayerReady(state: GameState, userId: string): GameState | Error {
  if (state.phase !== 'waiting') {
    return new Error('Not in waiting phase')
  }

  const playerIndex = state.players.findIndex(p => p.userId === userId)
  if (playerIndex === -1) {
    return new Error('Player not found')
  }

  // Mark player as ready
  const newPlayers = [...state.players]
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    isReady: true
  }

  // Check if all players are ready (minimum 2 players)
  const allReady = newPlayers.length >= 2 && newPlayers.every(p => p.isReady)

  return {
    ...state,
    players: newPlayers,
    phase: allReady ? 'rolling' : 'waiting',
    turnStartedAt: allReady ? Date.now() : null
  }
}

function handleRollDice(
  state: GameState,
  userId: string,
  keptDice: boolean[],
  newDice: DiceValue[]
): GameState | Error {
  // Must be in rolling phase
  if (state.phase !== 'rolling') {
    return new Error('Not in rolling phase')
  }

  // Must be current player
  const currentPlayer = state.players[state.currentPlayerIndex]
  if (currentPlayer.userId !== userId) {
    return new Error('Not your turn')
  }

  // Must have rolls remaining
  if (state.rollsRemaining <= 0) {
    return new Error('No rolls remaining')
  }

  // Apply kept dice logic: keptDice[i] = true keeps state.dice[i], false uses newDice[i]
  const resultDice: DiceValues = [1, 1, 1, 1, 1]

  for (let i = 0; i < 5; i++) {
    if (keptDice[i]) {
      resultDice[i] = state.dice[i] // Keep existing
    } else {
      resultDice[i] = newDice[i] // Use new (same index)
    }
  }

  return {
    ...state,
    dice: resultDice,
    keptDice: [...keptDice],
    rollsRemaining: state.rollsRemaining - 1
  }
}

function handleChooseCategory(
  state: GameState,
  userId: string,
  category: ScoreCategory,
  auto: boolean | undefined
): GameState | Error {
  // Must be in rolling phase
  if (state.phase !== 'rolling') {
    return new Error('Not in rolling phase')
  }

  // Must be current player
  const currentPlayer = state.players[state.currentPlayerIndex]
  if (currentPlayer.userId !== userId) {
    return new Error('Not your turn')
  }

  // Must have rolled at least once
  if (state.rollsRemaining === 3) {
    return new Error('Must roll at least once before scoring')
  }

  // Category must not be scored yet
  if (currentPlayer.scoresheet[category] !== undefined) {
    return new Error('Category already scored')
  }

  // Calculate score
  const ruleset = state.ruleset || resolveKniffelRuleset('classic')

  if (ruleset.categoryRandomizer.enabled) {
    const baseCategories: ScoreCategory[] = [
      'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
      'threeOfKind', 'fourOfKind', 'fullHouse',
      'smallStraight', 'largeStraight', 'kniffel', 'chance'
    ]
    const disabled = new Set(ruleset.categoryRandomizer.disabledCategories)
    const allowed = [...baseCategories, ...ruleset.categoryRandomizer.specialCategories]
      .filter(cat => !disabled.has(cat))

    if (!allowed.includes(category)) {
      return new Error('Category disabled')
    }
  }

  const score = calculateScoreWithRuleset(category, state.dice, ruleset)

  if (!ruleset.allowScratch && score === 0) {
    if (auto && ruleset.speedMode.autoScore) {
      // Allow auto-scoring a zero in speed mode
    } else {
      return new Error('Scratch not allowed')
    }
  }

  // Update player's scoresheet
  const newPlayers = [...state.players]
  newPlayers[state.currentPlayerIndex] = {
    ...currentPlayer,
    scoresheet: {
      ...currentPlayer.scoresheet,
      [category]: score
    }
  }

  const newState: GameState = {
    ...state,
    players: newPlayers
  }

  // Advance turn
  return advanceTurn(newState)
}

function handlePlayerDisconnect(state: GameState, userId: string): GameState | Error {
  const playerIndex = state.players.findIndex(p => p.userId === userId)
  if (playerIndex === -1) {
    return new Error('Player not found')
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    isConnected: false
  }

  return {
    ...state,
    players: newPlayers
  }
}

function handlePlayerReconnect(state: GameState, userId: string): GameState | Error {
  const playerIndex = state.players.findIndex(p => p.userId === userId)
  if (playerIndex === -1) {
    return new Error('Player not found')
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    isConnected: true
  }

  return {
    ...state,
    players: newPlayers
  }
}
