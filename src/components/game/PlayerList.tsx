'use client'

import type { PlayerState } from '@/types/game'
import { calculateTotalScore } from '@/lib/game/kniffel-rules'
import { Badge } from '@/components/ui/badge'
import { Circle } from 'lucide-react'

interface PlayerListProps {
  players: PlayerState[]
  currentPlayerIndex: number
  currentUserId: string
  spectatorCount?: number
}

export function PlayerList({
  players,
  currentPlayerIndex,
  currentUserId,
  spectatorCount = 0
}: PlayerListProps) {
  return (
    <div className="flex flex-wrap gap-3 rounded-lg bg-gray-800/50 p-4">
      {players.map((player, index) => {
        const isCurrentTurn = index === currentPlayerIndex
        const score = calculateTotalScore(player.scoresheet)
        const isCurrentUser = player.userId === currentUserId

        return (
          <div
            key={player.userId}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
              isCurrentTurn
                ? 'bg-green-600/20 ring-2 ring-green-500'
                : 'bg-gray-900/50'
            }`}
          >
            {/* Connection Status */}
            <Circle
              className={`h-2 w-2 ${
                player.isConnected ? 'fill-green-500 text-green-500' : 'fill-gray-500 text-gray-500'
              }`}
            />

            {/* Player Info */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${
                  isCurrentUser ? 'text-green-400' : 'text-white'
                }`}>
                  {player.displayName}
                </span>
                {isCurrentTurn && (
                  <Badge variant="outline" className="border-green-500 text-green-500 text-xs">
                    Am Zug
                  </Badge>
                )}
              </div>
              <span className="text-xs text-gray-400">
                {score} Punkte
              </span>
            </div>
          </div>
        )
      })}

      {/* Spectator Count */}
      {spectatorCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-gray-900/50 px-3 py-2">
          <Circle className="h-2 w-2 fill-gray-500 text-gray-500" />
          <span className="text-sm text-gray-400">
            {spectatorCount} Zuschauer
          </span>
        </div>
      )}
    </div>
  )
}
