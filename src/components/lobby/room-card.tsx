'use client'

import { RoomInfo, GameType } from '@/types/game'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Crown, Clock, Coins, Dices, CircleDot, Spade } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface RoomCardProps {
  room: RoomInfo
  onJoin: (roomId: string) => void
  currentUserId: string
}

export function RoomCard({ room, onJoin, currentUserId }: RoomCardProps) {
  const t = useTranslations()

  // Determine status badge color and text
  const getStatusBadge = () => {
    switch (room.status) {
      case 'waiting':
        return { text: t('room.waiting'), variant: 'default' as const, color: 'bg-green-500/10 text-green-500' }
      case 'playing':
        return { text: t('room.playing'), variant: 'secondary' as const, color: 'bg-yellow-500/10 text-yellow-500' }
      case 'ended':
        return { text: t('room.ended'), variant: 'outline' as const, color: 'bg-gray-500/10 text-gray-500' }
    }
  }

  // Get game type display info
  const getGameTypeInfo = (gameType: GameType) => {
    switch (gameType) {
      case 'kniffel':
        return { icon: Dices, label: 'Kniffel', color: 'bg-green-500/10 text-green-500 border-green-500/20' }
      case 'blackjack':
        return { icon: null, label: 'Blackjack', emoji: '🃏', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' }
      case 'roulette':
        return { icon: CircleDot, label: 'Roulette', color: 'bg-red-500/10 text-red-500 border-red-500/20' }
      case 'poker':
        return { icon: Spade, label: 'Poker', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' }
    }
  }

  const statusBadge = getStatusBadge()
  const gameTypeInfo = getGameTypeInfo(room.gameType)
  const isRoomFull = room.currentPlayers >= room.maxPlayers
  const canJoin = room.status === 'waiting' && !isRoomFull
  const canSpectate = room.status === 'playing'
  const kniffelModeLabel =
    room.gameType === 'kniffel'
      ? room.kniffelMode === 'team2v2'
        ? 'Team 2v2'
        : room.kniffelMode === 'team3v3'
          ? 'Team 3v3'
          : 'Klassisch'
      : null

  // Calculate time since creation
  const getTimeSince = () => {
    const created = new Date(room.createdAt)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / 60000)

    if (diffMinutes < 1) return 'vor wenigen Sekunden'
    if (diffMinutes === 1) return 'vor 1 Minute'
    if (diffMinutes < 60) return `vor ${diffMinutes} Minuten`

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours === 1) return 'vor 1 Stunde'
    return `vor ${diffHours} Stunden`
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-white text-lg truncate">{room.name}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Clock className="h-3 w-3" />
              <span className="text-xs">{getTimeSince()}</span>
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge variant="outline" className={gameTypeInfo.color}>
              {gameTypeInfo.icon && <gameTypeInfo.icon className="h-3 w-3 mr-1" />}
              {gameTypeInfo.emoji && <span className="mr-1">{gameTypeInfo.emoji}</span>}
              {gameTypeInfo.label}
            </Badge>
            <Badge className={statusBadge.color} variant="outline">
              {statusBadge.text}
            </Badge>
            {kniffelModeLabel && (
              <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                {kniffelModeLabel}
              </Badge>
            )}
            {room.isBetRoom ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 flex items-center gap-1">
                <Coins className="h-3 w-3" />
                {room.betAmount} Chips
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                Kostenlos
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Host info */}
        <div className="flex items-center gap-2 text-sm">
          <Crown className="h-4 w-4 text-yellow-500" />
          <span className="text-gray-400">Gastgeber:</span>
          <span className="text-white font-medium">{room.hostName}</span>
        </div>

        {/* Player count */}
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-blue-500" />
          <span className="text-gray-400">
            {t('room.players', { count: room.currentPlayers, max: room.maxPlayers })}
          </span>
        </div>

        {/* Player names */}
        {room.playerNames.length > 0 && (
          <div className="text-sm">
            <span className="text-gray-400">Spieler: </span>
            <span className="text-white">{room.playerNames.join(', ')}</span>
          </div>
        )}

        {/* Bet room info */}
        {room.isBetRoom && (
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Pot:</span>
              <span className="text-amber-500 font-medium">{room.totalPot} Chips</span>
            </div>
            {(room.minBet > 0 || room.maxBet > 0) && (
              <div className="text-xs text-gray-400">
                {room.minBet > 0 && `Min: ${room.minBet}`}
                {room.minBet > 0 && room.maxBet > 0 && ' / '}
                {room.maxBet > 0 && `Max: ${room.maxBet}`}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter>
        {canJoin && (
          <Button
            onClick={() => onJoin(room.id)}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {t('room.join')}
          </Button>
        )}
        {canSpectate && (
          <Button
            onClick={() => onJoin(room.id)}
            variant="outline"
            className="w-full"
          >
            Zuschauen
          </Button>
        )}
        {room.status === 'ended' && (
          <Button
            disabled
            variant="outline"
            className="w-full"
          >
            {t('room.ended')}
          </Button>
        )}
        {room.status === 'waiting' && isRoomFull && (
          <Button
            disabled
            variant="outline"
            className="w-full"
          >
            {t('room.roomFull')}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
