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

  createRoom(hostId, hostName, settings) {
    const roomId = randomUUID()
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
        createdAt: r.createdAt
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

// Turn timer management
const turnTimers = new Map() // roomId -> timeout

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
    kickPlayerAFK(room, roomId, currentPlayer, io)
    return
  }

  // Check if game ended
  if (result.phase === 'ended') {
    room.status = 'ended'
    clearTurnTimer(roomId)
    const winnerPlayer = result.players.find(p => p.userId === result.winner)
    const winnerTotal = calculateTotalScore(winnerPlayer.scoresheet)
    sendSystemMessage(roomId, io, `Spiel beendet! Gewinner: ${winnerPlayer.displayName} (${winnerTotal} Punkte)`)
    room.rematchVotes = { votedYes: [], votedNo: [], total: result.players.length, required: Math.ceil(result.players.length / 2) }
    io.to(roomId).emit('game:ended', { winner: result.winner, scores: result.players.map(p => ({ userId: p.userId, displayName: p.displayName, total: calculateTotalScore(p.scoresheet) })) })
    io.emit('room:list-update', roomManager.getPublicRooms())
  } else {
    result.turnStartedAt = Date.now()
    startTurnTimer(roomId, io)
  }

  io.to(roomId).emit('game:state-update', { state: result, roomId })
}

