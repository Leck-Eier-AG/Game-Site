/**
 * Roulette game state machine
 * Pure functional state transitions for European roulette
 */

import { validateBet, calculateBetPayout, type RouletteBetType } from './bet-validator'

export type RoulettePhase = 'betting' | 'spinning' | 'settlement'

export interface RouletteBet {
  type: RouletteBetType
  numbers: number[]
  amount: number
}

export interface RoulettePlayer {
  userId: string
  displayName: string
  bets: RouletteBet[]
  totalBetAmount: number
  isConnected: boolean
}

export interface RouletteGameState {
  phase: RoulettePhase
  players: RoulettePlayer[]
  currentRound: number
  winningNumber: number | null
  resultHistory: number[] // Last 20 spins
  spinTimerSec: number
  isManualSpin: boolean
}

export type RouletteAction =
  | { type: 'PLACE_BET'; userId: string; bet: RouletteBet }
  | { type: 'REMOVE_BET'; userId: string; betIndex: number }
  | { type: 'SPIN'; winningNumber: number }
  | { type: 'PLAYER_DISCONNECT'; userId: string }
  | { type: 'PLAYER_RECONNECT'; userId: string }

/**
 * Create initial roulette game state
 */
export function createInitialState(
  players: Array<{ userId: string; displayName: string }>,
  settings: { spinTimerSec: number; isManualSpin: boolean }
): RouletteGameState {
  return {
    phase: 'betting',
    players: players.map(p => ({
      userId: p.userId,
      displayName: p.displayName,
      bets: [],
      totalBetAmount: 0,
      isConnected: true
    })),
    currentRound: 1,
    winningNumber: null,
    resultHistory: [],
    spinTimerSec: settings.spinTimerSec,
    isManualSpin: settings.isManualSpin
  }
}

/**
 * Apply an action to the roulette game state
 * Returns new state or Error if action is invalid
 */
export function applyAction(
  state: RouletteGameState,
  action: RouletteAction
): RouletteGameState | Error {
  switch (action.type) {
    case 'PLACE_BET':
      return handlePlaceBet(state, action.userId, action.bet)

    case 'REMOVE_BET':
      return handleRemoveBet(state, action.userId, action.betIndex)

    case 'SPIN':
      return handleSpin(state, action.winningNumber)

    case 'PLAYER_DISCONNECT':
      return handlePlayerDisconnect(state, action.userId)

    case 'PLAYER_RECONNECT':
      return handlePlayerReconnect(state, action.userId)

    default:
      return new Error('Unknown action type')
  }
}

/**
 * Handle PLACE_BET action
 */
function handlePlaceBet(
  state: RouletteGameState,
  userId: string,
  bet: RouletteBet
): RouletteGameState | Error {
  // Can only place bets during betting phase
  if (state.phase !== 'betting') {
    return new Error('Can only place bets during betting phase')
  }

  // Validate bet
  if (!validateBet(bet.type, bet.numbers)) {
    return new Error('Invalid bet type or numbers')
  }

  // Find player
  const playerIndex = state.players.findIndex(p => p.userId === userId)
  if (playerIndex === -1) {
    return new Error('Player not found')
  }

  // Add bet to player
  const newPlayers = [...state.players]
  const player = newPlayers[playerIndex]
  newPlayers[playerIndex] = {
    ...player,
    bets: [...player.bets, bet],
    totalBetAmount: player.totalBetAmount + bet.amount
  }

  return {
    ...state,
    players: newPlayers
  }
}

/**
 * Handle REMOVE_BET action
 */
function handleRemoveBet(
  state: RouletteGameState,
  userId: string,
  betIndex: number
): RouletteGameState | Error {
  // Can only remove bets during betting phase
  if (state.phase !== 'betting') {
    return new Error('Can only remove bets during betting phase')
  }

  // Find player
  const playerIndex = state.players.findIndex(p => p.userId === userId)
  if (playerIndex === -1) {
    return new Error('Player not found')
  }

  const player = state.players[playerIndex]

  // Validate bet index
  if (betIndex < 0 || betIndex >= player.bets.length) {
    return new Error('Invalid bet index')
  }

  // Remove bet
  const removedBet = player.bets[betIndex]
  const newBets = player.bets.filter((_, i) => i !== betIndex)

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = {
    ...player,
    bets: newBets,
    totalBetAmount: player.totalBetAmount - removedBet.amount
  }

  return {
    ...state,
    players: newPlayers
  }
}

/**
 * Handle SPIN action
 */
function handleSpin(
  state: RouletteGameState,
  winningNumber: number
): RouletteGameState | Error {
  // Can only spin during betting phase
  if (state.phase !== 'betting') {
    return new Error('Can only spin during betting phase')
  }

  // Validate winning number
  if (winningNumber < 0 || winningNumber > 36) {
    return new Error('Invalid winning number')
  }

  // Calculate payouts for all players
  const playersWithPayouts = state.players.map(player => {
    // Player keeps their bets for now (settlement phase displays them)
    return { ...player }
  })

  // Update result history (max 20, newest first)
  const newHistory = [winningNumber, ...state.resultHistory].slice(0, 20)

  return {
    ...state,
    phase: 'settlement',
    players: playersWithPayouts,
    winningNumber,
    resultHistory: newHistory
  }
}

/**
 * Handle PLAYER_DISCONNECT action
 */
function handlePlayerDisconnect(
  state: RouletteGameState,
  userId: string
): RouletteGameState | Error {
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

/**
 * Handle PLAYER_RECONNECT action
 */
function handlePlayerReconnect(
  state: RouletteGameState,
  userId: string
): RouletteGameState | Error {
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

/**
 * Calculate all payouts for a player given winning number
 * Used by server/UI to determine winnings
 */
export function calculatePlayerPayout(
  player: RoulettePlayer,
  winningNumber: number
): number {
  let totalPayout = 0

  for (const bet of player.bets) {
    const payout = calculateBetPayout(bet.type, bet.amount, winningNumber, bet.numbers)
    totalPayout += payout
  }

  return totalPayout
}

/**
 * Transition from settlement back to betting for next round
 */
export function startNextRound(state: RouletteGameState): RouletteGameState | Error {
  if (state.phase !== 'settlement') {
    return new Error('Can only start next round from settlement phase')
  }

  // Clear all bets
  const newPlayers = state.players.map(player => ({
    ...player,
    bets: [],
    totalBetAmount: 0
  }))

  return {
    ...state,
    phase: 'betting',
    players: newPlayers,
    currentRound: state.currentRound + 1,
    winningNumber: null
  }
}
