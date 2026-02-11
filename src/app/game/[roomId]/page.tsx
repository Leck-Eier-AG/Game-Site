'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSocket } from '@/lib/socket/provider'
import { WaitingRoom } from '@/components/game/WaitingRoom'
import { GameBoard } from '@/components/game/GameBoard'
import type { GameState, RoomInfo } from '@/types/game'
import { useTranslations } from 'next-intl'
import { Trophy, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RoomData extends RoomInfo {
  gameState?: GameState
}

interface GameEndData {
  winner: string
  scores: { userId: string; displayName: string; total: number }[]
}

export default function GameRoomPage() {
  const params = useParams()
  const router = useRouter()
  const { socket, isConnected, userId } = useSocket()
  const t = useTranslations()

  const roomId = params.roomId as string
  const [room, setRoom] = useState<RoomData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gameEnd, setGameEnd] = useState<GameEndData | null>(null)

  useEffect(() => {
    if (!socket || !isConnected) return

    // Join the room
    socket.emit('room:join', { roomId })

    // Listen for room state updates
    const handleRoomUpdate = (data: RoomData) => {
      setRoom(data)
      setError(null)
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
      router.push('/')
    }

    // Listen for game end
    const handleGameEnded = (data: GameEndData) => {
      setGameEnd(data)
    }

    // Listen for game abort
    const handleGameAborted = () => {
      setGameEnd(null)
    }

    socket.on('room:update', handleRoomUpdate)
    socket.on('room:player-joined', handlePlayerJoined)
    socket.on('room:player-left', handlePlayerLeft)
    socket.on('room:error', handleError)
    socket.on('room:kicked', handleKicked)
    socket.on('game:ended', handleGameEnded)
    socket.on('game:aborted', handleGameAborted)

    // Cleanup: leave room on unmount
    return () => {
      socket.emit('room:leave', { roomId })
      socket.off('room:update', handleRoomUpdate)
      socket.off('room:player-joined', handlePlayerJoined)
      socket.off('room:player-left', handlePlayerLeft)
      socket.off('room:error', handleError)
      socket.off('room:kicked', handleKicked)
      socket.off('game:ended', handleGameEnded)
      socket.off('game:aborted', handleGameAborted)
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
          <Button onClick={() => router.push('/')} className="bg-green-600 hover:bg-green-700">
            {t('common.back')}
          </Button>
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

  // Game ended
  if (gameEnd || room.status === 'ended') {
    const scores = gameEnd?.scores || room.gameState?.players.map(p => ({
      userId: p.userId,
      displayName: p.displayName,
      total: Object.values(p.scoresheet).reduce((sum, val) => sum + (val ?? 0), 0)
    })) || []

    const sorted = [...scores].sort((a, b) => b.total - a.total)
    const winnerId = gameEnd?.winner || room.gameState?.winner

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <Card className="w-full max-w-md border-gray-700 bg-gray-800/80">
          <CardHeader className="text-center">
            <Trophy className="mx-auto h-16 w-16 text-yellow-400" />
            <CardTitle className="text-3xl text-white">{t('game.gameOver')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sorted.map((player, index) => {
              const isWinner = player.userId === winnerId
              const isMe = player.userId === userId
              return (
                <div
                  key={player.userId}
                  className={`flex items-center justify-between rounded-lg p-3 ${
                    isWinner
                      ? 'bg-yellow-500/20 border border-yellow-500/40'
                      : 'bg-gray-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-bold ${
                      index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-amber-700'
                    }`}>
                      #{index + 1}
                    </span>
                    <div>
                      <p className={`font-semibold ${isWinner ? 'text-yellow-300' : 'text-white'}`}>
                        {player.displayName}
                        {isMe && ' (Du)'}
                      </p>
                      {isWinner && (
                        <p className="text-xs text-yellow-400">{t('game.winner', { name: '' }).trim()}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xl font-bold ${isWinner ? 'text-yellow-300' : 'text-gray-300'}`}>
                    {player.total}
                  </span>
                </div>
              )
            })}

            <Button
              onClick={() => router.push('/')}
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700 mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zur Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render based on game status
  if (room.status === 'waiting') {
    return (
      <WaitingRoom
        room={room}
        currentUserId={userId || ''}
        socket={socket}
      />
    )
  }

  if (room.status === 'playing' && room.gameState) {
    return (
      <GameBoard
        gameState={room.gameState}
        roomId={roomId}
        currentUserId={userId || ''}
        hostId={room.hostId}
        socket={socket}
      />
    )
  }

  return null
}
