import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import pkg from '@next/env'
const { loadEnvConfig } = pkg
import next from 'next'
import { Server } from 'socket.io'
import { jwtVerify } from 'jose'
import { PrismaClient } from '@prisma/client'
import { applyAction, createInitialState } from './src/lib/game/state-machine.js'
import { autoPickCategory, calculateScore, calculateTotalScore } from './src/lib/game/kniffel-rules.js'
import { rollDice } from './src/lib/game/crypto-rng.js'
import { getWalletWithUser, getTransactionHistory, creditBalance, debitBalance, getSystemSettings } from './src/lib/wallet/transactions.js'
import { calculatePayouts } from './src/lib/wallet/payout.js'
import { canTransition } from './src/lib/wallet/escrow.js'
import { registerBlackjackHandlers } from './src/lib/game/blackjack/handlers.js'
import { createBlackjackState, applyBlackjackAction } from './src/lib/game/blackjack/state-machine.js'
import { registerRouletteHandlers, startSpinTimer } from './src/lib/game/roulette/handlers.js'
import { createInitialState as createRouletteState, applyAction as applyRouletteAction } from './src/lib/game/roulette/state-machine.js'
import { registerPokerHandlers } from './src/lib/game/poker/handlers.js'
import { createPokerState, applyPokerAction } from './src/lib/game/poker/state-machine.js'
import { createDeck, shuffleDeck } from './src/lib/game/cards/deck.js'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000

// Load .env (primary) and .env.local (fallback) before accessing env vars
loadEnvConfig(process.cwd())

const app = next({ dev, hostname, port })
const handler = app.getRequestHandler()
const prisma = new PrismaClient()

const SESSION_SECRET = process.env.SESSION_SECRET
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is not set')
}
const encodedKey = new TextEncoder().encode(SESSION_SECRET)

// Room Manager - in-memory room state
class RoomManager {
  constructor() {
    this.rooms = new Map() // roomId -> room object
    this.userRooms = new Map() // userId -> Set<roomId>
  }

  async createRoom(hostId, hostName, settings) {
    console.log('Creating room:', { hostId, isBetRoom: settings.isBetRoom, betAmount: settings.betAmount })
    const roomId = randomUUID()

    // Only fetch payout ratios for bet rooms
    let payoutRatios = settings.payoutRatios || null
    if (!payoutRatios && settings.isBetRoom) {
      try {
        const systemSettings = await prisma.systemSettings.findFirst()
        if (systemSettings?.defaultPayoutRatios) {
          payoutRatios = systemSettings.defaultPayoutRatios
        }
      } catch (error) {
        console.error('Failed to fetch payout ratios from SystemSettings:', error.message)
      }
      // Fallback if fetch failed or no settings exist
      if (!payoutRatios) {
        payoutRatios = [
          { position: 1, percentage: 60 },
          { position: 2, percentage: 30 },
          { position: 3, percentage: 10 }
        ]
      }
    }

    const room = {
      id: roomId,
      name: settings.name,
      hostId,
      hostName,
      gameType: settings.gameType || 'kniffel',
      kniffelMode: settings.kniffelMode || 'classic',
      status: 'waiting',
      isPrivate: settings.isPrivate || false,
      maxPlayers: settings.maxPlayers || 6,
      turnTimer: settings.turnTimer || 60,
      afkThreshold: settings.afkThreshold || 3,
      isBetRoom: settings.isBetRoom || false,
      betAmount: settings.betAmount || 0,
      minBet: settings.minBet || 0,
      maxBet: settings.maxBet || 0,
      payoutRatios: payoutRatios || [],
      pokerSettings: settings.pokerSettings || null,
      blackjackSettings: settings.blackjackSettings || null,
      rouletteSettings: settings.rouletteSettings || null,
      players: [{ userId: hostId, displayName: hostName, isReady: false, teamId: null }],
      spectators: [],
      gameState: null,
      pauseVotes: null,
      chat: [],
      createdAt: Date.now()
    }
    this.rooms.set(roomId, room)
    this._trackUser(hostId, roomId)
    console.log('Room created:', roomId)
    return room
  }

  joinRoom(roomId, userId, displayName) {
    const room = this.rooms.get(roomId)
    if (!room) return { error: 'Room not found' }

    // Check if already in room
    if (room.players.some(p => p.userId === userId)) {
      return { room, rejoined: true }
    }

    // If game in progress, join as spectator
    if (room.status === 'playing') {
      if (!room.spectators.includes(userId)) {
        room.spectators.push(userId)
      }
      this._trackUser(userId, roomId)
      return { room, spectator: true }
    }

    if (room.players.length >= room.maxPlayers) {
      return { error: 'Room is full' }
    }

    room.players.push({ userId, displayName, isReady: false, teamId: null })
    this._trackUser(userId, roomId)
    return { room }
  }

  leaveRoom(roomId, userId) {
    const room = this.rooms.get(roomId)
    if (!room) return null

    room.players = room.players.filter(p => p.userId !== userId)
    room.spectators = room.spectators.filter(id => id !== userId)
    this._untrackUser(userId, roomId)

    // If host left, assign new host
    if (room.hostId === userId && room.players.length > 0) {
      room.hostId = room.players[0].userId
      room.hostName = room.players[0].displayName
    }

    // Cleanup empty room
    if (room.players.length === 0 && room.spectators.length === 0) {
      this.rooms.delete(roomId)
      return null
    }

    return room
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null
  }

  getPublicRooms() {
    return Array.from(this.rooms.values())
      .filter(r => !r.isPrivate && r.status !== 'ended')
      .map(r => ({
        id: r.id,
        name: r.name,
        hostName: r.hostName,
        gameType: r.gameType,
        kniffelMode: r.kniffelMode || 'classic',
        status: r.status,
        maxPlayers: r.maxPlayers,
        currentPlayers: r.players.length,
        playerNames: r.players.map(p => p.displayName),
        createdAt: r.createdAt,
        isBetRoom: r.isBetRoom || false,
        betAmount: r.betAmount || 0,
        minBet: r.minBet || 0,
        maxBet: r.maxBet || 0,
        totalPot: r.isBetRoom ? (r.betAmount * r.players.length) : 0,
        payoutRatios: r.payoutRatios || []
      }))
  }

  getUserRooms(userId) {
    const roomIds = this.userRooms.get(userId) || new Set()
    return Array.from(roomIds).map(id => this.rooms.get(id)).filter(Boolean)
  }

  removeUserFromAllRooms(userId) {
    const roomIds = this.userRooms.get(userId) || new Set()
    const affectedRooms = []
    for (const roomId of roomIds) {
      const room = this.leaveRoom(roomId, userId)
      if (room) affectedRooms.push(room)
    }
    this.userRooms.delete(userId)
    return affectedRooms
  }

  // Periodic cleanup for stale rooms
  cleanup() {
    const now = Date.now()
    const staleThreshold = 30 * 60 * 1000 // 30 min
    for (const [roomId, room] of this.rooms) {
      if (room.status === 'ended' && (now - room.createdAt) > staleThreshold) {
        this.rooms.delete(roomId)
      }
      if (room.players.length === 0 && room.spectators.length === 0) {
        this.rooms.delete(roomId)
      }
    }
  }

  removeRoom(roomId) {
    this.rooms.delete(roomId)
  }

  _trackUser(userId, roomId) {
    if (!this.userRooms.has(userId)) this.userRooms.set(userId, new Set())
    this.userRooms.get(userId).add(roomId)
  }

  _untrackUser(userId, roomId) {
    const rooms = this.userRooms.get(userId)
    if (rooms) {
      rooms.delete(roomId)
      if (rooms.size === 0) this.userRooms.delete(userId)
    }
  }
}

const roomManager = new RoomManager()

function getMajorityRequired(total) {
  return Math.floor(total / 2) + 1
}

function getKniffelTeamConfig(kniffelMode) {
  if (kniffelMode === 'team2v2') {
    return { perTeam: 2, total: 4 }
  }
  if (kniffelMode === 'team3v3') {
    return { perTeam: 3, total: 6 }
  }
  return null
}

