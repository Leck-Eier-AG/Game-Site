'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import type { Socket } from 'socket.io-client'
import { PlayerList } from './PlayerList'
import { Scoresheet } from './Scoresheet'
import { TurnTimer } from './TurnTimer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dice2D } from './Dice2D'
import { GameChat } from './GameChat'
import { SpectatorBanner } from './SpectatorBanner'
import { PotDisplay } from '@/components/betting/pot-display'
import { AfkWarning } from '@/components/betting/afk-warning'
import { GameBalance } from '@/components/wallet/game-balance'
import { LogOut, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { GameState, PauseVote, ScoreCategory } from '@/types/game'
import { calculateTotalScore } from '@/lib/game/kniffel-rules'

interface GameBoardProps {
  gameState: GameState
  roomId: string
  currentUserId: string
  hostId: string
  socket: Socket
  isBetRoom?: boolean
  betAmount?: number
  pauseVotes?: PauseVote | null
}

export function GameBoard({ gameState, roomId, currentUserId, hostId, socket, isBetRoom = false, betAmount = 0, pauseVotes = null }: GameBoardProps) {
  const t = useTranslations()
  const router = useRouter()
  const [isAnimating, setIsAnimating] = useState(false)
  const [localGameState, setLocalGameState] = useState(gameState)
  const prevDiceRef = useRef(gameState.dice)
  const prevRollsRemainingRef = useRef(gameState.rollsRemaining)
  const prevPlayerIndexRef = useRef(gameState.currentPlayerIndex)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmAbort, setConfirmAbort] = useState(false)
  const [pauseVoteStartedLocal, setPauseVoteStartedLocal] = useState(false)
  const isHost = currentUserId === hostId
  const isSpectator = localGameState.spectators.includes(currentUserId)

  // Calculate total pot for bet rooms
  const activePlayerCount = localGameState.players.length
  const totalPot = isBetRoom ? betAmount * activePlayerCount : 0

  // Update local game state when props change
  useEffect(() => {
    setLocalGameState(gameState)

    // Check if dice values changed (indicates a new roll from server)
    const diceChanged = gameState.dice.some((val, idx) => val !== prevDiceRef.current[idx])
    const rollConsumed =
      gameState.currentPlayerIndex === prevPlayerIndexRef.current &&
      gameState.rollsRemaining < prevRollsRemainingRef.current

    // Trigger roll animation for actual roll events, even if values are unchanged.
    if ((diceChanged || rollConsumed) && gameState.rollsRemaining < 3) {
      setIsAnimating(true)
    }
    prevDiceRef.current = gameState.dice
    prevRollsRemainingRef.current = gameState.rollsRemaining
    prevPlayerIndexRef.current = gameState.currentPlayerIndex
  }, [gameState])

  // Listen for game state updates
  useEffect(() => {
    const handleGameStateUpdate = (data: { state: GameState; roomId: string }) => {
      if (data.roomId === roomId) {
        setLocalGameState(data.state)

        // Check if dice changed
        const diceChanged = data.state.dice.some((val, idx) => val !== prevDiceRef.current[idx])
        const rollConsumed =
          data.state.currentPlayerIndex === prevPlayerIndexRef.current &&
          data.state.rollsRemaining < prevRollsRemainingRef.current

        if ((diceChanged || rollConsumed) && data.state.rollsRemaining < 3) {
          setIsAnimating(true)
        }
        prevDiceRef.current = data.state.dice
        prevRollsRemainingRef.current = data.state.rollsRemaining
        prevPlayerIndexRef.current = data.state.currentPlayerIndex
      }
    }

    const handleGameError = (data: { message: string }) => {
      console.error('Game error:', data.message)
      // Could show toast here
    }

    const handlePauseVoteStarted = (data: { roomId: string; starterUserId: string; starterName: string }) => {
      if (data.roomId !== roomId) return
      if (data.starterUserId !== currentUserId) {
        toast.info(`${data.starterName} hat eine Pause-Abstimmung gestartet`)
      }
    }

    socket.on('game:state-update', handleGameStateUpdate)
    socket.on('game:error', handleGameError)
    socket.on('game:pause-vote-started', handlePauseVoteStarted)

    return () => {
      socket.off('game:state-update', handleGameStateUpdate)
      socket.off('game:error', handleGameError)
      socket.off('game:pause-vote-started', handlePauseVoteStarted)
    }
  }, [socket, roomId, currentUserId])

  const currentPlayer = localGameState.players[localGameState.currentPlayerIndex]
  const isMyTurn = currentPlayer?.userId === currentUserId
  const isPaused = localGameState.phase === 'paused'
  const me = localGameState.players.find(p => p.userId === currentUserId)
  const readyCount = localGameState.players.filter(p => p.isReady).length
  const allReadyToResume = localGameState.players.length > 0 && readyCount === localGameState.players.length
  const showPauseVoteControls = Boolean(pauseVotes) || pauseVoteStartedLocal

  useEffect(() => {
    if (pauseVotes) {
      setPauseVoteStartedLocal(true)
    } else if (!isPaused) {
      setPauseVoteStartedLocal(false)
    }
  }, [pauseVotes, isPaused])

  const handleRollDice = () => {
    if (!isMyTurn || isPaused || localGameState.rollsRemaining === 0 || isAnimating) return

    socket.emit('game:roll-dice', {
      roomId,
      keptDice: localGameState.keptDice
    }, (response: { success?: boolean; error?: string }) => {
      if (response?.error) {
        toast.error(response.error)
      }
    })
  }

  const handleDieClick = (index: number) => {
    if (!isMyTurn || isPaused || localGameState.rollsRemaining === 3 || isAnimating) return

    const newKeptDice = [...localGameState.keptDice]
    newKeptDice[index] = !newKeptDice[index]

    // Update local state optimistically (server will confirm)
    setLocalGameState(prev => ({ ...prev, keptDice: newKeptDice }))
  }

  const handleSelectCategory = (category: ScoreCategory, columnIndex?: number) => {
    if (!isMyTurn || isPaused || localGameState.rollsRemaining === 3 || isAnimating) return

    socket.emit('game:choose-category', {
      roomId,
      category,
      columnIndex
    }, (response: { success?: boolean; error?: string }) => {
      if (response?.error) {
        toast.error(response.error)
      }
    })
  }

  const handleRollComplete = () => {
    setIsAnimating(false)
  }

  const handlePauseVote = (vote: boolean) => {
    if (isPaused) return
    socket.timeout(3000).emit('game:pause-vote', { roomId, vote }, (err: unknown, response: { success?: boolean; error?: string }) => {
      if (err) {
        toast.error('Pause-Abstimmung: Zeitüberschreitung')
        return
      }
      if (response?.error) {
        toast.error(response.error)
      }
    })
  }

  const handleStartPauseVote = () => {
    if (isPaused || showPauseVoteControls) return
    socket.timeout(3000).emit('game:start-pause-vote', { roomId }, (err: unknown, response: { success?: boolean; error?: string }) => {
      if (err) {
        toast.error('Start der Pause-Abstimmung: Zeitüberschreitung')
        return
      }
      if (response?.error) {
        toast.error(response.error)
        return
      }
      setPauseVoteStartedLocal(true)
      toast.success('Pause-Abstimmung gestartet')
    })
  }

  const handleResumeReady = () => {
    if (!isPaused) return
    socket.emit('game:resume-ready', { roomId }, (response: { success?: boolean; error?: string }) => {
      if (response?.error) {
        toast.error(response.error)
      }
    })
  }

  const handleLeave = () => {
    socket.emit('room:leave', { roomId })
    router.push('/')
  }

  const handleAbort = () => {
    socket.emit('game:abort', { roomId }, (response: { success?: boolean; error?: string }) => {
      if (response?.error) {
        toast.error(response.error)
      }
    })
  }

  const canRoll = isMyTurn && !isPaused && localGameState.rollsRemaining > 0 && !isAnimating
  const canScore = isMyTurn && !isPaused && localGameState.rollsRemaining < 3 && !isAnimating
  const teamTotals = (localGameState.teams || []).map(team => {
    const members = localGameState.players.filter(player => team.memberUserIds.includes(player.userId))
    return {
      teamId: team.id,
      teamName: team.name,
      total: members.reduce((sum, member) => sum + calculateTotalScore(member.scoresheet), 0),
      members: members.map(member => member.displayName).join(', ')
    }
  }).sort((a, b) => b.total - a.total)

  return (
    <>
      <SpectatorBanner isSpectator={isSpectator} />
      <AfkWarning />
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Top Bar: Player List + Pot Display + Actions */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <PlayerList
              players={localGameState.players}
              currentPlayerIndex={localGameState.currentPlayerIndex}
              currentUserId={currentUserId}
              spectatorCount={localGameState.spectators.length}
            />
          </div>
          {isBetRoom && totalPot > 0 && (
            <div className="shrink-0">
              <PotDisplay totalPot={totalPot} currencyName="Chips" />
            </div>
          )}
          <GameBalance />
          <div className="flex gap-2 shrink-0">
            {isHost && (
              confirmAbort ? (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleAbort}
                  >
                    Abbrechen?
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmAbort(false)}
                    className="border-gray-600"
                  >
                    Nein
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmAbort(true)}
                  className="border-red-800 text-red-400 hover:bg-red-900/30"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Spiel abbrechen
                </Button>
              )
            )}
            {confirmLeave ? (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleLeave}
                >
                  Verlassen?
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmLeave(false)}
                  className="border-gray-600"
                >
                  Nein
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmLeave(true)}
                className="border-gray-600 text-gray-400 hover:bg-gray-800"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Verlassen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
        {/* Left: Dice Scene (~60% on desktop) */}
        <div className="flex flex-1 flex-col gap-4 lg:w-3/5">
          <Card className="flex-1 overflow-hidden border-gray-700 bg-gray-800/50">
            <div className="min-h-[200px]">
              <Dice2D
                dice={localGameState.dice}
                keptDice={localGameState.keptDice}
                isRolling={isAnimating}
                onDieClick={handleDieClick}
                onRollComplete={handleRollComplete}
                disabled={!isMyTurn || localGameState.rollsRemaining === 3}
                canKeep={isMyTurn && localGameState.rollsRemaining < 3}
              />
            </div>
          </Card>

          {/* Game Info & Actions */}
          <Card className="border-gray-700 bg-gray-800/50 p-4">
            <div className="space-y-3">
              {isPaused ? (
                <div className="rounded-md border border-amber-600/40 bg-amber-900/20 p-3 text-center">
                  <p className="text-sm font-semibold text-amber-300">Spiel pausiert</p>
                  <p className="text-xs text-amber-200/80 mt-1">
                    Bereit: {readyCount}/{localGameState.players.length}
                  </p>
                  <Button
                    onClick={handleResumeReady}
                    size="sm"
                    className="mt-3 bg-amber-600 hover:bg-amber-700"
                  >
                    {me?.isReady ? 'Nicht bereit' : 'Bereit zum Fortsetzen'}
                  </Button>
                  {allReadyToResume && (
                    <p className="mt-2 text-xs text-green-300">Alle bereit, Spiel wird fortgesetzt...</p>
                  )}
                </div>
              ) : showPauseVoteControls ? (
                <div className="rounded-md border border-gray-700 bg-gray-900/40 p-3">
                  <p className="text-xs text-gray-300 mb-2">Pause abstimmen ({pauseVotes?.votedYes.length || 0}/{pauseVotes?.required || Math.floor(localGameState.players.length / 2) + 1})</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePauseVote(true)}
                      size="sm"
                      variant="outline"
                      className="border-amber-600 text-amber-300 hover:bg-amber-900/30"
                    >
                      Ja, pausieren
                    </Button>
                    <Button
                      onClick={() => handlePauseVote(false)}
                      size="sm"
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
                    >
                      Nein
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-gray-700 bg-gray-900/40 p-3">
                  <Button
                    onClick={handleStartPauseVote}
                    size="sm"
                    variant="outline"
                    className="border-amber-600 text-amber-300 hover:bg-amber-900/30"
                  >
                    Pause-Abstimmung starten
                  </Button>
                </div>
              )}

              {/* Turn Status */}
              {teamTotals.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {teamTotals.map(team => (
                    <div key={team.teamId} className="rounded-md bg-cyan-900/20 border border-cyan-700/30 p-2">
                      <p className="text-xs text-cyan-300 font-semibold">{team.teamName}</p>
                      <p className="text-sm text-cyan-100 font-bold">{team.total} Punkte</p>
                      <p className="text-[10px] text-gray-300">{team.members}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center">
                {isPaused ? (
                  <p className="text-lg font-bold text-amber-300">Pausiert</p>
                ) : isMyTurn ? (
                  <p className="text-lg font-bold text-green-400">
                    {t('game.yourTurn')}
                  </p>
                ) : (
                  <p className="text-lg text-gray-400">
                    {t('game.waitingForPlayer', {
                      name: currentPlayer?.displayName || ''
                    })}
                  </p>
                )}
              </div>

              {/* Round & Rolls Info */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {t('game.round', {
                    current: localGameState.round,
                    total: 13
                  })}
                </span>
                <span className={`font-semibold ${
                  localGameState.rollsRemaining > 0 ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {localGameState.rollsRemaining > 0
                    ? t('game.rollsRemaining', { count: localGameState.rollsRemaining })
                    : t('game.noRollsLeft')
                  }
                </span>
              </div>

              {/* Roll Button */}
              <Button
                onClick={handleRollDice}
                disabled={!canRoll}
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {t('game.roll')}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right: Scoresheet (~40% on desktop) */}
        <div className="lg:w-2/5">
          <Scoresheet
            players={localGameState.players}
            currentPlayerIndex={localGameState.currentPlayerIndex}
            currentUserId={currentUserId}
            dice={localGameState.dice}
            rollsRemaining={localGameState.rollsRemaining}
            ruleset={localGameState.ruleset}
            onSelectCategory={handleSelectCategory}
            canScore={canScore}
          />
        </div>
      </div>

      {/* Bottom: Turn Timer */}
      <div className="border-t border-gray-700 p-4">
        <TurnTimer
          startedAt={localGameState.turnStartedAt}
          duration={localGameState.turnDuration}
          isCurrentPlayer={isMyTurn}
        />
      </div>
      </div>
      <GameChat
        roomId={roomId}
        socket={socket}
        currentUserId={currentUserId}
      />
    </>
  )
}
