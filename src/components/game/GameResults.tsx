'use client'

import { useState } from 'react'
import type { PlayerState } from '@/types/game'
import { calculateTotalScore, calculateUpperBonus } from '@/lib/game/kniffel-rules'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trophy, Medal, ChevronDown, ChevronUp } from 'lucide-react'

interface GameResultsProps {
  players: PlayerState[]
  winnerId: string | null
  currentUserId: string
}

export function GameResults({ players, winnerId, currentUserId }: GameResultsProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Calculate rankings
  const rankings = players
    .map((player) => ({
      ...player,
      total: calculateTotalScore(player.scoresheet),
      upperBonus: calculateUpperBonus(player.scoresheet)
    }))
    .sort((a, b) => b.total - a.total)

  const winner = rankings[0]

  // Podium colors
  const getPodiumColor = (rank: number) => {
    if (rank === 0) return 'text-yellow-400' // Gold
    if (rank === 1) return 'text-gray-400' // Silver
    if (rank === 2) return 'text-orange-600' // Bronze
    return 'text-gray-500'
  }

  const getPodiumBg = (rank: number) => {
    if (rank === 0) return 'bg-yellow-600/20 border-yellow-600'
    if (rank === 1) return 'bg-gray-600/20 border-gray-600'
    if (rank === 2) return 'bg-orange-600/20 border-orange-600'
    return 'bg-gray-700/20 border-gray-700'
  }

  return (
    <div className="space-y-6">
      {/* Winner Announcement */}
      <Card className="border-yellow-600 bg-gradient-to-br from-yellow-600/20 to-yellow-800/10">
        <CardContent className="py-8 text-center">
          <Trophy className="mx-auto mb-4 h-16 w-16 text-yellow-400" />
          <h1 className="mb-2 text-3xl font-bold text-white">
            Gewinner: {winner.displayName}
          </h1>
          <p className="text-xl text-yellow-400">
            {winner.total} Punkte
          </p>
        </CardContent>
      </Card>

      {/* Rankings Table */}
      <Card className="border-gray-700 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">Rangliste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rankings.map((player, index) => (
              <div
                key={player.userId}
                className={`flex items-center justify-between rounded-lg border p-4 ${getPodiumBg(index)}`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank Icon */}
                  <div className="flex items-center justify-center w-12">
                    {index === 0 && <Trophy className={`h-8 w-8 ${getPodiumColor(index)}`} />}
                    {index === 1 && <Medal className={`h-8 w-8 ${getPodiumColor(index)}`} />}
                    {index === 2 && <Medal className={`h-8 w-8 ${getPodiumColor(index)}`} />}
                    {index > 2 && (
                      <span className={`text-2xl font-bold ${getPodiumColor(index)}`}>
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Player Name */}
                  <div>
                    <p className={`text-lg font-semibold ${
                      player.userId === currentUserId ? 'text-green-400' : 'text-white'
                    }`}>
                      {player.displayName}
                      {player.userId === currentUserId && ' (Du)'}
                    </p>
                    {player.upperBonus > 0 && (
                      <p className="text-xs text-yellow-400">
                        + Bonus ({player.upperBonus})
                      </p>
                    )}
                  </div>
                </div>

                {/* Total Score */}
                <div className="text-right">
                  <p className={`text-2xl font-bold ${getPodiumColor(index)}`}>
                    {player.total}
                  </p>
                  <p className="text-xs text-gray-400">Punkte</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Scoresheet Toggle */}
      <Card className="border-gray-700 bg-gray-800/50">
        <CardHeader>
          <Button
            variant="ghost"
            className="w-full justify-between text-white hover:bg-gray-700/50"
            onClick={() => setShowDetails(!showDetails)}
          >
            <span className="text-lg font-semibold">Detaillierte Wertung</span>
            {showDetails ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        </CardHeader>
        {showDetails && (
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Kategorie</TableHead>
                    {rankings.map((player) => (
                      <TableHead
                        key={player.userId}
                        className={`text-center ${
                          player.userId === currentUserId
                            ? 'text-green-400'
                            : 'text-gray-300'
                        }`}
                      >
                        {player.displayName}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Upper Section */}
                  {(['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'] as const).map(
                    (category) => (
                      <TableRow key={category}>
                        <TableCell className="font-medium text-white capitalize">
                          {category === 'ones' && 'Einser'}
                          {category === 'twos' && 'Zweier'}
                          {category === 'threes' && 'Dreier'}
                          {category === 'fours' && 'Vierer'}
                          {category === 'fives' && 'Fünfer'}
                          {category === 'sixes' && 'Sechser'}
                        </TableCell>
                        {rankings.map((player) => (
                          <TableCell key={player.userId} className="text-center text-white">
                            {player.scoresheet[category] ?? '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  )}

                  {/* Upper Bonus */}
                  <TableRow className="border-t-2 border-gray-700 bg-gray-900/30">
                    <TableCell className="font-semibold text-white">Bonus</TableCell>
                    {rankings.map((player) => (
                      <TableCell key={player.userId} className="text-center">
                        <span className="font-semibold text-yellow-400">
                          {player.upperBonus}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Lower Section */}
                  {([
                    'threeOfKind',
                    'fourOfKind',
                    'fullHouse',
                    'smallStraight',
                    'largeStraight',
                    'kniffel',
                    'chance'
                  ] as const).map((category) => (
                    <TableRow key={category}>
                      <TableCell className="font-medium text-white">
                        {category === 'threeOfKind' && 'Dreierpasch'}
                        {category === 'fourOfKind' && 'Viererpasch'}
                        {category === 'fullHouse' && 'Full House'}
                        {category === 'smallStraight' && 'Kleine Straße'}
                        {category === 'largeStraight' && 'Große Straße'}
                        {category === 'kniffel' && 'Kniffel'}
                        {category === 'chance' && 'Chance'}
                      </TableCell>
                      {rankings.map((player) => (
                        <TableCell key={player.userId} className="text-center text-white">
                          {player.scoresheet[category] ?? '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                  {/* Grand Total */}
                  <TableRow className="border-t-2 border-gray-700 bg-gray-900/50">
                    <TableCell className="font-bold text-white">Gesamt</TableCell>
                    {rankings.map((player) => (
                      <TableCell key={player.userId} className="text-center">
                        <span className="text-lg font-bold text-green-400">
                          {player.total}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
