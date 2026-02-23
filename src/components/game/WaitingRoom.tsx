'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Socket } from 'socket.io-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, X, Copy, Crown, Send, Coins, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { GameState } from '@/types/game'
import { TransferDialog } from '@/components/wallet/transfer-dialog'
import { toast } from 'sonner'

interface RoomData {
  id: string
  name: string
  hostId: string
  hostName: string
  gameType?: string
  kniffelMode?: 'classic' | 'team2v2' | 'team3v3'
  status: 'waiting' | 'playing' | 'ended'
  isPrivate: boolean
  maxPlayers: number
  players: { userId: string; displayName: string; isReady: boolean; teamId?: string | null }[]
  spectators: string[]
  turnTimer?: number
  afkThreshold?: number
  gameState?: GameState
  isBetRoom: boolean
  betAmount: number
}

interface WaitingRoomProps {
  room: RoomData
  currentUserId: string
  socket: Socket
}

export function WaitingRoom({ room, currentUserId, socket }: WaitingRoomProps) {
  const t = useTranslations()
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const isHost = currentUserId === room.hostId
  const players = room.players || []
  const spectators = room.spectators || []

  // House games (blackjack, roulette) can be played solo
  const isHouseGame = room.gameType === 'blackjack' || room.gameType === 'roulette'
  const minPlayers = isHouseGame ? 1 : 2

  // Calculate ready status
  const readyCount = players.filter(p => p.isReady).length
  const allReady = players.length >= minPlayers && readyCount === players.length
  const currentPlayer = players.find(p => p.userId === currentUserId)
  const isReady = currentPlayer?.isReady || false
  const isTeamMode = room.gameType === 'kniffel' && (room.kniffelMode === 'team2v2' || room.kniffelMode === 'team3v3')
  const teamSize = room.kniffelMode === 'team2v2' ? 2 : room.kniffelMode === 'team3v3' ? 3 : 0
  const teamAPlayers = players.filter(p => p.teamId === 'team-a')
  const teamBPlayers = players.filter(p => p.teamId === 'team-b')
  const teamsFilled = !isTeamMode || (teamAPlayers.length === teamSize && teamBPlayers.length === teamSize)
  const allAssigned = !isTeamMode || players.every(p => p.teamId === 'team-a' || p.teamId === 'team-b')
  const canStart = allReady && teamsFilled && allAssigned
  const hasSelectedTeam = !isTeamMode || currentPlayer?.teamId === 'team-a' || currentPlayer?.teamId === 'team-b'

  const handleToggleReady = () => {
    socket.emit('game:player-ready', {
      roomId: room.id,
      isReady: !isReady
    })
  }

  const handleSelectTeam = (teamId: 'team-a' | 'team-b') => {
    socket.emit('room:select-team', { roomId: room.id, teamId }, (response: { success?: boolean; error?: string }) => {
      if (response?.error) {
        toast.error(response.error)
      }
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

  const handleLeave = () => {
    socket.emit('room:leave', { roomId: room.id })
    router.push('/')
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
                    count: players.length,
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
            {/* Bet Room Info */}
            {room.isBetRoom && (
              <div className="rounded-lg bg-green-600/10 border border-green-600/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-5 w-5 text-green-500" />
                  <p className="text-sm font-semibold text-green-400">Wett-Raum</p>
                </div>
                <p className="text-sm text-gray-300">
                  Einsatz: <span className="font-bold text-green-400">{room.betAmount}</span> Chips pro Spieler
                </p>
              </div>
            )}

            {/* Room Settings */}
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-900/50 p-4">
              <div>
                <p className="text-xs text-gray-400">{t('room.turnTimer')}</p>
                <p className="text-lg font-semibold text-white">
                  {t('room.turnTimerSeconds', {
                    seconds: room.turnTimer || 60
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('room.afkThreshold')}</p>
                <p className="text-lg font-semibold text-white">
                  {room.afkThreshold || 2} {t('room.afkThreshold').split(' ')[1]}
                </p>
              </div>
            </div>

            {isTeamMode && (
              <div className="rounded-lg bg-cyan-900/20 border border-cyan-700/40 p-4 space-y-3">
                <p className="text-sm text-cyan-200">
                  Teammodus aktiv: {room.kniffelMode === 'team2v2' ? '2v2' : '3v3'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-gray-900/60 p-3">
                    <p className="text-sm font-semibold text-cyan-300">Team A ({teamAPlayers.length}/{teamSize})</p>
                    <p className="text-xs text-gray-400 mt-1">{teamAPlayers.map(p => p.displayName).join(', ') || 'Noch leer'}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 border-cyan-600 text-cyan-300 hover:bg-cyan-900/40"
                      disabled={!currentPlayer || (teamAPlayers.length >= teamSize && currentPlayer?.teamId !== 'team-a')}
                      onClick={() => handleSelectTeam('team-a')}
                    >
                      Team A wählen
                    </Button>
                  </div>
                  <div className="rounded-md bg-gray-900/60 p-3">
                    <p className="text-sm font-semibold text-cyan-300">Team B ({teamBPlayers.length}/{teamSize})</p>
                    <p className="text-xs text-gray-400 mt-1">{teamBPlayers.map(p => p.displayName).join(', ') || 'Noch leer'}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 border-cyan-600 text-cyan-300 hover:bg-cyan-900/40"
                      disabled={!currentPlayer || (teamBPlayers.length >= teamSize && currentPlayer?.teamId !== 'team-b')}
                      onClick={() => handleSelectTeam('team-b')}
                    >
                      Team B wählen
                    </Button>
                  </div>
                </div>
              </div>
            )}

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
                      {isTeamMode && (
                        <p className="text-xs text-cyan-300">
                          {player.teamId === 'team-a' ? 'Team A' : player.teamId === 'team-b' ? 'Team B' : 'Kein Team'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {player.userId !== currentUserId && (
                      <TransferDialog
                        recipientId={player.userId}
                        recipientName={player.displayName}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-600 text-green-600 hover:bg-green-600/10"
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Chips senden
                          </Button>
                        }
                      />
                    )}
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
          {/* Ready / Leave Buttons */}
          {currentPlayer && (
            <div className="flex gap-3">
              <Button
                onClick={handleToggleReady}
                variant={isReady ? 'outline' : 'default'}
                size="lg"
                disabled={!hasSelectedTeam}
                className={`flex-1 ${
                  isReady
                    ? 'border-green-600 text-green-600 hover:bg-green-600/10'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isReady ? t('room.notReady') : t('room.ready')}
              </Button>
              {!isReady && (
                <Button
                  onClick={handleLeave}
                  variant="outline"
                  size="lg"
                  className="border-red-600 text-red-600 hover:bg-red-600/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('room.leave')}
                </Button>
              )}
            </div>
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
                  disabled={!canStart}
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {t('room.startGame')}
                  {!canStart && ` (${readyCount}/${players.length})`}
                </Button>
                <Button
                  onClick={handleForceStart}
                  disabled={players.length < minPlayers || !teamsFilled || !allAssigned}
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
