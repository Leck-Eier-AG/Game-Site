// Dice types
export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6
export type DiceValues = [DiceValue, DiceValue, DiceValue, DiceValue, DiceValue]
export type KeptDice = boolean[] // which dice are kept (true = kept)

// Game phases - state machine states
export type GamePhase = 'waiting' | 'rolling' | 'scoring' | 'ended'

// Kniffel scoring categories
export type ScoreCategory =
  | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'  // upper
  | 'threeOfKind' | 'fourOfKind' | 'fullHouse'                   // lower
  | 'smallStraight' | 'largeStraight' | 'kniffel' | 'chance'     // lower

export interface KniffelScoresheet {
  ones?: number
  twos?: number
  threes?: number
  fours?: number
  fives?: number
  sixes?: number
  threeOfKind?: number
  fourOfKind?: number
  fullHouse?: number
  smallStraight?: number
  largeStraight?: number
  kniffel?: number
  chance?: number
}

// Player state within a game
export interface PlayerState {
  userId: string
  displayName: string
  scoresheet: KniffelScoresheet
  isReady: boolean
  isConnected: boolean
  lastActivity: number // timestamp
  consecutiveInactive: number
}

// Full game state (stored as JSON in GameRoom.gameState)
export interface GameState {
  phase: GamePhase
  players: PlayerState[]
  spectators: string[] // userIds
  currentPlayerIndex: number
  dice: DiceValues
  keptDice: KeptDice
  rollsRemaining: number // 0-3
  round: number // 1-13 (13 rounds in Kniffel)
  turnStartedAt: number | null // timestamp for timer sync
  turnDuration: number // seconds
  winner: string | null // userId
}

// Room settings (sent when creating a room)
export interface RoomSettings {
  name: string
  maxPlayers: number // 2-6
  isPrivate: boolean
  turnTimer: number // 30, 60, or 90
  afkThreshold: number // consecutive inactive rounds
}

// Room info for lobby display
export interface RoomInfo {
  id: string
  name: string
  hostId: string
  hostName: string
  gameType: string
  status: 'waiting' | 'playing' | 'ended'
  isPrivate: boolean
  maxPlayers: number
  currentPlayers: number
  playerNames: string[]
  createdAt: string
}

// Chat message
export interface ChatMessage {
  id: string
  roomId: string
  userId: string
  displayName: string
  content: string
  isSystem: boolean
  timestamp: number
}

// Socket event payloads
export interface RoomCreatedPayload {
  roomId: string
  room: RoomInfo
}

export interface GameStateUpdate {
  state: GameState
  roomId: string
}

// Vote rematch
export interface RematchVote {
  votedYes: string[]
  votedNo: string[]
  total: number
  required: number // majority
}
