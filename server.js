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

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000

// Load .env and .env.local before accessing env vars
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
    const roomId = randomUUID()

    // Get default payout ratios from SystemSettings if not provided
    let payoutRatios = settings.payoutRatios
    if (!payoutRatios && settings.isBetRoom) {
      try {
        const systemSettings = await prisma.systemSettings.findFirst()
        payoutRatios = systemSettings?.defaultPayoutRatios || [
          { position: 1, percentage: 60 },
          { position: 2, percentage: 30 },
          { position: 3, percentage: 10 }
        ]
      } catch (error) {
        console.error('Failed to fetch default payout ratios:', error)
        // Fallback to defaults
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
      gameType: 'kniffel',
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
      players: [{ userId: hostId, displayName: hostName, isReady: false }],
      spectators: [],
      gameState: null,
      chat: [],
      createdAt: Date.now()
    }
    this.rooms.set(roomId, room)
    this._trackUser(hostId, roomId)
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

    room.players.push({ userId, displayName, isReady: false })
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

// Turn timer management
const turnTimers = new Map() // roomId -> timeout
const afkWarnings = new Map() // roomId:userId -> timeout

function startTurnTimer(roomId, io) {
  clearTurnTimer(roomId)
  const room = roomManager.getRoom(roomId)
  if (!room || !room.gameState || room.gameState.phase === 'ended') return

  const timeout = setTimeout(() => {
    autoPlay(roomId, io)
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
function autoPlay(roomId, io) {
  const room = roomManager.getRoom(roomId)
  if (!room || !room.gameState || room.gameState.phase === 'ended') return
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
          message: `Du wirst in ${gracePeriodSec} Sekunden wegen Inaktivitaet entfernt. Dein Einsatz verfaellt.`
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

              await tx.wallet.update({
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

              // Emit balance update
              emitBalanceUpdate(io, userId, 0, amount, `${room.name} gewonnen`)
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
    io.to(roomId).emit('game:ended', { winner: result.winner, scores: result.players.map(p => ({ userId: p.userId, displayName: p.displayName, total: calculateTotalScore(p.scoresheet) })), payouts: payoutData })
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
    clearTurnTimer(roomId)
    const winner = room.gameState.players[0]
    if (winner) {
      sendSystemMessage(roomId, io, `${winner.displayName} gewinnt! Alle anderen Spieler waren AFK.`)
    }
    io.to(roomId).emit('game:ended', { winner: room.gameState.winner, scores: room.gameState.players.map(p => ({ userId: p.userId, displayName: p.displayName, total: calculateTotalScore(p.scoresheet) })) })
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

  // Helper function to send system messages
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

  // Helper function to emit balance updates
  function emitBalanceUpdate(io, userId, newBalance, change, description) {
    io.to(`user:${userId}`).emit('balance:updated', {
      newBalance,
      change,
      description
    })
  }

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(
      `Client connected: ${socket.data.userId} (${socket.data.role})`
    )

    // Join user-specific room for balance updates
    socket.join(`user:${socket.data.userId}`)

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

        // Validate bet settings
        if (settings.isBetRoom) {
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

        const room = await roomManager.createRoom(
          socket.data.userId,
          socket.data.displayName,
          settings
        )
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
        return
      }

      // For bet rooms, handle escrow
      if (room.isBetRoom && room.status === 'waiting') {
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

          // Sufficient balance: debit and create escrow
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
                      description: `Einsatz zurueck: ${room.name}`
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
                emitBalanceUpdate(io, socket.data.userId, wallet.balance + escrow.amount, escrow.amount, `Einsatz zurueck: ${room.name}`)
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
      player.isReady = !player.isReady
      io.to(roomId).emit('room:player-ready', {
        userId: socket.data.userId,
        isReady: player.isReady
      })
      io.to(roomId).emit('room:update', room)
      callback?.({ success: true, isReady: player.isReady })
    })

    // Handle dice roll
    socket.on('game:roll-dice', ({ roomId, keptDice }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room || !room.gameState) {
        callback?.({ error: 'No game' })
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
      sendSystemMessage(roomId, io, `${currentPlayer.displayName} hat gewuerfelt`)
      callback?.({ success: true, dice: result.dice })
    })

    // Handle category selection
    socket.on('game:choose-category', ({ roomId, category }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room || !room.gameState) {
        callback?.({ error: 'No game' })
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
        `${scoredPlayer.displayName} hat ${category} gewaehlt (${score} Punkte)`
      )

      // Check if game ended
      if (result.phase === 'ended') {
        room.status = 'ended'
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

                  await tx.wallet.update({
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

                  // Emit balance update
                  emitBalanceUpdate(io, userId, 0, amount, `${room.name} gewonnen`)
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
        io.to(roomId).emit('game:ended', {
          winner: result.winner,
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
    socket.on('game:start', ({ roomId, force }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room) {
        callback?.({ error: 'Room not found' })
        return
      }
      if (room.hostId !== socket.data.userId) {
        callback?.({ error: 'Not host' })
        return
      }

      let gamePlayers
      if (force) {
        // Force start: need at least 2 players total in the room
        if (room.players.length < 2) {
          callback?.({ error: 'Need at least 2 players' })
          return
        }
        gamePlayers = room.players
      } else {
        const readyPlayers = room.players.filter(p => p.isReady)
        if (readyPlayers.length < 2) {
          callback?.({ error: 'Need at least 2 ready players' })
          return
        }
        // Move non-ready players to spectators
        const notReady = room.players.filter(p => !p.isReady)
        for (const p of notReady) {
          room.spectators.push(p.userId)
          sendSystemMessage(roomId, io, `${p.displayName} schaut zu (nicht bereit)`)
        }
        gamePlayers = readyPlayers
      }

      room.players = gamePlayers

      // Use imported createInitialState from state-machine.ts
      const playerData = gamePlayers.map(p => ({
        userId: p.userId,
        displayName: p.displayName
      }))
      const settings = {
        turnTimer: room.turnTimer,
        afkThreshold: room.afkThreshold
      }
      room.gameState = createInitialState(playerData, settings)
      room.gameState.phase = 'rolling'
      room.gameState.turnStartedAt = Date.now()
      room.status = 'playing'

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
      io.to(roomId).emit('game:state-update', { state: room.gameState, roomId })
      io.emit('room:list-update', roomManager.getPublicRooms())

      // Start turn timer
      startTurnTimer(roomId, io)
      callback?.({ success: true })
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
        for (const p of room.players) { p.isReady = false }
        io.to(roomId).emit('game:rematch-accepted')
        sendSystemMessage(roomId, io, 'Noch eine Runde! Alle bereit machen...')
        io.emit('room:list-update', roomManager.getPublicRooms())
      } else if (rv.votedNo.length > rv.total - rv.required) {
        io.to(roomId).emit('game:rematch-declined')
        sendSystemMessage(roomId, io, 'Kein Rematch. Zurueck zur Lobby.')
      }

      callback?.({ success: true })
    })

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.data.userId}`)
      const affectedRooms = roomManager.removeUserFromAllRooms(socket.data.userId)
      for (const room of affectedRooms) {
        sendSystemMessage(room.id, io, `${socket.data.displayName} hat den Raum verlassen`)
        io.to(room.id).emit('room:player-left', { userId: socket.data.userId })
      }
      io.emit('room:list-update', roomManager.getPublicRooms())
    })
  })

  // Periodic cleanup of stale rooms
  setInterval(() => roomManager.cleanup(), 60000) // Every 60s

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
