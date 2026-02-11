'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Socket } from 'socket.io-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X, RefreshCw } from 'lucide-react'

interface RematchVote {
  votedYes: string[]
  votedNo: string[]
  total: number
  required: number
}

interface RematchVoteProps {
  roomId: string
  socket: Socket
  rematchVotes: RematchVote
  currentUserId: string
  players: Array<{ userId: string; displayName: string }>
}

export function RematchVote({
  roomId,
  socket,
  rematchVotes: initialVotes,
  currentUserId,
  players
}: RematchVoteProps) {
  const router = useRouter()
  const [votes, setVotes] = useState<RematchVote>(initialVotes)
  const [hasVoted, setHasVoted] = useState(false)
  const [myVote, setMyVote] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if user already voted
    if (votes.votedYes.includes(currentUserId)) {
      setHasVoted(true)
      setMyVote(true)
    } else if (votes.votedNo.includes(currentUserId)) {
      setHasVoted(true)
      setMyVote(false)
    }
  }, [votes, currentUserId])

  useEffect(() => {
    // Listen for vote updates
    const handleVoteUpdate = (updatedVotes: RematchVote) => {
      setVotes(updatedVotes)
    }

    const handleRematchAccepted = () => {
      // Game reset to waiting room - no navigation needed, page will update
    }

    const handleRematchDeclined = () => {
      // Navigate back to lobby
      router.push('/lobby')
    }

    socket.on('game:rematch-update', handleVoteUpdate)
    socket.on('game:rematch-accepted', handleRematchAccepted)
    socket.on('game:rematch-declined', handleRematchDeclined)

    return () => {
      socket.off('game:rematch-update', handleVoteUpdate)
      socket.off('game:rematch-accepted', handleRematchAccepted)
      socket.off('game:rematch-declined', handleRematchDeclined)
    }
  }, [socket, router])

  const handleVote = (vote: boolean) => {
    socket.emit('game:rematch-vote', { roomId, vote }, (response: any) => {
      if (response?.success) {
        setHasVoted(true)
        setMyVote(vote)
      }
    })
  }

  const getPlayerVote = (userId: string): 'yes' | 'no' | null => {
    if (votes.votedYes.includes(userId)) return 'yes'
    if (votes.votedNo.includes(userId)) return 'no'
    return null
  }

  return (
    <Card className="border-gray-700 bg-gray-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <RefreshCw className="h-5 w-5" />
          Noch eine Runde?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vote Buttons */}
        {!hasVoted && (
          <div className="flex gap-3">
            <Button
              onClick={() => handleVote(true)}
              size="lg"
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="mr-2 h-5 w-5" />
              Ja, nochmal!
            </Button>
            <Button
              onClick={() => handleVote(false)}
              size="lg"
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700/50"
            >
              <X className="mr-2 h-5 w-5" />
              Nein, danke
            </Button>
          </div>
        )}

        {/* Vote Confirmation */}
        {hasVoted && (
          <div
            className={`rounded-lg p-4 text-center ${
              myVote
                ? 'bg-green-600/20 text-green-400'
                : 'bg-gray-700/50 text-gray-300'
            }`}
          >
            {myVote ? (
              <p className="flex items-center justify-center gap-2">
                <Check className="h-5 w-5" />
                Du hast für Rematch gestimmt
              </p>
            ) : (
              <p className="flex items-center justify-center gap-2">
                <X className="h-5 w-5" />
                Du möchtest nicht weiterspielen
              </p>
            )}
          </div>
        )}

        {/* Progress Indicator */}
        <div className="rounded-lg bg-gray-900/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-400">Fortschritt</span>
            <span className="font-semibold text-white">
              {votes.votedYes.length}/{votes.required}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full bg-green-600 transition-all duration-300"
              style={{
                width: `${(votes.votedYes.length / votes.required) * 100}%`
              }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {votes.required - votes.votedYes.length > 0
              ? `Noch ${votes.required - votes.votedYes.length} Stimme${
                  votes.required - votes.votedYes.length === 1 ? '' : 'n'
                } benötigt`
              : 'Rematch wird gestartet...'}
          </p>
        </div>

        {/* Voter List */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-400">Spieler</p>
          {players.map((player) => {
            const vote = getPlayerVote(player.userId)
            return (
              <div
                key={player.userId}
                className="flex items-center justify-between rounded-lg bg-gray-900/50 p-3"
              >
                <span
                  className={`font-medium ${
                    player.userId === currentUserId ? 'text-green-400' : 'text-white'
                  }`}
                >
                  {player.displayName}
                  {player.userId === currentUserId && ' (Du)'}
                </span>
                <div className="flex items-center gap-2">
                  {vote === 'yes' && (
                    <div className="flex items-center gap-1 text-green-400">
                      <Check className="h-4 w-4" />
                      <span className="text-sm">Ja</span>
                    </div>
                  )}
                  {vote === 'no' && (
                    <div className="flex items-center gap-1 text-gray-400">
                      <X className="h-4 w-4" />
                      <span className="text-sm">Nein</span>
                    </div>
                  )}
                  {vote === null && (
                    <span className="text-sm text-gray-600">Wartet...</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Return to Lobby Link */}
        {hasVoted && !myVote && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-gray-400 hover:text-white"
            onClick={() => router.push('/lobby')}
          >
            Zurück zur Lobby
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
