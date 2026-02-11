'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Socket } from 'socket.io-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, X, Copy, Crown } from 'lucide-react'
import type { GameState } from '@/types/game'

interface RoomData {
  id: string
  name: string
  hostId: string
  hostName: string
  status: 'waiting' | 'playing' | 'ended'
  isPrivate: boolean
  maxPlayers: number
  currentPlayers: number
  playerNames: string[]
  gameState?: GameState
  settings?: {
    turnTimer: number
    afkThreshold: number
  }
}

interface WaitingRoomProps {
  room: RoomData
  currentUserId: string
  socket: Socket
}

export function WaitingRoom({ room, currentUserId, socket }: WaitingRoomProps) {
  const t = useTranslations()
  const [copied, setCopied] = useState(false)

  const isHost = currentUserId === room.hostId
  const players = room.gameState?.players || []
  const spectators = room.gameState?.spectators || []

  // Calculate ready status
  const readyCount = players.filter(p => p.isReady).length
  const allReady = players.length >= 2 && readyCount === players.length
  const currentPlayer = players.find(p => p.userId === currentUserId)
  const isReady = currentPlayer?.isReady || false

  const handleToggleReady = () => {
    socket.emit('game:player-ready', {
      roomId: room.id,
      isReady: !isReady
    })
  }

  const handleStartGame = () => {
    socket.emit('game:start', { roomId: room.id })
  }

  const handleForceStart = () => {
    socket.emit('game:start', {
      roomId: room.id,
      force: true
    })
  }

  const handleKickPlayer = (userId: string) => {
    socket.emit('room:kick', {
      roomId: room.id,
      userId
    })
  }

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/game/${room.id}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="mx-auto max-w-4xl space-y-6 py-8">
        {/* Room Header */}
        <Card className="border-gray-700 bg-gray-800/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-white">{room.name}</CardTitle>
                <p className="text-sm text-gray-400">
                  {t('room.players', {
                    count: room.currentPlayers,
                    max: room.maxPlayers
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant={room.isPrivate ? 'secondary' : 'default'}>
                  {t(room.isPrivate ? 'room.private' : 'room.public')}
                </Badge>
                <Badge variant="outline" className="border-gray-600 text-gray-300">
                  {t('room.waiting')}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Room Settings */}
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-900/50 p-4">
              <div>
                <p className="text-xs text-gray-400">{t('room.turnTimer')}</p>
                <p className="text-lg font-semibold text-white">
                  {t('room.turnTimerSeconds', {
                    seconds: room.settings?.turnTimer || 60
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('room.afkThreshold')}</p>
                <p className="text-lg font-semibold text-white">
                  {room.settings?.afkThreshold || 2} {t('room.afkThreshold').split(' ')[1]}
                </p>
              </div>
            </div>

            {/* Room Link (for private rooms) */}
            {room.isPrivate && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/game/${room.id}`}
                  className="flex-1 rounded-lg bg-gray-900/50 px-3 py-2 text-sm text-gray-300"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="border-gray-600"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? t('admin.inviteCopied') : 'Link'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Player List */}
        <Card className="border-gray-700 bg-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white">
              Spieler ({players.length}/{room.maxPlayers})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.userId}
                  className="flex items-center justify-between rounded-lg bg-gray-900/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      player.isReady ? 'bg-green-600' : 'bg-gray-700'
                    }`}>
                      {player.isReady ? (
                        <Check className="h-5 w-5 text-white" />
                      ) : (
                        <X className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {player.displayName}
                        </span>
                        {player.userId === room.hostId && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {player.isReady ? t('room.ready') : t('room.notReady')}
                      </p>
                    </div>
                  </div>
                  {isHost && player.userId !== room.hostId && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleKickPlayer(player.userId)}
                    >
                      {t('room.kickPlayer')}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Spectators */}
            {spectators.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-gray-400">
                  {t('game.spectating')}: {spectators.length}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {/* Ready Button (for all players) */}
          {currentPlayer && (
            <Button
              onClick={handleToggleReady}
              variant={isReady ? 'outline' : 'default'}
              size="lg"
              className={`w-full ${
                isReady
                  ? 'border-green-600 text-green-600 hover:bg-green-600/10'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isReady ? t('room.notReady') : t('room.ready')}
            </Button>
          )}

          {/* Host Controls */}
          {isHost && (
            <Card className="border-gray-700 bg-gray-800/50">
              <CardHeader>
                <CardTitle className="text-sm text-white">
                  {t('room.hostControls')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={handleStartGame}
                  disabled={!allReady}
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {t('room.startGame')}
                  {!allReady && ` (${readyCount}/${players.length})`}
                </Button>
                <Button
                  onClick={handleForceStart}
                  disabled={players.length < 2}
                  variant="outline"
                  size="sm"
                  className="w-full border-yellow-600 text-yellow-600 hover:bg-yellow-600/10"
                >
                  {t('room.forceStart')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