function buildKniffelTeams(players, kniffelMode) {
  const cfg = getKniffelTeamConfig(kniffelMode)
  if (!cfg) return { teams: [] }

  if (players.length !== cfg.total) {
    return { error: `Teammodus ${kniffelMode === 'team2v2' ? '2v2' : '3v3'} benötigt genau ${cfg.total} Spieler` }
  }

  const teamAPlayers = players.filter(player => player.teamId === 'team-a')
  const teamBPlayers = players.filter(player => player.teamId === 'team-b')

  if (teamAPlayers.length !== cfg.perTeam || teamBPlayers.length !== cfg.perTeam) {
    return { error: 'Teams sind nicht vollständig besetzt' }
  }

  if (players.some(player => !player.teamId)) {
    return { error: 'Nicht alle Spieler haben ein Team gewählt' }
  }

  return {
    teams: [
      { id: 'team-a', name: 'Team A', memberUserIds: teamAPlayers.map(player => player.userId) },
      { id: 'team-b', name: 'Team B', memberUserIds: teamBPlayers.map(player => player.userId) }
    ]
  }
}

function buildKniffelTeamSummary(gameState) {
  if (!gameState?.teams?.length) return null

  const teamScores = gameState.teams.map(team => {
    const players = gameState.players.filter(player => team.memberUserIds.includes(player.userId))
    const total = players.reduce((sum, player) => sum + calculateTotalScore(player.scoresheet), 0)
    return {
      teamId: team.id,
      teamName: team.name,
      total,
      members: players.map(player => ({
        userId: player.userId,
        displayName: player.displayName,
        total: calculateTotalScore(player.scoresheet)
      }))
    }
  }).sort((a, b) => b.total - a.total)

  return {
    winnerTeamId: teamScores[0]?.teamId || null,
    teamScores
  }
}

// Helper: Build rankings from game state for payout calculation
function buildRankings(gameState) {
  // Sort players by total score descending
  const sortedPlayers = [...gameState.players]
    .map(p => ({
      ...p,
      total: calculateTotalScore(p.scoresheet)
    }))
    .sort((a, b) => b.total - a.total)

  // Build rankings with tie detection
  const rankings = []
  let currentPosition = 1
  let i = 0

  while (i < sortedPlayers.length) {
    const currentScore = sortedPlayers[i].total
    const tiedPlayers = []

    // Collect all players with the same score
    while (i < sortedPlayers.length && sortedPlayers[i].total === currentScore) {
      tiedPlayers.push(sortedPlayers[i].userId)
      i++
    }

    rankings.push({
      position: currentPosition,
      userIds: tiedPlayers
    })

    currentPosition += tiedPlayers.length
  }

  return rankings
}

// Helper function to send system messages (module scope for timer access)
function sendSystemMessage(roomId, io, content) {
  const room = roomManager.getRoom(roomId)
  if (!room) return
  const message = {
    id: randomUUID(),
    roomId,
    userId: 'system',
    displayName: 'System',
    content,
    isSystem: true,
    timestamp: Date.now()
  }
  room.chat.push(message)
  if (room.chat.length > 100) room.chat.shift()
  io.to(roomId).emit('chat:message', message)
}

// Helper function to emit balance updates (module scope for timer access)
function emitBalanceUpdate(io, userId, newBalance, change, description) {
  io.to(`user:${userId}`).emit('balance:updated', {
    newBalance,
    change,
    description
  })
}

// Helper function to emit personalized poker state (module scope)
function emitPokerState(io, roomId, room) {
  const gameState = room.gameState
  if (!gameState || room.gameType !== 'poker') return

  const sockets = io.sockets.adapter.rooms.get(roomId)
  if (!sockets) return

  const isShowdown = gameState.phase === 'showdown'

  for (const socketId of sockets) {
    const socket = io.sockets.sockets.get(socketId)
    if (!socket) continue

    const userId = socket.data.userId

    // Create personalized state with filtered hole cards
    const personalizedState = {
      ...gameState,
      players: gameState.players.map((player) => ({
        ...player,
        holeCards:
          isShowdown || player.userId === userId
            ? player.holeCards // Show own cards or all cards in showdown
            : [] // Hide other players' cards
      }))
    }

    socket.emit('game:state-update', { state: personalizedState, roomId })
  }
}

// Turn timer management
const turnTimers = new Map() // roomId -> timeout
const afkWarnings = new Map() // roomId:userId -> timeout

function startTurnTimer(roomId, io) {
  clearTurnTimer(roomId)
  const room = roomManager.getRoom(roomId)
  if (!room || !room.gameState || room.gameState.phase !== 'rolling') return

  const timeout = setTimeout(async () => {
    try {
      await autoPlay(roomId, io)
    } catch (error) {
      console.error('Turn timer auto-play error:', error)
    }
  }, room.gameState.turnDuration * 1000)

  turnTimers.set(roomId, timeout)
}

function resetTurnTimer(roomId, io) {
  startTurnTimer(roomId, io) // clear and restart
}

function clearTurnTimer(roomId) {
  const timer = turnTimers.get(roomId)
  if (timer) {
    clearTimeout(timer)
    turnTimers.delete(roomId)
  }
}

// Auto-play on timeout using imported autoPickCategory
async function autoPlay(roomId, io) {
  const room = roomManager.getRoom(roomId)
  if (!room || !room.gameState || room.gameState.phase !== 'rolling') return
  const gs = room.gameState
  const currentPlayer = gs.players[gs.currentPlayerIndex]

  // If player hasn't rolled yet, roll for them via state machine
  let state = gs
  if (state.rollsRemaining === 3) {
    const newDice = rollDice(5)
    const rollAction = { type: 'ROLL_DICE', keptDice: [false, false, false, false, false], newDice }
    const rollResult = applyAction(state, rollAction, currentPlayer.userId)
    if (!(rollResult instanceof Error)) {
      state = rollResult
    }
  }

  // Pick best category using imported autoPickCategory from kniffel-rules.js
  const bestCategory = autoPickCategory(state.dice, currentPlayer.scoresheet)

  // Apply scoring via state machine
  const scoreAction = { type: 'CHOOSE_CATEGORY', category: bestCategory }
  const result = applyAction(state, scoreAction, currentPlayer.userId)

  if (result instanceof Error) {
    // Fallback: something went wrong, log and skip turn
    console.error('Auto-play failed:', result.message)
    return
  }

  room.gameState = result
  currentPlayer.consecutiveInactive += 1

  const score = calculateScore(bestCategory, state.dice)
  sendSystemMessage(roomId, io, `Auto-Zug: ${currentPlayer.displayName} -> ${bestCategory} (${score} Punkte)`)

  // Check AFK threshold
  if (currentPlayer.consecutiveInactive >= room.afkThreshold) {
    // In bet rooms, emit grace period warning before kicking
    if (room.isBetRoom) {
      const warningKey = `${roomId}:${currentPlayer.userId}`
      const existingWarning = afkWarnings.get(warningKey)

      if (!existingWarning) {
        // First time hitting threshold: start grace period
        const settings = await getSystemSettings()
        const gracePeriodSec = settings.afkGracePeriodSec || 30

        io.to(`user:${currentPlayer.userId}`).emit('bet:afk-warning', {
          roomId,
          gracePeriodSec,
          message: `Du wirst in ${gracePeriodSec} Sekunden wegen Inaktivität entfernt. Dein Einsatz verfällt.`
        })

        // Set timeout for actual kick
        const kickTimeout = setTimeout(async () => {
          await kickPlayerAFK(room, roomId, currentPlayer, io)
          afkWarnings.delete(warningKey)
          io.to(roomId).emit('game:state-update', { state: room.gameState, roomId })
        }, gracePeriodSec * 1000)

        afkWarnings.set(warningKey, kickTimeout)
      }
      // If warning already exists, let it continue (don't reset)
    } else {
      // Free room: kick immediately
      await kickPlayerAFK(room, roomId, currentPlayer, io)
      return
    }
  }

  // Check if game ended
  if (result.phase === 'ended') {
    room.status = 'ended'
    room.pauseVotes = null
    clearTurnTimer(roomId)
    const winnerPlayer = result.players.find(p => p.userId === result.winner)
    const winnerTotal = calculateTotalScore(winnerPlayer.scoresheet)
    sendSystemMessage(roomId, io, `Spiel beendet! Gewinner: ${winnerPlayer.displayName} (${winnerTotal} Punkte)`)

    // Handle bet room payouts
    let payoutData = null
    if (room.isBetRoom) {
      try {
        // Calculate total pot from LOCKED escrows
        const escrows = await prisma.betEscrow.findMany({
          where: { roomId, status: 'LOCKED' }
        })
        const totalPot = escrows.reduce((sum, e) => sum + e.amount, 0)

        // Build rankings
        const rankings = buildRankings(result)

        // Calculate payouts
        const payouts = calculatePayouts(totalPot, rankings, room.payoutRatios)

        // Distribute payouts and release escrows
        await prisma.$transaction(async (tx) => {
          // Credit winners
          for (const [userId, amount] of payouts.entries()) {
            if (amount > 0) {
              const player = result.players.find(p => p.userId === userId)
              const position = rankings.find(r => r.userIds.includes(userId))?.position || 0

              const updatedWallet = await tx.wallet.update({
                where: { userId },
                data: { balance: { increment: amount } }
              })

              await tx.transaction.create({
                data: {
                  type: 'GAME_WIN',
                  amount,
                  userId,
                  description: `${room.name} gewonnen (${position}. Platz)`
                }
              })

              // Emit balance update with correct new balance
              emitBalanceUpdate(io, userId, updatedWallet.balance, amount, `${room.name} gewonnen`)
            }
          }

          // Release all escrows
          await tx.betEscrow.updateMany({
            where: { roomId, status: 'LOCKED' },
            data: {
              status: 'RELEASED',
              releasedAt: new Date()
            }
          })
        }, {
          isolationLevel: 'Serializable',
          maxWait: 5000,
          timeout: 10000
        })

        // Build payout data for client
        payoutData = Array.from(payouts.entries()).map(([userId, amount]) => {
          const player = result.players.find(p => p.userId === userId)
          const position = rankings.find(r => r.userIds.includes(userId))?.position || 0
          return {
            userId,
            displayName: player?.displayName || 'Unknown',
            position,
            amount
          }
        })

        room.payouts = payoutData
      } catch (error) {
        console.error('Payout error:', error)
      }
    }

    room.rematchVotes = { votedYes: [], votedNo: [], total: result.players.length, required: Math.ceil(result.players.length / 2) }
    const teamSummary = room.gameType === 'kniffel' ? buildKniffelTeamSummary(result) : null
    io.to(roomId).emit('game:ended', {
      winner: result.winner,
      winnerTeamId: teamSummary?.winnerTeamId || null,
      teamScores: teamSummary?.teamScores || null,
      scores: result.players.map(p => ({ userId: p.userId, displayName: p.displayName, total: calculateTotalScore(p.scoresheet) })),
      payouts: payoutData
    })
    io.emit('room:list-update', roomManager.getPublicRooms())
  } else {
    result.turnStartedAt = Date.now()
    startTurnTimer(roomId, io)
  }

  io.to(roomId).emit('game:state-update', { state: result, roomId })
}