// AFK kick
function kickPlayerAFK(room, roomId, player, io) {
  sendSystemMessage(roomId, io, `${player.displayName} wurde entfernt (AFK)`)
  room.gameState.players = room.gameState.players.filter(p => p.userId !== player.userId)
  room.players = room.players.filter(p => p.userId !== player.userId)

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
      origin: dev ? 'http://localhost:3000' : false,
      methods: ['GET', 'POST'],
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

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(
      `Client connected: ${socket.data.userId} (${socket.data.role})`
    )

    // Handle room list request
    socket.on('room:list', (callback) => {
      callback(roomManager.getPublicRooms())
    })

    // Handle room creation
    socket.on('room:create', ({ settings }, callback) => {
      const room = roomManager.createRoom(
        socket.data.userId,
        socket.data.displayName,
        settings
      )
      socket.join(room.id)
      callback({
        roomId: room.id,
        room: roomManager.getPublicRooms().find(r => r.id === room.id)
      })
      // Broadcast updated room list to lobby
      io.emit('room:list-update', roomManager.getPublicRooms())
    })

    // Handle room join
    socket.on('room:join', ({ roomId }, callback) => {
      const result = roomManager.joinRoom(
        roomId,
        socket.data.userId,
        socket.data.displayName
      )
      if (result.error) {
        callback({ error: result.error })
        return
      }
      socket.join(roomId)
      callback({ room: result.room, spectator: result.spectator || false })
      io.to(roomId).emit('room:player-joined', {
        userId: socket.data.userId,
        displayName: socket.data.displayName,
        spectator: result.spectator || false
      })
      sendSystemMessage(roomId, io, `${socket.data.displayName} ist beigetreten`)
      io.emit('room:list-update', roomManager.getPublicRooms())
    })

    // Handle room leave
    socket.on('room:leave', ({ roomId }, callback) => {
      sendSystemMessage(roomId, io, `${socket.data.displayName} hat den Raum verlassen`)
      const room = roomManager.leaveRoom(roomId, socket.data.userId)
      socket.leave(roomId)
      if (room) {
        io.to(roomId).emit('room:player-left', { userId: socket.data.userId })
        if (room.hostId !== socket.data.userId) {
          io.to(roomId).emit('room:new-host', { hostId: room.hostId })
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

    // Handle player ready
    socket.on('game:player-ready', ({ roomId }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room || !room.gameState) {
        callback?.({ error: 'Room not found or no game state' })
        return
      }

      const action = { type: 'PLAYER_READY' }
      const result = applyAction(room.gameState, action, socket.data.userId)

      if (result instanceof Error) {
        callback?.({ error: result.message })
        return
      }

      room.gameState = result

      // Update player ready status in room.players too
      const player = room.players.find(p => p.userId === socket.data.userId)
      if (player) player.isReady = true

      // If game started, start turn timer
      if (result.phase === 'rolling' && room.gameState.phase === 'rolling') {
        room.status = 'playing'
        sendSystemMessage(roomId, io, 'Spiel gestartet!')
        startTurnTimer(roomId, io)
        io.emit('room:list-update', roomManager.getPublicRooms())
      }

      io.to(roomId).emit('game:state-update', { state: result, roomId })
      callback?.({ success: true })
    })

    // Handle dice roll
    socket.on('game:roll-dice', ({ roomId, keptDice }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room || !room.gameState) {
        callback?.({ error: 'Room not found or no game state' })
        return
      }

      const newDice = rollDice(5)
      const action = { type: 'ROLL_DICE', keptDice, newDice }
      const result = applyAction(room.gameState, action, socket.data.userId)

      if (result instanceof Error) {
        callback?.({ error: result.message })
        return
      }

      room.gameState = result
      resetTurnTimer(roomId, io)

      io.to(roomId).emit('game:state-update', { state: result, roomId })
      callback?.({ success: true })
    })

    // Handle category choice
    socket.on('game:choose-category', ({ roomId, category }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room || !room.gameState) {
        callback?.({ error: 'Room not found or no game state' })
        return
      }

      const action = { type: 'CHOOSE_CATEGORY', category }
      const result = applyAction(room.gameState, action, socket.data.userId)

      if (result instanceof Error) {
        callback?.({ error: result.message })
        return
      }

      room.gameState = result
      const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex]

      // Reset consecutiveInactive on manual play
      currentPlayer.consecutiveInactive = 0

      const score = calculateScore(category, room.gameState.dice)
      sendSystemMessage(roomId, io, `${socket.data.displayName} wählt ${category} (${score} Punkte)`)

      // Check if game ended
      if (result.phase === 'ended') {
        room.status = 'ended'
        clearTurnTimer(roomId)
        const winnerPlayer = result.players.find(p => p.userId === result.winner)
        const winnerTotal = calculateTotalScore(winnerPlayer.scoresheet)
        sendSystemMessage(roomId, io, `Spiel beendet! Gewinner: ${winnerPlayer.displayName} (${winnerTotal} Punkte)`)
        room.rematchVotes = { votedYes: [], votedNo: [], total: result.players.length, required: Math.ceil(result.players.length / 2) }
        io.to(roomId).emit('game:ended', { winner: result.winner, scores: result.players.map(p => ({ userId: p.userId, displayName: p.displayName, total: calculateTotalScore(p.scoresheet) })) })
        io.emit('room:list-update', roomManager.getPublicRooms())
      } else {
        result.turnStartedAt = Date.now()
        startTurnTimer(roomId, io)
      }

      io.to(roomId).emit('game:state-update', { state: result, roomId })
      callback?.({ success: true })
    })

    // Handle game start
    socket.on('game:start', ({ roomId }, callback) => {
      const room = roomManager.getRoom(roomId)
      if (!room) {
        callback?.({ error: 'Room not found' })
        return
      }

      if (room.hostId !== socket.data.userId) {
        callback?.({ error: 'Only host can start game' })
        return
      }

      if (room.players.length < 2) {
        callback?.({ error: 'Need at least 2 players' })
        return
      }

      // Create initial game state
      const gameState = createInitialState(room.players, {
        turnTimer: room.turnTimer,
        afkThreshold: room.afkThreshold
      })

      room.gameState = gameState
      room.status = 'waiting'

      io.to(roomId).emit('game:state-update', { state: gameState, roomId })
      sendSystemMessage(roomId, io, 'Spiel vorbereitet. Alle Spieler bereit machen!')
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
