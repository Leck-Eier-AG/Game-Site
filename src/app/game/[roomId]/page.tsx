'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useSocket } from '@/lib/socket/provider'
import { WaitingRoom } from '@/components/game/WaitingRoom'
import type { GameState, RoomInfo } from '@/types/game'
import { useTranslations } from 'next-intl'

// Dynamically import GameBoard to prevent SSR issues with R3F
const GameBoard = dynamic(
  () => import('@/components/game/GameBoard').then(m => ({ default: m.GameBoard })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-green-500" />
          <p className="text-sm text-gray-400">Lade Spiel...</p>
        </div>
      </div>
    )
  }
)

interface RoomData extends RoomInfo {
  gameState?: GameState
  settings?: {
    turnTimer: number
    afkThreshold: number
  }
}

export default function GameRoomPage() {
  const params = useParams()
  const router = useRouter()
  const { socket, isConnected } = useSocket()
  const t = useTranslations()

  const roomId = params.roomId as string
  const [room, setRoom] = useState<RoomData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  useEffect(() => {
    if (!socket || !isConnected) return

    // Join the room
    socket.emit('room:join', { roomId })

    // Listen for room state updates
    const handleRoomUpdate = (data: RoomData) => {
      setRoom(data)
      setError(null)
    }

    // Listen for game state updates
    const handleGameStateUpdate = (data: { state: GameState; roomId: string }) => {
      if (data.roomId === roomId) {
        setRoom(prev => prev ? { ...prev, gameState: data.state } : null)
      }
    }

    // Listen for player joined
    const handlePlayerJoined = (data: { userId: string; displayName: string }) => {
      console.log('Player joined:', data.displayName)
    }

    // Listen for player left
    const handlePlayerLeft = (data: { userId: string; displayName: string }) => {
      console.log('Player left:', data.displayName)
    }

    // Listen for errors
    const handleError = (data: { message: string }) => {
      setError(data.message)
    }

    // Listen for kicked
    const handleKicked = () => {
      router.push('/lobby')
    }

    // Get current user ID from socket auth
    const handleAuthSuccess = (data: { userId: string }) => {
      setCurrentUserId(data.userId)
    }

    socket.on('room:update', handleRoomUpdate)
    socket.on('game:state-update', handleGameStateUpdate)
    socket.on('room:player-joined', handlePlayerJoined)
    socket.on('room:player-left', handlePlayerLeft)
    socket.on('room:error', handleError)
    socket.on('room:kicked', handleKicked)
    socket.on('auth:success', handleAuthSuccess)

    // Request current user info
    socket.emit('auth:get-user')

    // Cleanup: leave room on unmount
    return () => {
      socket.emit('room:leave', { roomId })
      socket.off('room:update', handleRoomUpdate)
      socket.off('game:state-update', handleGameStateUpdate)
      socket.off('room:player-joined', handlePlayerJoined)
      socket.off('room:player-left', handlePlayerLeft)
      socket.off('room:error', handleError)
      socket.off('room:kicked', handleKicked)
      socket.off('auth:success', handleAuthSuccess)
    }
  }, [socket, isConnected, roomId, router])

  // Loading state
  if (!isConnected || !socket) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-green-500" />
          <p className="text-sm text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg text-red-400">{error}</p>
          <button
            onClick={() => router.push('/lobby')}
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    )
  }

  // Room not loaded yet
  if (!room) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-green-500" />
          <p className="text-sm text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Render based on game status
  if (room.status === 'waiting') {
    return (
      <WaitingRoom
        room={room}
        currentUserId={currentUserId}
        socket={socket}
      />
    )
  }

  if (room.status === 'playing' && room.gameState) {
    return (
      <GameBoard
        gameState={room.gameState}
        roomId={roomId}
        currentUserId={currentUserId}
        socket={socket}
      />
    )
  }

  if (room.status === 'ended' && room.gameState) {
    // Simple game over screen
    const winner = room.gameState.players.reduce((prev, current) => {
      const prevScore = Object.values(prev.scoresheet).reduce((sum, val) => sum + (val ?? 0), 0)
      const currentScore = Object.values(current.scoresheet).reduce((sum, val) => sum + (val ?? 0), 0)
      return currentScore > prevScore ? current : prev
    })

    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="flex flex-col items-center gap-6">
          <h1 className="text-4xl font-bold text-white">{t('game.gameOver')}</h1>
          <p className="text-2xl text-green-400">
            {t('game.winner', { name: winner.displayName })}
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/lobby')}
              className="rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700"
            >
              {t('room.leave')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