// AFK kick with escrow forfeit for bet rooms
async function kickPlayerAFK(room, roomId, player, io) {
  sendSystemMessage(roomId, io, `${player.displayName} wurde entfernt (AFK)`)
  room.gameState.players = room.gameState.players.filter(p => p.userId !== player.userId)
  room.players = room.players.filter(p => p.userId !== player.userId)

  // Handle bet room escrow forfeit
  if (room.isBetRoom) {
    try {
      const escrow = await prisma.betEscrow.findFirst({
        where: { roomId, userId: player.userId, status: 'LOCKED' }
      })

      if (escrow) {
        await prisma.$transaction(async (tx) => {
          // Update escrow to forfeited
          await tx.betEscrow.update({
            where: { id: escrow.id },
            data: { status: 'FORFEITED' }
          })

          // Create forfeit transaction record
          await tx.transaction.create({
            data: {
              type: 'BET_FORFEIT',
              amount: escrow.amount,
              userId: player.userId,
              description: `Einsatz verfallen: ${room.name} (AFK)`
            }
          })
        }, {
          isolationLevel: 'Serializable',
          maxWait: 5000,
          timeout: 10000
        })
      }
    } catch (error) {
      console.error('AFK forfeit error:', error)
    }
  }

  // If only 1 player left, they win by default
  if (room.gameState.players.length < 2) {
    room.gameState.phase = 'ended'
    room.gameState.winner = room.gameState.players[0]?.userId || null
    room.status = 'ended'
    room.pauseVotes = null
    clearTurnTimer(roomId)
    const winner = room.gameState.players[0]
    if (winner) {
      sendSystemMessage(roomId, io, `${winner.displayName} gewinnt! Alle anderen Spieler waren AFK.`)
    }
    const teamSummary = room.gameType === 'kniffel' ? buildKniffelTeamSummary(room.gameState) : null
    io.to(roomId).emit('game:ended', {
      winner: room.gameState.winner,
      winnerTeamId: teamSummary?.winnerTeamId || null,
      teamScores: teamSummary?.teamScores || null,
      scores: room.gameState.players.map(p => ({ userId: p.userId, displayName: p.displayName, total: calculateTotalScore(p.scoresheet) }))
    })
    return
  }

  // Adjust currentPlayerIndex if needed
  if (room.gameState.currentPlayerIndex >= room.gameState.players.length) {
    room.gameState.currentPlayerIndex = 0
  }

  io.to(roomId).emit('room:player-kicked', { userId: player.userId, reason: 'AFK' })
}

// Parse cookie string to extract specific cookie value
function parseCookie(cookieString, name) {
  if (!cookieString) return null
  const cookies = cookieString.split(';').map((c) => c.trim())
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=')
    if (key === name) {
      return decodeURIComponent(value)
    }
  }
  return null
}

