'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSocket } from '@/lib/socket/provider'
import { WaitingRoom } from '@/components/game/WaitingRoom'
import { GameBoard } from '@/components/game/GameBoard'
import { BlackjackTable } from '@/components/blackjack/BlackjackTable'
import { RouletteTable } from '@/components/roulette/RouletteTable'
import { PokerTable } from '@/components/poker/PokerTable'
import type { GameState, PauseVote, RoomInfo } from '@/types/game'
import { useTranslations } from 'next-intl'
import { Trophy, ArrowLeft, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TransferDialog } from '@/components/wallet/transfer-dialog'
import { BetConfirmation } from '@/components/betting/bet-confirmation'

interface RoomData extends RoomInfo {
  players: { userId: string; displayName: string; isReady: boolean; teamId?: string }[]
  spectators: string[]
  gameState?: GameState
  pauseVotes?: PauseVote | null
}

interface PayoutEntry {
  userId: string
  displayName: string
  position: number
  amount: number
}

interface GameEndData {
  winner: string
  winnerTeamId?: string | null
  teamScores?: {
    teamId: string
    teamName: string
    total: number
    members: { userId: string; displayName: string; total: number }[]
  }[] | null
  scores: { userId: string; displayName: string; total: number }[]
  payouts?: PayoutEntry[]
}

