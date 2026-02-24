'use client'

import type { KniffelRuleset, PlayerState } from '@/types/game'
import { calculateTotalScoreWithRuleset } from '@/lib/game/kniffel-rules'
import { resolveKniffelRuleset } from '@/lib/game/kniffel-ruleset'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Circle, Send } from 'lucide-react'
import { TransferDialog } from '@/components/wallet/transfer-dialog'

interface PlayerListProps {
  players: PlayerState[]
  currentPlayerIndex: number
  currentUserId: string
  spectatorCount?: number
  ruleset?: KniffelRuleset
}

export function PlayerList({
  players,
  currentPlayerIndex,
  currentUserId,
  spectatorCount = 0,
  ruleset,
}: PlayerListProps) {
  const effectiveRuleset = ruleset ?? resolveKniffelRuleset('classic')

  return (
    <div className="flex flex-wrap gap-3 rounded-lg bg-gray-800/50 p-4">
      {players.map((player, index) => {
        const isCurrentTurn = index === currentPlayerIndex
        const score = calculateTotalScoreWithRuleset(player.scoresheet, effectiveRuleset)
        const isCurrentUser = player.userId === currentUserId
        const teamLabel = player.teamId === 'team-a' ? 'Team A' : player.teamId === 'team-b' ? 'Team B' : null

        return (
          <div
            key={player.userId}
            className={`group flex items-center gap-2 rounded-lg px-3 py-2 ${
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
              {teamLabel && (
                <span className="text-xs text-cyan-400">
                  {teamLabel}
                </span>
              )}
            </div>

            {/* Transfer Button */}
            {!isCurrentUser && (
              <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <TransferDialog
                  recipientId={player.userId}
                  recipientName={player.displayName}
                  trigger={
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-green-600/20 hover:text-green-400"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  }
                />
              </div>
            )}
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
