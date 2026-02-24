'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { PlayerState, DiceValues, ScoreCategory, KniffelRuleset } from '@/types/game'
import { calculateScore, calculateScoreWithRuleset, calculateUpperBonus, calculateTotalScore } from '@/lib/game/kniffel-rules'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ScoresheetProps {
  players: PlayerState[]
  currentPlayerIndex: number
  currentUserId: string
  dice: DiceValues
  rollsRemaining: number
  ruleset?: KniffelRuleset
  onSelectCategory: (category: ScoreCategory, columnIndex?: number) => void
  canScore: boolean
}

type ViewMode = 'compact' | 'full'

export function Scoresheet({
  players,
  currentPlayerIndex,
  currentUserId,
  dice,
  rollsRemaining,
  ruleset,
  onSelectCategory,
  canScore
}: ScoresheetProps) {
  const t = useTranslations('scoresheet')
  const [viewMode, setViewMode] = useState<ViewMode>('full')

  const currentPlayer = players.find(p => p.userId === currentUserId)
  const isCurrentTurn = players[currentPlayerIndex]?.userId === currentUserId
  const columnMultipliers = ruleset?.columnMultipliers ?? []

  const maxRolls = ruleset?.maxRolls ?? 3
  const randomizerEnabled = ruleset?.categoryRandomizer?.enabled ?? false
  const disabledCategories = new Set(
    randomizerEnabled ? ruleset?.categoryRandomizer?.disabledCategories ?? [] : []
  )
  const specialCategories = randomizerEnabled
    ? ruleset?.categoryRandomizer?.specialCategories ?? []
    : []

  const upperCategories: ScoreCategory[] = [
    'ones', 'twos', 'threes', 'fours', 'fives', 'sixes'
  ].filter(category => !disabledCategories.has(category))

  const lowerBaseCategories: ScoreCategory[] = [
    'threeOfKind', 'fourOfKind', 'fullHouse',
    'smallStraight', 'largeStraight', 'kniffel', 'chance'
  ].filter(category => !disabledCategories.has(category))

  const lowerCategories: ScoreCategory[] = [
    ...lowerBaseCategories,
    ...specialCategories.filter(category => !disabledCategories.has(category))
  ]

  const getScoresheetsForPlayer = (player: PlayerState): KniffelScoresheet[] => {
    if ('columns' in player.scoresheet) {
      return player.scoresheet.columns
    }
    return [player.scoresheet]
  }

  const playerColumns = players.flatMap((player) =>
    getScoresheetsForPlayer(player).map((scoresheet, columnIndex) => ({
      player,
      scoresheet,
      columnIndex,
      multiplier: columnMultipliers[columnIndex] ?? 1
    }))
  )

  const renderCategoryRow = (
    category: ScoreCategory,
    scoresheet: KniffelScoresheet,
    columnIndex: number | undefined,
    showPotential = false
  ) => {
    const scored = scoresheet[category]
    const isAvailable = scored === undefined
    const potentialScore = showPotential && isAvailable && rollsRemaining < maxRolls
      ? (ruleset
        ? calculateScoreWithRuleset(category, dice, ruleset)
        : calculateScore(category, dice))
      : null
    const isClickable = showPotential && canScore && isAvailable

    return (
      <TableRow
        key={category}
        className={`${
          isClickable
            ? 'cursor-pointer bg-green-600/10 hover:bg-green-600/20'
            : ''
        }`}
        onClick={() => isClickable && onSelectCategory(category, columnIndex)}
      >
        <TableCell className="font-medium text-white">
          {t(category)}
        </TableCell>
        <TableCell className="text-center">
          {scored !== undefined ? (
            <span className="font-semibold text-white">{scored}</span>
          ) : potentialScore !== null ? (
            <span className="font-semibold text-green-400">({potentialScore})</span>
          ) : (
            <span className="text-gray-600">-</span>
          )}
        </TableCell>
      </TableRow>
    )
  }

  const renderFullTable = () => {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-300">Kategorie</TableHead>
              {playerColumns.map(({ player, multiplier, columnIndex }) => (
                <TableHead
                  key={`${player.userId}-${columnIndex}`}
                  className={`text-center ${
                    player.userId === currentUserId ? 'text-green-400' : 'text-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{player.displayName}</span>
                    {playerColumns.length > players.length && (
                      <span className="text-xs text-gray-400">x{multiplier}</span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Upper Section */}
            {upperCategories.map((category) => (
              <TableRow key={category}>
                <TableCell className="font-medium text-white">
                  {t(category)}
                </TableCell>
                {playerColumns.map(({ player, scoresheet, columnIndex }) => {
                  const scored = scoresheet[category]
                  const isAvailable = scored === undefined
                  const isOwnColumn = player.userId === currentUserId
                  const showPotential =
                    isOwnColumn &&
                    isCurrentTurn &&
                    rollsRemaining < maxRolls
                  const potentialScore = showPotential && isAvailable
                    ? (ruleset
                      ? calculateScoreWithRuleset(category, dice, ruleset)
                      : calculateScore(category, dice))
                    : null
                  const isClickable = isOwnColumn && canScore && isAvailable

                  return (
                    <TableCell
                      key={`${player.userId}-${columnIndex}`}
                      className={`text-center ${isClickable ? 'cursor-pointer bg-green-600/10 hover:bg-green-600/20' : ''}`}
                      onClick={() => isClickable && onSelectCategory(category, columnIndex)}
                    >
                      {scored !== undefined ? (
                        <span className="font-semibold text-white">{scored}</span>
                      ) : potentialScore !== null ? (
                        <span className="font-semibold text-green-400">
                          ({potentialScore})
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}

            {/* Upper Bonus */}
            <TableRow className="border-t-2 border-gray-700 bg-gray-900/30">
              <TableCell className="font-semibold text-white">
                {t('upperBonus')}
              </TableCell>
              {playerColumns.map(({ player, scoresheet, columnIndex }) => {
                const bonus = calculateUpperBonus(scoresheet)
                return (
                  <TableCell key={`${player.userId}-${columnIndex}`} className="text-center">
                    <span className="font-semibold text-yellow-400">
                      {bonus}
                    </span>
                  </TableCell>
                )
              })}
            </TableRow>

            {/* Upper Total */}
            <TableRow className="border-b-2 border-gray-700 bg-gray-900/50">
              <TableCell className="font-bold text-white">
                {t('upperTotal')}
              </TableCell>
              {playerColumns.map(({ player, scoresheet, columnIndex }) => {
                const upperSum = upperCategories.reduce(
                  (sum, cat) => sum + (scoresheet[cat] ?? 0),
                  0
                )
                const bonus = calculateUpperBonus(scoresheet)
                return (
                  <TableCell key={`${player.userId}-${columnIndex}`} className="text-center">
                    <span className="font-bold text-white">
                      {upperSum + bonus}
                    </span>
                  </TableCell>
                )
              })}
            </TableRow>

            {/* Lower Section */}
            {lowerCategories.map((category) => (
              <TableRow key={category}>
                <TableCell className="font-medium text-white">
                  {t(category)}
                </TableCell>
                {playerColumns.map(({ player, scoresheet, columnIndex }) => {
                  const scored = scoresheet[category]
                  const isAvailable = scored === undefined
                  const isOwnColumn = player.userId === currentUserId
                  const showPotential =
                    isOwnColumn &&
                    isCurrentTurn &&
                    rollsRemaining < maxRolls
                  const potentialScore = showPotential && isAvailable
                    ? (ruleset
                      ? calculateScoreWithRuleset(category, dice, ruleset)
                      : calculateScore(category, dice))
                    : null
                  const isClickable = isOwnColumn && canScore && isAvailable

                  return (
                    <TableCell
                      key={`${player.userId}-${columnIndex}`}
                      className={`text-center ${isClickable ? 'cursor-pointer bg-green-600/10 hover:bg-green-600/20' : ''}`}
                      onClick={() => isClickable && onSelectCategory(category, columnIndex)}
                    >
                      {scored !== undefined ? (
                        <span className="font-semibold text-white">{scored}</span>
                      ) : potentialScore !== null ? (
                        <span className="font-semibold text-green-400">
                          ({potentialScore})
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}

            {/* Lower Total */}
            <TableRow className="border-t-2 border-gray-700 bg-gray-900/30">
              <TableCell className="font-bold text-white">
                {t('lowerTotal')}
              </TableCell>
              {playerColumns.map(({ player, scoresheet, columnIndex }) => {
                const lowerSum = lowerCategories.reduce(
                  (sum, cat) => sum + (scoresheet[cat] ?? 0),
                  0
                )
                return (
                  <TableCell key={`${player.userId}-${columnIndex}`} className="text-center">
                    <span className="font-bold text-white">{lowerSum}</span>
                  </TableCell>
                )
              })}
            </TableRow>

            {/* Grand Total */}
            <TableRow className="border-t-2 border-gray-700 bg-gray-900/50">
              <TableCell className="font-bold text-white">
                {t('grandTotal')}
              </TableCell>
              {playerColumns.map(({ player, scoresheet, columnIndex, multiplier }) => {
                const total = calculateTotalScore(scoresheet) * multiplier
                return (
                  <TableCell key={`${player.userId}-${columnIndex}`} className="text-center">
                    <span className="text-lg font-bold text-green-400">
                      {total}
                    </span>
                  </TableCell>
                )
              })}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  const renderCompactView = () => {
    if (!currentPlayer) return null
    const currentScoresheets = getScoresheetsForPlayer(currentPlayer)
    const hasMultipleColumns = currentScoresheets.length > 1

    return (
      <div className="space-y-6">
        {currentScoresheets.map((scoresheet, columnIndex) => {
          const multiplier = columnMultipliers[columnIndex] ?? 1

          return (
            <div key={columnIndex}>
              {hasMultipleColumns && (
                <div className="mb-2 text-sm font-semibold text-gray-300">
                  x{multiplier}
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Kategorie</TableHead>
                    <TableHead className="text-center text-gray-300">Punkte</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Upper Section */}
                  {upperCategories.map((category) =>
                    renderCategoryRow(category, scoresheet, columnIndex, isCurrentTurn)
                  )}

                  {/* Upper Bonus */}
                  <TableRow className="border-t-2 border-gray-700 bg-gray-900/30">
                    <TableCell className="font-semibold text-white">
                      {t('upperBonus')}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-yellow-400">
                        {calculateUpperBonus(scoresheet)}
                      </span>
                    </TableCell>
                  </TableRow>

                  {/* Upper Total */}
                  <TableRow className="border-b-2 border-gray-700 bg-gray-900/50">
                    <TableCell className="font-bold text-white">
                      {t('upperTotal')}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-white">
                        {upperCategories.reduce(
                          (sum, cat) => sum + (scoresheet[cat] ?? 0),
                          0
                        ) + calculateUpperBonus(scoresheet)}
                      </span>
                    </TableCell>
                  </TableRow>

                  {/* Lower Section */}
                  {lowerCategories.map((category) =>
                    renderCategoryRow(category, scoresheet, columnIndex, isCurrentTurn)
                  )}

                  {/* Lower Total */}
                  <TableRow className="border-t-2 border-gray-700 bg-gray-900/30">
                    <TableCell className="font-bold text-white">
                      {t('lowerTotal')}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-white">
                        {lowerCategories.reduce(
                          (sum, cat) => sum + (scoresheet[cat] ?? 0),
                          0
                        )}
                      </span>
                    </TableCell>
                  </TableRow>

                  {/* Grand Total */}
                  <TableRow className="border-t-2 border-gray-700 bg-gray-900/50">
                    <TableCell className="font-bold text-white">
                      {t('grandTotal')}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-lg font-bold text-green-400">
                        {calculateTotalScore(scoresheet) * multiplier}
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card className="flex h-full flex-col border-gray-700 bg-gray-800/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-white">Wertungsblatt</CardTitle>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'compact' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('compact')}
            className={
              viewMode === 'compact'
                ? 'bg-green-600'
                : 'border-gray-600 text-gray-300'
            }
          >
            {t('compact')}
          </Button>
          <Button
            variant={viewMode === 'full' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('full')}
            className={
              viewMode === 'full'
                ? 'bg-green-600'
                : 'border-gray-600 text-gray-300'
            }
          >
            {t('fullTable')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {viewMode === 'full' ? renderFullTable() : renderCompactView()}
      </CardContent>
    </Card>
  )
}
