// Game types
export type GameType = 'kniffel' | 'blackjack' | 'roulette' | 'poker'
export type KniffelMode = 'classic' | 'team2v2' | 'team3v3'
export type KniffelPreset =
  | 'classic'
  | 'triple'
  | 'draft'
  | 'duel'
  | 'daily'
  | 'ladder'
  | 'roguelite'

export interface KniffelRuleset {
  preset: KniffelPreset
  allowScratch: boolean
  strictStraights: boolean
  fullHouseUsesSum: boolean
  maxRolls: number
  columnCount: number
  columnMultipliers: number[]
  columnSelection: 'choose' | 'round'
  jokerCount: number
  jokerMaxPerTurn: number
  draftEnabled: boolean
  duelEnabled: boolean
  riskRollEnabled: boolean
  riskRollThreshold: number
  dailyEnabled: boolean
  ladderEnabled: boolean
  constraintsEnabled: boolean
  rogueliteEnabled: boolean
  categoryRandomizer: {
    enabled: boolean
    disabledCategories: ScoreCategory[]
    specialCategories: ScoreCategory[]
  }
  speedMode: {
    enabled: boolean
    autoScore: boolean
  }
}

export interface MatchState {
  mode?: 'duel' | 'draft' | 'risk' | 'daily' | 'ladder' | 'roguelite'
  round?: number
  totalRounds?: number
  winsByUserId?: Record<string, number>
  activeCategories?: ScoreCategory[]
  draftOrder?: string[]
  draftPool?: number[][]
  draftCurrentIndex?: number
  roundWinners?: string[]
  duelCategoryPool?: ScoreCategory[]
  riskDebt?: boolean
  dailySeed?: string
  ladderRung?: number
  constraints?: string[]
}

export interface ModifiersState {
  jokersByUserId?: Record<string, number>
  jokersUsedThisTurnByUserId?: Record<string, number>
  perksByUserId?: Record<string, string[]>
  cursesByUserId?: Record<string, string[]>
  effects?: Array<{ id: string; type: string; value: number; remainingTurns: number }>
  boss?: {
    id: string
    turnsRemaining: number
    objective: string
    status: 'active' | 'success' | 'fail'
  }
}

// Dice types
export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6
export type DiceValues = [DiceValue, DiceValue, DiceValue, DiceValue, DiceValue]
export type KeptDice = boolean[] // which dice are kept (true = kept)

// Game phases - state machine states
export type GamePhase = 'waiting' | 'rolling' | 'draft_claim' | 'paused' | 'scoring' | 'ended'

// Kniffel scoring categories
export type ScoreCategory =
  | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'  // upper
  | 'threeOfKind' | 'fourOfKind' | 'fullHouse'                   // lower
  | 'smallStraight' | 'largeStraight' | 'kniffel' | 'chance'     // lower
  | 'twoPairs' | 'allEven' | 'sumAtLeast24'                      // special

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
  twoPairs?: number
  allEven?: number
  sumAtLeast24?: number
}

// Player state within a game
export interface PlayerState {
  userId: string
  displayName: string
  teamId?: string
  scoresheet: KniffelScoresheet | { columns: KniffelScoresheet[] }
  isReady: boolean
  isConnected: boolean
  lastActivity: number // timestamp
  consecutiveInactive: number
}

// Full game state (stored as JSON in GameRoom.gameState)
export interface GameState {
  phase: GamePhase
  kniffelMode?: KniffelMode
  ruleset?: KniffelRuleset
  matchState?: MatchState
  modifiers?: ModifiersState
  rulesVersion?: number
  teams?: TeamInfo[]
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

export interface TeamInfo {
  id: string
  name: string
  memberUserIds: string[]
}

export interface PauseVote {
  votedYes: string[]
  votedNo: string[]
  total: number
  required: number // >50% majority
}

// Game-specific settings
export interface PokerSettings {
  startingBlinds: number
  blindEscalation: boolean
  blindInterval: number // minutes
  allowRebuys: boolean
  rebuyLimit: number
  minBuyIn: number
  maxBuyIn: number
}

export interface BlackjackSettings {
  maxHands: number // 1-3 for solo multi-hand
}

export interface RouletteSettings {
  spinTimerSec: number // 0 = manual trigger
}

// Room settings (sent when creating a room)
export interface RoomSettings {
  name: string
  gameType: GameType
  kniffelMode?: KniffelMode
  kniffelPreset?: KniffelPreset
  kniffelRuleset?: Partial<KniffelRuleset>
  maxPlayers: number // 2-6 for Kniffel, 1-7 for Blackjack, 1-10 for Roulette, 2-9 for Poker
  isPrivate: boolean
  turnTimer: number // 30, 60, or 90
  afkThreshold: number // consecutive inactive rounds
  isBetRoom: boolean // true = bet room, false = free room (NOT just betAmount=0)
  betAmount?: number // buy-in per player (only if isBetRoom)
  minBet?: number // room min bet (optional override)
  maxBet?: number // room max bet (optional override)
  payoutRatios?: { position: number; percentage: number }[] // custom payout ratios
  pokerSettings?: PokerSettings
  blackjackSettings?: BlackjackSettings
  rouletteSettings?: RouletteSettings
}

// Room info for lobby display
export interface RoomInfo {
  id: string
  name: string
  hostId: string
  hostName: string
  gameType: GameType
  kniffelMode?: KniffelMode
  status: 'waiting' | 'playing' | 'ended'
  isPrivate: boolean
  maxPlayers: number
  currentPlayers: number
  playerNames: string[]
  createdAt: string
  isBetRoom: boolean
  betAmount: number // 0 for free rooms
  minBet: number // 0 if not set
  maxBet: number // 0 if not set
  totalPot: number // current pot (betAmount * activePlayers in bet rooms)
  payoutRatios: { position: number; percentage: number }[]
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