export default function GameRoomPage() {
  const params = useParams()
  const router = useRouter()
  const { socket, isConnected, userId, balance } = useSocket()
  const t = useTranslations()

  const roomId = params.roomId as string
  const searchParams = useSearchParams()
  const [room, setRoom] = useState<RoomData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gameEnd, setGameEnd] = useState<GameEndData | null>(null)
  const [pendingBetAmount, setPendingBetAmount] = useState<number | null>(null)
  const [rebuyAvailable, setRebuyAvailable] = useState(false)
  const [rebuyAmount, setRebuyAmount] = useState(0)

  // Use refs for values needed inside the effect but that should NOT trigger re-runs
  const balanceRef = useRef(balance)
  balanceRef.current = balance
  const routerRef = useRef(router)
  routerRef.current = router
  const joinedRef = useRef(false)

  // Join room once when connected (separate from event listeners)
  useEffect(() => {
    if (!socket || !isConnected) return

    // Prevent duplicate joins on re-renders
    if (joinedRef.current) return
    joinedRef.current = true

    // Check if user already confirmed in lobby
    const alreadyConfirmed = searchParams.get('confirmed') === 'true'

    if (alreadyConfirmed) {
      // From lobby -- join directly, confirmation already happened
      socket.emit('room:join', { roomId })
    } else {
      // Direct URL -- check if high-stakes confirmation needed
      socket.emit('room:list', (response: { success: boolean; rooms?: RoomInfo[] }) => {
        if (response.success && response.rooms) {
          const targetRoom = response.rooms.find(r => r.id === roomId)
          const userBalance = balanceRef.current ?? 0
          if (targetRoom && targetRoom.isBetRoom && targetRoom.betAmount > 0 && userBalance > 0 && targetRoom.betAmount > userBalance * 0.25) {
            setPendingBetAmount(targetRoom.betAmount)
            return
          }
        }
        // Low-stakes, free room, or not found: join directly
        socket.emit('room:join', { roomId })
      })
    }
  }, [socket, isConnected, roomId, searchParams])

  // Event listeners (separate effect so join doesn't re-fire)
  useEffect(() => {
    if (!socket || !isConnected) return

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
      routerRef.current.push('/')
    }

    // Listen for game state updates (blackjack, roulette, poker handlers)
    const handleGameStateUpdate = (data: { state: GameState; roomId: string }) => {
      if (data.roomId !== roomId) return
      setRoom(prev => prev ? { ...prev, gameState: data.state } : prev)
    }

    // Listen for game end
    const handleGameEnded = (data: GameEndData) => {
      setGameEnd(data)
    }

    // Listen for game abort
    const handleGameAborted = () => {
      setGameEnd(null)
    }

    // Poker-specific: rebuy available
    const handleRebuyAvailable = (data: { amount: number }) => {
      setRebuyAvailable(true)
      setRebuyAmount(data.amount)
    }

    // Poker-specific: hand end (clear rebuy)
    const handlePokerHandEnd = () => {
      setRebuyAvailable(false)
    }

    socket.on('room:update', handleRoomUpdate)
    socket.on('game:state-update', handleGameStateUpdate)
    socket.on('room:player-joined', handlePlayerJoined)
    socket.on('room:player-left', handlePlayerLeft)
    socket.on('room:error', handleError)
    socket.on('room:kicked', handleKicked)
    socket.on('game:ended', handleGameEnded)
    socket.on('game:aborted', handleGameAborted)
    socket.on('poker:rebuy-available', handleRebuyAvailable)
    socket.on('poker:hand-end', handlePokerHandEnd)

    // Cleanup: leave room on unmount, unregister handlers
    return () => {
      socket.emit('room:leave', { roomId })
      socket.off('room:update', handleRoomUpdate)
      socket.off('game:state-update', handleGameStateUpdate)
      socket.off('room:player-joined', handlePlayerJoined)
      socket.off('room:player-left', handlePlayerLeft)
      socket.off('room:error', handleError)
      socket.off('room:kicked', handleKicked)
      socket.off('game:ended', handleGameEnded)
      socket.off('game:aborted', handleGameAborted)
      socket.off('poker:rebuy-available', handleRebuyAvailable)
      socket.off('poker:hand-end', handlePokerHandEnd)
      joinedRef.current = false
    }
  }, [socket, isConnected, roomId])

  // Confirmation handlers
  const handleBetConfirm = () => {
    setPendingBetAmount(null)
    if (socket) socket.emit('room:join', { roomId })
  }

  const handleBetCancel = () => {
    setPendingBetAmount(null)
    router.push('/')
  }

  // Poker rebuy handlers
  const handleRebuy = () => {
    if (socket) {
      socket.emit('poker:rebuy', { roomId }, (response: any) => {
        if (response?.success) {
          setRebuyAvailable(false)
        }
      })
    }
  }

  const handleDeclineRebuy = () => {
    setRebuyAvailable(false)
  }

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

  // High-stakes bet confirmation for direct URL navigation
  if (pendingBetAmount !== null) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <BetConfirmation
          open={true}
          betAmount={pendingBetAmount}
          currentBalance={balance ?? 0}
          onConfirm={handleBetConfirm}
          onCancel={handleBetCancel}
        />
      </div>
    )
  }

  // Game ended
  if (gameEnd || room.status === 'ended') {
    const scores = gameEnd?.scores || room.gameState?.players.map(p => ({
      userId: p.userId,
      displayName: p.displayName,
      total: p.scoresheet
        ? Object.values(p.scoresheet).reduce((sum: number, val: any) => sum + (val ?? 0), 0)
        : 0
    })) || []

    const sorted = [...scores].sort((a, b) => b.total - a.total)
    const winnerId = gameEnd?.winner || room.gameState?.winner
    const payouts = gameEnd?.payouts
    const teamScores = gameEnd?.teamScores
    const winnerTeamId = gameEnd?.winnerTeamId
    const isBetGame = room.isBetRoom && payouts && payouts.length > 0

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <Card className="w-full max-w-md border-gray-700 bg-gray-800/80">
          <CardHeader className="text-center">
            <Trophy className="mx-auto h-16 w-16 text-yellow-400" />
            <CardTitle className="text-3xl text-white">{t('game.gameOver')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {teamScores && teamScores.length > 0 && (
              <div className="space-y-2">
                {teamScores.map((team) => (
                  <div
                    key={team.teamId}
                    className={`rounded-lg p-3 ${
                      team.teamId === winnerTeamId
                        ? 'bg-cyan-500/20 border border-cyan-400/40'
                        : 'bg-gray-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold ${team.teamId === winnerTeamId ? 'text-cyan-300' : 'text-gray-200'}`}>
                        {team.teamName}
                      </p>
                      <p className="text-sm font-semibold text-cyan-200">{team.total} Punkte</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {team.members.map(member => member.displayName).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {sorted.map((player, index) => {
              const isWinner = player.userId === winnerId
              const isMe = player.userId === userId
              const payout = payouts?.find(p => p.userId === player.userId)
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
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className={`text-xl font-bold ${isWinner ? 'text-yellow-300' : 'text-gray-300'}`}>
                        {player.total} Pkt.
                      </span>
                      {isBetGame && payout && (
                        <p className={`text-sm font-semibold ${payout.amount > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                          +{payout.amount} Chips
                        </p>
                      )}
                    </div>
                    {!isMe && (
                      <TransferDialog
                        recipientId={player.userId}
                        recipientName={player.displayName}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-600 text-green-600 hover:bg-green-600/10"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        }
                      />
                    )}
                  </div>
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
    // Route to correct game board based on gameType
    switch (room.gameType) {
      case 'kniffel':
        return (
          <GameBoard
            gameState={room.gameState}
            roomId={roomId}
            currentUserId={userId || ''}
            hostId={room.hostId}
            socket={socket}
            isBetRoom={room.isBetRoom}
            betAmount={room.betAmount}
            pauseVotes={room.pauseVotes || null}
          />
        )
      case 'blackjack':
        return (
          <BlackjackTable
            gameState={room.gameState as any}
            roomId={roomId}
            currentUserId={userId || ''}
            socket={socket}
            isBetRoom={room.isBetRoom}
            betAmount={room.betAmount}
          />
        )
      case 'roulette':
        return (
          <RouletteTable
            gameState={room.gameState as any}
            roomId={roomId}
            currentUserId={userId || ''}
            socket={socket}
            isBetRoom={room.isBetRoom}
            isHost={room.hostId === userId}
          />
        )
      case 'poker':
        return (
          <>
            <PokerTable
              gameState={room.gameState as any}
              roomId={roomId}
              currentUserId={userId || ''}
              socket={socket}
              isBetRoom={room.isBetRoom}
            />

            {/* Rebuy Dialog */}
            {rebuyAvailable && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="w-full max-w-md border-gray-700 bg-gray-800/95">
                  <CardHeader>
                    <CardTitle className="text-2xl text-white">Chips aufstocken?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-300">
                      Deine Chips sind aufgebraucht. Möchtest du für ${rebuyAmount} wieder einsteigen?
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleRebuy}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        Aufstocken (${rebuyAmount})
                      </Button>
                      <Button
                        onClick={handleDeclineRebuy}
                        variant="outline"
                        className="flex-1"
                      >
                        Ablehnen
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400">
                      Wenn du ablehnst, wirst du als Zuschauer weiterspielen.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )
      default:
        return null
    }
  }

  return null
}