app.prepare().then(() => {
  const httpServer = createServer(handler)
  const io = new Server(httpServer, {
    cors: {
      origin: dev ? true : false,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    reconnectionAttempts: Infinity,
  })

  // Socket.IO authentication middleware
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.request.headers.cookie
      const sessionCookie = parseCookie(cookieHeader, 'session')

      if (!sessionCookie) {
        return next(new Error('Authentication required'))
      }

      // Verify JWT
      const { payload } = await jwtVerify(sessionCookie, encodedKey, {
        algorithms: ['HS256'],
      })

      // Fetch user from database to get displayName
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { displayName: true }
      })

      if (!user) {
        return next(new Error('User not found'))
      }

      // Store user data in socket
      socket.data.userId = payload.userId
      socket.data.role = payload.role
      socket.data.displayName = user.displayName

      next()
    } catch (error) {
      console.error('Socket authentication error:', error.message)
      next(new Error('Authentication required'))
    }
  })

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(
      `Client connected: ${socket.data.userId} (${socket.data.role})`
    )

    // Join user-specific room for balance updates
    socket.join(`user:${socket.data.userId}`)

    // Register game-specific handlers
    registerBlackjackHandlers(socket, io, roomManager, prisma)
    registerRouletteHandlers(socket, io, roomManager, prisma)
    registerPokerHandlers(socket, io, roomManager, prisma)

    // Handle wallet balance request
    socket.on('wallet:get-balance', async (callback) => {
      try {
        const wallet = await getWalletWithUser(socket.data.userId)
        callback?.({
          success: true,
          balance: wallet.balance,
          currencyName: 'Chips' // TODO: Get from SystemSettings
        })
      } catch (error) {
        console.error('wallet:get-balance error:', error.message)
        callback?.({ success: false, error: error.message })
      }
    })

    // Handle recent transactions request
    socket.on('wallet:recent-transactions', async (callback) => {
      try {
        const transactions = await getTransactionHistory(socket.data.userId, { limit: 3 })
        const formattedTransactions = transactions.map(tx => ({
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          createdAt: tx.createdAt
        }))
        callback?.(formattedTransactions)
      } catch (error) {
        console.error('wallet:recent-transactions error:', error.message)
        callback?.([])
      }
    })

    // Handle admin balance adjustment notification
    socket.on('admin:balance-adjusted', async ({ userId, newBalance, amount }) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: socket.data.userId },
          select: { role: true }
        })

        if (!user || user.role !== 'ADMIN') {
          console.error('Unauthorized admin:balance-adjusted attempt from', socket.data.userId)
          return
        }

        // Use newBalance from the event if provided (already computed by the server action),
        // otherwise fall back to querying the DB
        let balance = newBalance
        if (balance == null) {
          const wallet = await getWalletWithUser(userId)
          balance = wallet.balance
        }

        emitBalanceUpdate(io, userId, balance, amount || 0, 'Admin-Anpassung')
      } catch (error) {
        console.error('admin:balance-adjusted error:', error.message)
      }
    })

    // Handle transfer notification to recipient
    socket.on('wallet:transfer-complete', async ({ toUserId, amount }) => {
      try {
        if (!toUserId || !amount) return

        // Look up recipient's new balance
        const wallet = await getWalletWithUser(toUserId)

        // Notify recipient with balance update + transfer info
        emitBalanceUpdate(io, toUserId, wallet.balance, amount, `Transfer von ${socket.data.displayName}`)
        io.to(`user:${toUserId}`).emit('wallet:transfer-received', {
          fromName: socket.data.displayName,
          amount,
        })
      } catch (error) {
        console.error('wallet:transfer-complete error:', error.message)
      }
    })

    // Handle room list request
    socket.on('room:list', (callback) => {
      callback({ success: true, rooms: roomManager.getPublicRooms() })
    })

    // Handle room creation
    socket.on('room:create', async (settings, callback) => {
      try {
        if (!settings || !settings.name) {
          return callback({ success: false, error: 'Invalid room settings' })
        }

        if (settings.gameType === 'kniffel') {
          const kniffelMode = settings.kniffelMode || 'classic'
          settings.kniffelMode = kniffelMode
          if (kniffelMode === 'team2v2' && settings.maxPlayers !== 4) {
            return callback({ success: false, error: '2v2 benötigt genau 4 Spieler' })
          }
          if (kniffelMode === 'team3v3' && settings.maxPlayers !== 6) {
            return callback({ success: false, error: '3v3 benötigt genau 6 Spieler' })
          }
        }

        // Validate bet settings
        // Casino games (blackjack, roulette, poker) handle betting on the table — no upfront betAmount needed
        const isCasinoGame = ['blackjack', 'roulette', 'poker'].includes(settings.gameType)
        if (settings.isBetRoom && !isCasinoGame) {
          if (!settings.betAmount || settings.betAmount <= 0) {
            return callback({ success: false, error: 'Bet rooms require a positive bet amount' })
          }
          // Validate min/max bet if provided
          if (settings.minBet && settings.maxBet && settings.minBet > settings.maxBet) {
            return callback({ success: false, error: 'Minimum bet cannot be greater than maximum bet' })
          }
          if (settings.minBet && settings.betAmount < settings.minBet) {
            return callback({ success: false, error: 'Bet amount cannot be less than minimum bet' })
          }
          if (settings.maxBet && settings.betAmount > settings.maxBet) {
            return callback({ success: false, error: 'Bet amount cannot be greater than maximum bet' })
          }
        }

        // Add timeout protection
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Room creation timed out')), 5000)
        )

        const room = await Promise.race([
          roomManager.createRoom(socket.data.userId, socket.data.displayName, settings),
          timeoutPromise
        ])

        // [ESCROW_CREATE_ROOM_CREATE] - Creator escrow for bet rooms (skip for casino games — they bet on the table)
        if (settings.isBetRoom && !isCasinoGame) {
          const wallet = await getWalletWithUser(socket.data.userId)
          if (wallet.frozenAt !== null) {
            roomManager.removeRoom(room.id)
            return callback({ success: false, error: 'Wallet is frozen' })
          }
          if (wallet.balance < settings.betAmount) {
            roomManager.removeRoom(room.id)
            return callback({ success: false, error: 'Nicht genug Guthaben für den Einsatz' })
          }

          await prisma.$transaction(async (tx) => {
            await tx.wallet.update({
              where: { userId: socket.data.userId },
              data: { balance: { decrement: settings.betAmount } }
            })
            await tx.transaction.create({
              data: {
                type: 'BET_PLACED',
                amount: settings.betAmount,
                userId: socket.data.userId,
                description: `Einsatz: ${room.name}`
              }
            })
            await tx.betEscrow.create({
              data: {
                roomId: room.id,
                userId: socket.data.userId,
                amount: settings.betAmount,
                status: 'PENDING'
              }
            })
          }, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 })

          emitBalanceUpdate(io, socket.data.userId, wallet.balance - settings.betAmount, -settings.betAmount, `Einsatz: ${room.name}`)
        }

        socket.join(room.id)
        callback({
          success: true,
          roomId: room.id,
          room: roomManager.getPublicRooms().find(r => r.id === room.id)
        })
        // Broadcast updated room list to lobby
        io.emit('room:list-update', roomManager.getPublicRooms())
      } catch (error) {
        console.error('room:create error:', error.message)
        callback({ success: false, error: error.message })
      }
    })

    // Handle room join
    socket.on('room:join', async ({ roomId }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room) {
        callback?.({ success: false, error: 'Room not found' })
        return
      }

      // Check if already in room
      if (room.players.some(p => p.userId === socket.data.userId)) {
        socket.join(roomId)
        callback?.({ success: true, room, rejoined: true })
        io.to(roomId).emit('room:update', room)
        return
      }

      // For bet rooms, handle escrow (skip for casino games — they bet on the table)
      const isCasinoGameJoin = ['blackjack', 'roulette', 'poker'].includes(room.gameType)
      if (room.isBetRoom && room.status === 'waiting' && !isCasinoGameJoin) {
        try {
          // Get wallet
          const wallet = await getWalletWithUser(socket.data.userId)

          // Check if frozen
          if (wallet.frozenAt !== null) {
            callback?.({ success: false, error: 'Wallet is frozen' })
            return
          }

          // Check balance
          if (wallet.balance < room.betAmount) {
            // Insufficient balance: join as spectator
            if (!room.spectators.includes(socket.data.userId)) {
              room.spectators.push(socket.data.userId)
            }
            roomManager._trackUser(socket.data.userId, roomId)
            socket.join(roomId)
            callback?.({ success: true, room, spectator: true, reason: 'insufficient_balance' })
            sendSystemMessage(roomId, io, `${socket.data.displayName} schaut zu (nicht genug Chips)`)
            io.to(roomId).emit('room:update', room)
            io.emit('room:list-update', roomManager.getPublicRooms())
            return
          }

          // [ESCROW_IDEMPOTENT_JOIN] - Check for existing escrow before creating
          const existingEscrow = await prisma.betEscrow.findFirst({
            where: {
              roomId,
              userId: socket.data.userId,
              status: { in: ['PENDING', 'LOCKED'] }
            }
          })

          if (!existingEscrow) {
            // No existing escrow: debit balance and create new escrow
            await prisma.$transaction(async (tx) => {
              // Debit balance
              await tx.wallet.update({
                where: { userId: socket.data.userId },
                data: { balance: { decrement: room.betAmount } }
              })

              // Create transaction record
              await tx.transaction.create({
                data: {
                  type: 'BET_PLACED',
                  amount: room.betAmount,
                  userId: socket.data.userId,
                  description: `Einsatz: ${room.name}`
                }
              })

              // Create escrow
              await tx.betEscrow.create({
                data: {
                  roomId,
                  userId: socket.data.userId,
                  amount: room.betAmount,
                  status: 'PENDING'
                }
              })
            }, {
              isolationLevel: 'Serializable',
              maxWait: 5000,
              timeout: 10000
            })

            // Emit balance update
            emitBalanceUpdate(io, socket.data.userId, wallet.balance - room.betAmount, -room.betAmount, `Einsatz: ${room.name}`)
          }
          // If existingEscrow exists, skip debit and creation (already has active escrow)
        } catch (error) {
          console.error('Bet escrow error:', error)
          callback?.({ success: false, error: error.message })
          return
        }
      }

      // Join room normally
      const result = roomManager.joinRoom(
        roomId,
        socket.data.userId,
        socket.data.displayName
      )
      if (result.error) {
        callback?.({ success: false, error: result.error })
        socket.emit('room:error', { message: result.error })
        return
      }

      // Late-join promotion for casino games: promote spectator to player and add to game state
      let lateJoinPromoted = false
      if (result.spectator && room.gameState) {
        const promoteToPlayer = () => {
          room.spectators = room.spectators.filter(id => id !== socket.data.userId)
          if (!room.players.some(p => p.userId === socket.data.userId)) {
            room.players.push({ userId: socket.data.userId, displayName: socket.data.displayName, isReady: true, teamId: null })
          }
          result.spectator = false
          lateJoinPromoted = true
        }

        if (room.gameType === 'roulette') {
          console.log(`[LATE-JOIN] Roulette ADD_PLAYER for ${socket.data.userId} (${socket.data.displayName}), current players:`, room.gameState.players?.map(p => p.userId))
          const addResult = applyRouletteAction(room.gameState, {
            type: 'ADD_PLAYER',
            userId: socket.data.userId,
            displayName: socket.data.displayName,
          })
          if (!(addResult instanceof Error)) {
            promoteToPlayer()
            room.gameState = addResult
            console.log(`[LATE-JOIN] Success! Players now:`, room.gameState.players?.map(p => p.userId))
          } else {
            console.log(`[LATE-JOIN] ADD_PLAYER failed:`, addResult.message)
          }
        } else if (room.gameType === 'blackjack') {
          const addResult = applyBlackjackAction(room.gameState, {
            type: 'ADD_PLAYER',
            payload: { userId: socket.data.userId, displayName: socket.data.displayName },
          }, socket.data.userId)
          if (!(addResult instanceof Error)) {
            promoteToPlayer()
            room.gameState = addResult
          }
        } else if (room.gameType === 'poker') {
          const startingChips = room.pokerSettings?.startingChips || 1000
          const addResult = applyPokerAction(room.gameState, {
            type: 'ADD_PLAYER',
            userId: socket.data.userId,
            displayName: socket.data.displayName,
            startingChips,
          }, socket.data.userId)
          if (!(addResult instanceof Error)) {
            promoteToPlayer()
            room.gameState = addResult
          }
        }
      }

      // Join socket room FIRST, then emit — so the joining player receives all updates
      socket.join(roomId)
      callback?.({ success: true, room: result.room, spectator: result.spectator || false })
      if (!result.rejoined) {
        io.to(roomId).emit('room:player-joined', {
          userId: socket.data.userId,
          displayName: socket.data.displayName,
          spectator: result.spectator || false
        })
        sendSystemMessage(roomId, io, `${socket.data.displayName} ist beigetreten`)
      }
      // Emit game state update AFTER socket.join so the late-joiner receives it
      if (lateJoinPromoted) {
        io.to(roomId).emit('game:state-update', { state: room.gameState, roomId })
      }
      // Broadcast full room state to all players in the room
      io.to(roomId).emit('room:update', result.room)
      io.emit('room:list-update', roomManager.getPublicRooms())
    })

    // Handle room leave
    socket.on('room:leave', async ({ roomId }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room) {
        callback?.({ success: true })
        return
      }

      // Handle bet room escrow
      if (room.isBetRoom) {
        const wasPlayer = room.players.some(p => p.userId === socket.data.userId)

        if (wasPlayer) {
          try {
            // Find escrow for this user
            const escrow = await prisma.betEscrow.findFirst({
              where: { roomId, userId: socket.data.userId }
            })

            if (escrow) {
              if (escrow.status === 'PENDING') {
                // Game hasn't started: refund
                const wallet = await getWalletWithUser(socket.data.userId)
                await prisma.$transaction(async (tx) => {
                  // Credit balance back
                  await tx.wallet.update({
                    where: { userId: socket.data.userId },
                    data: { balance: { increment: escrow.amount } }
                  })

                  // Create refund transaction
                  await tx.transaction.create({
                    data: {
                      type: 'BET_REFUND',
                      amount: escrow.amount,
                      userId: socket.data.userId,
                      description: `Einsatz zurück: ${room.name}`
                    }
                  })

                  // Update escrow status
                  await tx.betEscrow.update({
                    where: { id: escrow.id },
                    data: {
                      status: 'RELEASED',
                      releasedAt: new Date()
                    }
                  })
                }, {
                  isolationLevel: 'Serializable',
                  maxWait: 5000,
                  timeout: 10000
                })

                // Emit balance update
                emitBalanceUpdate(io, socket.data.userId, wallet.balance + escrow.amount, escrow.amount, `Einsatz zurück: ${room.name}`)
              } else if (escrow.status === 'LOCKED') {
                // Game in progress: forfeit (no refund)
                await prisma.$transaction(async (tx) => {
                  // Update escrow to forfeited
                  await tx.betEscrow.update({
                    where: { id: escrow.id },
                    data: { status: 'FORFEITED' }
                  })

                  // Create forfeit transaction record (no balance change)
                  await tx.transaction.create({
                    data: {
                      type: 'BET_FORFEIT',
                      amount: escrow.amount,
                      userId: socket.data.userId,
                      description: `Einsatz verfallen: ${room.name}`
                    }
                  })
                }, {
                  isolationLevel: 'Serializable',
                  maxWait: 5000,
                  timeout: 10000
                })
              }
            }
          } catch (error) {
            console.error('Leave escrow error:', error)
          }
        }
      }

      sendSystemMessage(roomId, io, `${socket.data.displayName} hat den Raum verlassen`)
      const updatedRoom = roomManager.leaveRoom(roomId, socket.data.userId)
      socket.leave(roomId)
      if (updatedRoom) {
        io.to(roomId).emit('room:player-left', { userId: socket.data.userId })
        io.to(roomId).emit('room:update', updatedRoom)
        if (updatedRoom.hostId !== socket.data.userId) {
          io.to(roomId).emit('room:new-host', { hostId: updatedRoom.hostId })
        }
      }
      io.emit('room:list-update', roomManager.getPublicRooms())
      callback?.({ success: true })
    })

    // Handle player kick
    socket.on('room:kick', ({ roomId, targetUserId }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room || room.hostId !== socket.data.userId) {
        callback?.({ error: 'Not host' })
        return
      }
      const targetPlayer = room.players.find(p => p.userId === targetUserId)
      const targetName = targetPlayer?.displayName || 'Spieler'
      roomManager.leaveRoom(roomId, targetUserId)
      io.to(roomId).emit('room:player-kicked', { userId: targetUserId })
      sendSystemMessage(roomId, io, `${targetName} wurde entfernt`)
      io.emit('room:list-update', roomManager.getPublicRooms())
      callback?.({ success: true })
    })

    socket.on('room:select-team', ({ roomId, teamId }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room || room.status !== 'waiting') {
        callback?.({ error: 'Raum nicht in Wartestatus' })
        return
      }
      if (room.gameType !== 'kniffel') {
        callback?.({ error: 'Teamwahl nur bei Kniffel verfügbar' })
        return
      }

      const cfg = getKniffelTeamConfig(room.kniffelMode || 'classic')
      if (!cfg) {
        callback?.({ error: 'In diesem Modus gibt es keine Teams' })
        return
      }
      if (teamId !== 'team-a' && teamId !== 'team-b') {
        callback?.({ error: 'Ungültiges Team' })
        return
      }

      const playerIndex = room.players.findIndex(player => player.userId === socket.data.userId)
      if (playerIndex === -1) {
        callback?.({ error: 'Spieler nicht im Raum' })
        return
      }

      const occupiedSeats = room.players.filter(
        player => player.userId !== socket.data.userId && player.teamId === teamId
      ).length

      if (occupiedSeats >= cfg.perTeam) {
        callback?.({ error: `${teamId === 'team-a' ? 'Team A' : 'Team B'} ist voll` })
        return
      }

      room.players[playerIndex].teamId = teamId
      io.to(roomId).emit('room:update', room)
      callback?.({ success: true, teamId })
    })

    // Handle state recovery request
    // Handle auth user info request
    socket.on('auth:get-user', () => {
      socket.emit('auth:success', {
        userId: socket.data.userId,
        displayName: socket.data.displayName,
        role: socket.data.role,
      })
    })

    socket.on('request-state', () => {
      console.log(`State recovery requested by ${socket.data.userId}`)
      const userRooms = roomManager.getUserRooms(socket.data.userId)
      if (userRooms.length > 0) {
        const room = userRooms[0] // User's active room
        socket.emit('room:state', { room })
      }
    })

    // Handle chat message send
    socket.on('chat:send', ({ roomId, content }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room) {
        callback?.({ error: 'Room not found' })
        return
      }

      // Verify user is in room (player or spectator)
      const isInRoom = room.players.some(p => p.userId === socket.data.userId)
        || room.spectators.includes(socket.data.userId)
      if (!isInRoom) {
        callback?.({ error: 'Not in room' })
        return
      }

      // Sanitize content (trim, max 500 chars, no empty)
      const sanitized = content?.trim().slice(0, 500)
      if (!sanitized) {
        callback?.({ error: 'Empty message' })
        return
      }

      const message = {
        id: randomUUID(),
        roomId,
        userId: socket.data.userId,
        displayName: socket.data.displayName,
        content: sanitized,
        isSystem: false,
        timestamp: Date.now()
      }

      // Store in room chat history (keep last 100 messages)
      room.chat.push(message)
      if (room.chat.length > 100) room.chat.shift()

      // Broadcast to room
      io.to(roomId).emit('chat:message', message)
      callback?.({ success: true })
    })

    // Handle chat history request
    socket.on('chat:history', ({ roomId }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room) {
        callback?.([])
        return
      }
      callback?.(room.chat || [])
    })

    // Handle player ready toggle
    socket.on('game:player-ready', ({ roomId }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room || room.status !== 'waiting') {
        callback?.({ error: 'Invalid' })
        return
      }
      const player = room.players.find(p => p.userId === socket.data.userId)
      if (!player) {
        callback?.({ error: 'Not in room' })
        return
      }
      const teamCfg = room.gameType === 'kniffel' ? getKniffelTeamConfig(room.kniffelMode || 'classic') : null
      if (teamCfg && !player.teamId) {
        callback?.({ error: 'Bitte zuerst ein Team wählen' })
        return
      }
      player.isReady = !player.isReady
      io.to(roomId).emit('room:player-ready', {
        userId: socket.data.userId,
        isReady: player.isReady
      })
      io.to(roomId).emit('room:update', room)
      callback?.({ success: true, isReady: player.isReady })
    })

    socket.on('game:pause-vote', ({ roomId, vote }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room || !room.gameState || room.status !== 'playing') {
        callback?.({ error: 'Kein aktives Spiel' })
        return
      }
      if (room.gameType !== 'kniffel') {
        callback?.({ error: 'Ungültiger Spieltyp für diese Aktion' })
        return
      }
      if (room.gameState.phase !== 'rolling') {
        callback?.({ error: 'Spiel ist gerade nicht pausierbar' })
        return
      }
      if (!room.gameState.players.some(p => p.userId === socket.data.userId)) {
        callback?.({ error: 'Du bist kein aktiver Spieler' })
        return
      }

      if (!room.pauseVotes) {
        callback?.({ error: 'Keine aktive Pause-Abstimmung' })
        return
      }

      room.pauseVotes.votedYes = room.pauseVotes.votedYes.filter(id => id !== socket.data.userId)
      room.pauseVotes.votedNo = room.pauseVotes.votedNo.filter(id => id !== socket.data.userId)

      if (vote) room.pauseVotes.votedYes.push(socket.data.userId)
      else room.pauseVotes.votedNo.push(socket.data.userId)

      io.to(roomId).emit('room:update', room)

      if (room.pauseVotes.votedYes.length >= room.pauseVotes.required) {
        clearTurnTimer(roomId)
        room.pauseVotes = null
        room.gameState.phase = 'paused'
        room.gameState.turnStartedAt = null
        room.gameState.players = room.gameState.players.map(player => ({
          ...player,
          isReady: false
        }))

        sendSystemMessage(roomId, io, 'Spiel pausiert. Alle Spieler müssen wieder auf Bereit klicken.')
        io.to(roomId).emit('game:state-update', { state: room.gameState, roomId })
        io.to(roomId).emit('room:update', room)
      }

      callback?.({ success: true })
    })

    socket.on('game:start-pause-vote', ({ roomId }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room || !room.gameState || room.status !== 'playing') {
        callback?.({ error: 'Kein aktives Spiel' })
        return
      }
      if (room.gameType !== 'kniffel') {
        callback?.({ error: 'Ungültiger Spieltyp für diese Aktion' })
        return
      }
      if (room.gameState.phase !== 'rolling') {
        callback?.({ error: 'Spiel ist gerade nicht pausierbar' })
        return
      }
      const starter = room.gameState.players.find(p => p.userId === socket.data.userId)
      if (!starter) {
        callback?.({ error: 'Du bist kein aktiver Spieler' })
        return
      }
      if (room.pauseVotes) {
        callback?.({ error: 'Pause-Abstimmung läuft bereits' })
        return
      }

      const total = room.gameState.players.length
      room.pauseVotes = {
        votedYes: [starter.userId],
        votedNo: [],
        total,
        required: getMajorityRequired(total)
      }

      io.to(roomId).emit('room:update', room)
      io.to(roomId).emit('game:pause-vote-started', {
        roomId,
        starterUserId: starter.userId,
        starterName: starter.displayName
      })

      if (room.pauseVotes.votedYes.length >= room.pauseVotes.required) {
        clearTurnTimer(roomId)
        room.pauseVotes = null
        room.gameState.phase = 'paused'
        room.gameState.turnStartedAt = null
        room.gameState.players = room.gameState.players.map(player => ({
          ...player,
          isReady: false
        }))

        sendSystemMessage(roomId, io, 'Spiel pausiert. Alle Spieler müssen wieder auf Bereit klicken.')
        io.to(roomId).emit('game:state-update', { state: room.gameState, roomId })
        io.to(roomId).emit('room:update', room)
      }

      callback?.({ success: true })
    })

    socket.on('game:resume-ready', ({ roomId }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room || !room.gameState || room.status !== 'playing') {
        callback?.({ error: 'Kein aktives Spiel' })
        return
      }
      if (room.gameType !== 'kniffel') {
        callback?.({ error: 'Ungültiger Spieltyp für diese Aktion' })
        return
      }
      if (room.gameState.phase !== 'paused') {
        callback?.({ error: 'Spiel ist nicht pausiert' })
        return
      }

      const playerIndex = room.gameState.players.findIndex(p => p.userId === socket.data.userId)
      if (playerIndex === -1) {
        callback?.({ error: 'Du bist kein aktiver Spieler' })
        return
      }

      room.gameState.players[playerIndex] = {
        ...room.gameState.players[playerIndex],
        isReady: !room.gameState.players[playerIndex].isReady
      }

      const allReady = room.gameState.players.length > 0 && room.gameState.players.every(p => p.isReady)

      if (allReady) {
        room.gameState.players = room.gameState.players.map(player => ({
          ...player,
          isReady: false
        }))
        room.gameState.phase = 'rolling'
        room.gameState.turnStartedAt = Date.now()
        startTurnTimer(roomId, io)
        sendSystemMessage(roomId, io, 'Pause beendet. Das Spiel läuft weiter.')
      }

      io.to(roomId).emit('game:state-update', { state: room.gameState, roomId })
      io.to(roomId).emit('room:update', room)

      callback?.({
        success: true,
        isReady: room.gameState.players[playerIndex].isReady,
        readyCount: room.gameState.players.filter(p => p.isReady).length,
        total: room.gameState.players.length
      })
    })

    // Handle dice roll
    socket.on('game:roll-dice', ({ roomId, keptDice }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room || !room.gameState) {
        callback?.({ error: 'No game' })
        return
      }
      if (room.gameType !== 'kniffel') {
        callback?.({ error: 'Invalid game type for this action' })
        return
      }
      const gs = room.gameState

      // Generate new dice via imported crypto-rng
      const newDiceValues = rollDice(5)

      // Apply action via imported state machine
      const action = {
        type: 'ROLL_DICE',
        keptDice: keptDice || [false, false, false, false, false],
        newDice: newDiceValues
      }
      const result = applyAction(gs, action, socket.data.userId)

      if (result instanceof Error) {
        callback?.({ error: result.message })
        return
      }

      // Update game state with result from state machine
      room.gameState = result

      const currentPlayer = result.players[result.currentPlayerIndex]
      currentPlayer.lastActivity = Date.now()
      currentPlayer.consecutiveInactive = 0

      // Cancel AFK warning if active
      const warningKey = `${roomId}:${socket.data.userId}`
      const existingWarning = afkWarnings.get(warningKey)
      if (existingWarning) {
        clearTimeout(existingWarning)
        afkWarnings.delete(warningKey)
        io.to(`user:${socket.data.userId}`).emit('bet:afk-warning-cancel')
      }

      // Reset turn timer
      result.turnStartedAt = Date.now()
      resetTurnTimer(roomId, io)

      io.to(roomId).emit('game:state-update', { state: result, roomId })
      sendSystemMessage(roomId, io, `${currentPlayer.displayName} hat gewürfelt`)
      callback?.({ success: true, dice: result.dice })
    })

    // Handle category selection
    socket.on('game:choose-category', async ({ roomId, category }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room || !room.gameState) {
        callback?.({ error: 'No game' })
        return
      }
      if (room.gameType !== 'kniffel') {
        callback?.({ error: 'Invalid game type for this action' })
        return
      }
      const gs = room.gameState

      // Apply action via imported state machine (which internally uses calculateScore)
      const action = { type: 'CHOOSE_CATEGORY', category }
      const result = applyAction(gs, action, socket.data.userId)

      if (result instanceof Error) {
        callback?.({ error: result.message })
        return
      }

      // Calculate score for the message (before state update)
      const scoredPlayer = gs.players[gs.currentPlayerIndex]
      const score = calculateScore(category, gs.dice)

      // Cancel AFK warning if active
      const warningKey = `${roomId}:${socket.data.userId}`
      const existingWarning = afkWarnings.get(warningKey)
      if (existingWarning) {
        clearTimeout(existingWarning)
        afkWarnings.delete(warningKey)
        io.to(`user:${socket.data.userId}`).emit('bet:afk-warning-cancel')
      }

      // Update game state
      room.gameState = result

      sendSystemMessage(
        roomId,
        io,
        `${scoredPlayer.displayName} hat ${category} gewählt (${score} Punkte)`
      )

      // Check if game ended
      if (result.phase === 'ended') {
        room.status = 'ended'
        room.pauseVotes = null
        clearTurnTimer(roomId)
        const winnerPlayer = result.players.find(p => p.userId === result.winner)
        const winnerTotal = calculateTotalScore(winnerPlayer.scoresheet)
        sendSystemMessage(
          roomId,
          io,
          `Spiel beendet! Gewinner: ${winnerPlayer.displayName} (${winnerTotal} Punkte)`
        )

        // Handle bet room payouts
        let payoutData = null
        if (room.isBetRoom) {
          try {
            // Calculate total pot from LOCKED escrows
            const escrows = await prisma.betEscrow.findMany({
              where: { roomId, status: 'LOCKED' }
            })
            const totalPot = escrows.reduce((sum, e) => sum + e.amount, 0)

            // Build rankings
            const rankings = buildRankings(result)

            // Calculate payouts
            const payouts = calculatePayouts(totalPot, rankings, room.payoutRatios)

            // Distribute payouts and release escrows
            await prisma.$transaction(async (tx) => {
              // Credit winners
              for (const [userId, amount] of payouts.entries()) {
                if (amount > 0) {
                  const player = result.players.find(p => p.userId === userId)
                  const position = rankings.find(r => r.userIds.includes(userId))?.position || 0

                  const updatedWallet = await tx.wallet.update({
                    where: { userId },
                    data: { balance: { increment: amount } }
                  })

                  await tx.transaction.create({
                    data: {
                      type: 'GAME_WIN',
                      amount,
                      userId,
                      description: `${room.name} gewonnen (${position}. Platz)`
                    }
                  })

                  // Emit balance update with correct new balance
                  emitBalanceUpdate(io, userId, updatedWallet.balance, amount, `${room.name} gewonnen`)
                }
              }

              // Release all escrows
              await tx.betEscrow.updateMany({
                where: { roomId, status: 'LOCKED' },
                data: {
                  status: 'RELEASED',
                  releasedAt: new Date()
                }
              })
            }, {
              isolationLevel: 'Serializable',
              maxWait: 5000,
              timeout: 10000
            })

            // Build payout data for client
            payoutData = Array.from(payouts.entries()).map(([userId, amount]) => {
              const player = result.players.find(p => p.userId === userId)
              const position = rankings.find(r => r.userIds.includes(userId))?.position || 0
              return {
                userId,
                displayName: player?.displayName || 'Unknown',
                position,
                amount
              }
            })

            room.payouts = payoutData
          } catch (error) {
            console.error('Payout error:', error)
          }
        }

        // Initialize rematch voting
        room.rematchVotes = {
          votedYes: [],
          votedNo: [],
          total: result.players.length,
          required: Math.ceil(result.players.length / 2)
        }

        io.to(roomId).emit('room:update', room)
        const teamSummary = room.gameType === 'kniffel' ? buildKniffelTeamSummary(result) : null
        io.to(roomId).emit('game:ended', {
          winner: result.winner,
          winnerTeamId: teamSummary?.winnerTeamId || null,
          teamScores: teamSummary?.teamScores || null,
          scores: result.players.map(p => ({
            userId: p.userId,
            displayName: p.displayName,
            total: calculateTotalScore(p.scoresheet)
          })),
          payouts: payoutData
        })
        io.emit('room:list-update', roomManager.getPublicRooms())
      } else {
        // Restart turn timer for next player
        result.turnStartedAt = Date.now()
        startTurnTimer(roomId, io)
      }

      io.to(roomId).emit('game:state-update', { state: result, roomId })
      callback?.({ success: true, score })
    })

    // Handle game start
    socket.on('game:start', async ({ roomId, force }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room) {
        callback?.({ error: 'Room not found' })
        return
      }
      if (room.hostId !== socket.data.userId) {
        callback?.({ error: 'Not host' })
        return
      }

      // House games (blackjack, roulette) can be played solo; others need 2+
      const isHouseGame = room.gameType === 'blackjack' || room.gameType === 'roulette'
      const minPlayers = isHouseGame ? 1 : 2

      let gamePlayers
      let pendingSpectators = []
      if (force) {
        if (room.players.length < minPlayers) {
          callback?.({ error: minPlayers === 1 ? 'Need at least 1 player' : 'Need at least 2 players' })
          return
        }
        gamePlayers = room.players
      } else {
        const readyPlayers = room.players.filter(p => p.isReady)
        if (readyPlayers.length < minPlayers) {
          callback?.({ error: minPlayers === 1 ? 'Need at least 1 ready player' : 'Need at least 2 ready players' })
          return
        }
        pendingSpectators = room.players.filter(p => !p.isReady)
        gamePlayers = readyPlayers
      }

      if (room.gameType === 'kniffel') {
        const kniffelMode = room.kniffelMode || 'classic'
        const cfg = getKniffelTeamConfig(kniffelMode)
        if (cfg) {
          const teamAPlayers = gamePlayers.filter(player => player.teamId === 'team-a')
          const teamBPlayers = gamePlayers.filter(player => player.teamId === 'team-b')
          if (gamePlayers.length !== cfg.total) {
            callback?.({ error: `Für ${kniffelMode === 'team2v2' ? '2v2' : '3v3'} werden genau ${cfg.total} Spieler benötigt` })
            return
          }
          if (teamAPlayers.length !== cfg.perTeam || teamBPlayers.length !== cfg.perTeam) {
            callback?.({ error: 'Teams sind nicht vollständig besetzt' })
            return
          }
          if (gamePlayers.some(player => !player.teamId)) {
            callback?.({ error: 'Nicht alle Spieler haben ein Team gewählt' })
            return
          }
        }
      }

      if (pendingSpectators.length > 0) {
        for (const spectator of pendingSpectators) {
          room.spectators.push(spectator.userId)
          sendSystemMessage(roomId, io, `${spectator.displayName} schaut zu (nicht bereit)`)
        }
      }

      room.players = gamePlayers

      // Create initial game state based on game type
      const playerData = gamePlayers.map(p => ({
        userId: p.userId,
        displayName: p.displayName
      }))

      if (room.gameType === 'kniffel') {
        const kniffelMode = room.kniffelMode || 'classic'
        const teamSetup = buildKniffelTeams(gamePlayers, kniffelMode)
        if (teamSetup.error) {
          callback?.({ error: teamSetup.error })
          return
        }

        // Use imported createInitialState from state-machine.ts for Kniffel
        const settings = {
          turnTimer: room.turnTimer,
          afkThreshold: room.afkThreshold,
          kniffelMode,
          teams: teamSetup.teams
        }
        room.gameState = createInitialState(playerData, settings)
        room.gameState.phase = 'rolling'
        room.gameState.turnStartedAt = Date.now()
      } else if (room.gameType === 'blackjack') {
        // Use createBlackjackState from state-machine.ts
        const settings = {
          deckCount: room.blackjackSettings?.deckCount || 6,
          turnTimer: room.turnTimer,
          soloHandCount: room.blackjackSettings?.soloHandCount || 1
        }
        room.gameState = createBlackjackState(playerData, settings)
      } else if (room.gameType === 'roulette') {
        // Use createRouletteState from state-machine.ts
        const rouletteTimerSec = room.rouletteSettings?.spinTimerSec ?? 30
        const settings = {
          spinTimerSec: rouletteTimerSec,
          isManualSpin: rouletteTimerSec === 0
        }
        room.gameState = createRouletteState(playerData, settings)

        // Start auto-spin timer if not manual
        if (!settings.isManualSpin && settings.spinTimerSec > 0) {
          startSpinTimer(roomId, io, roomManager, prisma)
        }
      } else if (room.gameType === 'poker') {
        // Create shuffled deck with CSPRNG
        const deck = shuffleDeck(createDeck())

        // Convert buy-in to chips
        const settings = {
          smallBlind: room.pokerSettings?.smallBlind || 10,
          bigBlind: room.pokerSettings?.bigBlind || 20,
          startingChips: room.pokerSettings?.startingChips || 1000,
          blindEscalation: room.pokerSettings?.blindEscalation ?? false,
          blindInterval: room.pokerSettings?.blindInterval || 10,
          turnTimer: room.turnTimer || 30
        }

        room.gameState = createPokerState(playerData, settings, deck)

        // Auto-post blinds and start first hand
        const blindsResult = applyPokerAction(room.gameState, { type: 'POST_BLINDS' }, playerData[0].userId)
        if (!(blindsResult instanceof Error)) {
          room.gameState = blindsResult
        }
      }

      room.status = 'playing'
      room.pauseVotes = null

      // Lock all PENDING escrows for bet rooms
      if (room.isBetRoom) {
        try {
          await prisma.betEscrow.updateMany({
            where: {
              roomId,
              status: 'PENDING'
            },
            data: {
              status: 'LOCKED',
              lockedAt: new Date()
            }
          })
        } catch (error) {
          console.error('Failed to lock escrows:', error)
        }
      }

      sendSystemMessage(roomId, io, 'Das Spiel beginnt!')
      io.to(roomId).emit('room:update', room)

      // Emit personalized state for poker, regular state for other games
      if (room.gameType === 'poker') {
        emitPokerState(io, roomId, room)
      } else {
        io.to(roomId).emit('game:state-update', { state: room.gameState, roomId })
      }

      io.emit('room:list-update', roomManager.getPublicRooms())

      // Start turn timer (only for Kniffel for now)
      if (room.gameType === 'kniffel') {
        startTurnTimer(roomId, io)
      }
      callback?.({ success: true })
    })

    // Placeholder handlers for new game types (will be implemented in later plans)
    socket.on('game:blackjack-action', ({ roomId, action }, callback) => {
      callback?.({ error: 'Blackjack not yet implemented (Plan 04-03)' })
    })

    socket.on('game:roulette-action', ({ roomId, action }, callback) => {
      callback?.({ error: 'Roulette not yet implemented (Plan 04-04)' })
    })

    socket.on('game:poker-action', ({ roomId, action }, callback) => {
      callback?.({ error: 'Poker not yet implemented (Plan 04-05)' })
    })

    // Handle game abort (host only)
    socket.on('game:abort', ({ roomId }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room) {
        callback?.({ error: 'Room not found' })
        return
      }
      if (room.hostId !== socket.data.userId) {
        callback?.({ error: 'Not host' })
        return
      }

      clearTurnTimer(roomId)
      room.gameState = null
      room.status = 'waiting'
      room.pauseVotes = null
      // Reset all players to not ready
      for (const p of room.players) {
        p.isReady = false
      }

      sendSystemMessage(roomId, io, `${socket.data.displayName} hat das Spiel abgebrochen`)
      io.to(roomId).emit('game:aborted')
      io.to(roomId).emit('room:update', room)
      io.emit('room:list-update', roomManager.getPublicRooms())
      callback?.({ success: true })
    })

    // Handle rematch voting
    socket.on('game:rematch-vote', ({ roomId, vote }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room || !room.rematchVotes) {
        callback?.({ error: 'No vote active' })
        return
      }

      const rv = room.rematchVotes
      // Remove existing vote from this user
      rv.votedYes = rv.votedYes.filter(id => id !== socket.data.userId)
      rv.votedNo = rv.votedNo.filter(id => id !== socket.data.userId)

      if (vote) rv.votedYes.push(socket.data.userId)
      else rv.votedNo.push(socket.data.userId)

      io.to(roomId).emit('game:rematch-update', rv)

      // Check if majority voted yes
      if (rv.votedYes.length >= rv.required) {
        room.status = 'waiting'
        room.gameState = null
        room.rematchVotes = null
        room.pauseVotes = null
        for (const p of room.players) { p.isReady = false }
        io.to(roomId).emit('game:rematch-accepted')
        sendSystemMessage(roomId, io, 'Noch eine Runde! Alle bereit machen...')
        io.emit('room:list-update', roomManager.getPublicRooms())
      } else if (rv.votedNo.length > rv.total - rv.required) {
        io.to(roomId).emit('game:rematch-declined')
        sendSystemMessage(roomId, io, 'Kein Rematch. Zurück zur Lobby.')
      }

      callback?.({ success: true })
    })

    // [AFK_ACKNOWLEDGE_HANDLER]
    socket.on('bet:afk-acknowledge', ({ roomId }) => {
      const room = roomManager.getRoom(roomId)
      if (!room) return

      const warningKey = `${roomId}:${socket.data.userId}`
      const existingWarning = afkWarnings.get(warningKey)

      if (existingWarning) {
        clearTimeout(existingWarning)
        afkWarnings.delete(warningKey)

        // Reset consecutive inactive count
        const player = room.gameState?.players.find(p => p.userId === socket.data.userId)
        if (player) {
          player.consecutiveInactive = 0
        }

        // Notify client warning is canceled
        io.to(`user:${socket.data.userId}`).emit('bet:afk-warning-cancel', { roomId })

        sendSystemMessage(roomId, io, `${socket.data.displayName} ist wieder da`)
      }
    })

    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.data.userId}`)

      // [ESCROW_DISCONNECT_CLEANUP] - Handle escrow before removing user
      const userRoomIds = roomManager.getUserRooms(socket.data.userId).map(r => r.id)

      for (const roomId of userRoomIds) {
        const room = roomManager.getRoom(roomId)
        if (!room) continue

        if (room.isBetRoom) {
          const wasPlayer = room.players.some(p => p.userId === socket.data.userId)
          if (wasPlayer) {
            try {
              const escrow = await prisma.betEscrow.findFirst({
                where: { roomId, userId: socket.data.userId }
              })
              if (escrow) {
                if (escrow.status === 'PENDING') {
                  // Pre-game: refund
                  const wallet = await getWalletWithUser(socket.data.userId)
                  await prisma.$transaction(async (tx) => {
                    await tx.wallet.update({
                      where: { userId: socket.data.userId },
                      data: { balance: { increment: escrow.amount } }
                    })
                    await tx.transaction.create({
                      data: { type: 'BET_REFUND', amount: escrow.amount, userId: socket.data.userId, description: `Einsatz zurück: ${room.name}` }
                    })
                    await tx.betEscrow.update({
                      where: { id: escrow.id },
                      data: { status: 'RELEASED', releasedAt: new Date() }
                    })
                  }, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 })
                  emitBalanceUpdate(io, socket.data.userId, wallet.balance + escrow.amount, escrow.amount, `Einsatz zurück: ${room.name}`)
                } else if (escrow.status === 'LOCKED') {
                  // Mid-game: forfeit
                  await prisma.$transaction(async (tx) => {
                    await tx.betEscrow.update({ where: { id: escrow.id }, data: { status: 'FORFEITED' } })
                    await tx.transaction.create({
                      data: { type: 'BET_FORFEIT', amount: escrow.amount, userId: socket.data.userId, description: `Einsatz verfallen: ${room.name}` }
                    })
                  }, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 })
                }
              }
            } catch (error) {
              console.error('Disconnect escrow error:', error)
            }
          }
        }

        // Handle poker-specific disconnect
        if (room.gameType === 'poker' && room.gameState && room.status === 'playing') {
          const disconnectAction = { type: 'PLAYER_DISCONNECT', userId: socket.data.userId }
          const result = applyPokerAction(room.gameState, disconnectAction, socket.data.userId)
          if (!(result instanceof Error)) {
            room.gameState = result
            emitPokerState(io, room.id, room)
          }
        }

        sendSystemMessage(room.id, io, `${socket.data.displayName} hat den Raum verlassen`)
        io.to(room.id).emit('room:player-left', { userId: socket.data.userId })
      }

      // Now remove from all rooms
      roomManager.removeUserFromAllRooms(socket.data.userId)
      io.emit('room:list-update', roomManager.getPublicRooms())
    })
  })

  // Periodic cleanup of stale rooms
  setInterval(() => roomManager.cleanup(), 60000) // Every 60s

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
