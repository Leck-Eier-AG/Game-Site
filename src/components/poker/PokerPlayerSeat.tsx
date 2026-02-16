'use client';

import { useEffect, useRef } from 'react';
import { Card } from '@/components/casino/Card';
import type { PokerPlayer } from '@/lib/game/poker/state-machine';
import { cn } from '@/lib/utils';

interface PokerPlayerSeatProps {
  player: PokerPlayer;
  isActive: boolean;
  isCurrentUser: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  showCards: boolean; // Show at showdown or if current user
  position: number; // 0-7 for positioning
  timeLeft?: number; // For timer arc (in seconds)
}

export function PokerPlayerSeat({
  player,
  isActive,
  isCurrentUser,
  isDealer,
  isSmallBlind,
  isBigBlind,
  showCards,
  position,
  timeLeft
}: PokerPlayerSeatProps) {
  const prevCardCountRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track new cards for animation
  useEffect(() => {
    prevCardCountRef.current = player.holeCards.length;
  }, [player.holeCards.length]);

  // Calculate timer arc progress (circumference = 2 * PI * r, r = 40)
  const timerCircumference = 2 * Math.PI * 40;
  const timerProgress = timeLeft !== undefined ? (timeLeft / 30) : 1; // Assuming 30s max

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-col items-center gap-2 transition-all duration-300',
        isActive && 'scale-105'
      )}
    >
      {/* Active player indicator with timer arc */}
      <div className="relative">
        {/* Timer arc SVG (circular progress around avatar) */}
        {isActive && timeLeft !== undefined && (
          <svg className="absolute -inset-2 w-20 h-20 -rotate-90" viewBox="0 0 88 88">
            {/* Background circle */}
            <circle
              cx="44"
              cy="44"
              r="40"
              stroke="#374151"
              strokeWidth="4"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="44"
              cy="44"
              r="40"
              stroke={timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#f59e0b' : '#22c55e'}
              strokeWidth="4"
              fill="none"
              strokeDasharray={timerCircumference}
              strokeDashoffset={timerCircumference * (1 - timerProgress)}
              className="transition-all duration-1000 linear"
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Avatar with glowing ring for active player */}
        <div
          className={cn(
            'relative w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl transition-all duration-300',
            isActive && 'ring-8 ring-yellow-400 animate-active-glow',
            player.isFolded && 'opacity-40 grayscale',
            player.isSittingOut && 'opacity-30',
            !player.isConnected && 'opacity-20',
            isCurrentUser ? 'bg-gradient-to-br from-cyan-500 to-cyan-700' : 'bg-gradient-to-br from-gray-600 to-gray-800'
          )}
        >
          {player.displayName.substring(0, 2).toUpperCase()}
        </div>

        {/* Countdown number when time is low */}
        {isActive && timeLeft !== undefined && timeLeft <= 5 && (
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-red-500 animate-pulse">
            {Math.ceil(timeLeft)}
          </div>
        )}
      </div>

      {/* Player name */}
      <div className={cn(
        'text-sm font-semibold px-2 py-1 rounded-md bg-gray-800/80 min-w-[100px] text-center',
        isCurrentUser && 'bg-cyan-900/80 text-cyan-200',
        player.isFolded && 'text-gray-500'
      )}>
        {player.displayName}
        {isCurrentUser && ' (Du)'}
      </div>

      {/* Dealer/Blind badges */}
      <div className="flex gap-1">
        {isDealer && (
          <div className="px-2 py-0.5 rounded-full bg-yellow-600 text-white text-xs font-bold">
            D
          </div>
        )}
        {isSmallBlind && (
          <div className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">
            SB
          </div>
        )}
        {isBigBlind && (
          <div className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold">
            BB
          </div>
        )}
      </div>

      {/* Hole cards */}
      {player.holeCards.length > 0 && (
        <div className="flex gap-1">
          {player.holeCards.map((card, index) => {
            const isNewCard = index >= prevCardCountRef.current;
            return (
              <div
                key={`${card.suit}-${card.rank}-${index}`}
                className={cn(
                  isNewCard && 'animate-poker-card-deal'
                )}
                style={{
                  animationDelay: `${index * 150}ms`,
                  '--deck-offset-x': '-400px',
                  '--deck-offset-y': '-200px'
                } as React.CSSProperties}
              >
                <Card
                  rank={card.rank}
                  suit={card.suit}
                  faceDown={!showCards && !isCurrentUser}
                  size="sm"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Chip count */}
      <div className={cn(
        'text-xs font-bold px-2 py-1 rounded-md',
        player.chips > 0 ? 'bg-gray-700 text-yellow-400' : 'bg-red-900 text-red-300'
      )}>
        ${player.chips.toLocaleString()}
      </div>

      {/* Current bet display */}
      {player.currentBet > 0 && (
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div className="bg-orange-600/90 backdrop-blur-sm rounded-lg px-3 py-1 border border-orange-500 shadow-lg">
            <div className="text-sm font-bold text-white">
              ${player.currentBet.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Status indicators */}
      {player.isFolded && !player.isSittingOut && (
        <div className="absolute top-0 right-0 px-2 py-1 rounded-md bg-red-900/90 text-red-300 text-xs font-bold">
          Gefoldet
        </div>
      )}
      {player.isAllIn && (
        <div className="absolute top-0 left-0 px-2 py-1 rounded-md bg-red-600 text-white text-xs font-bold animate-pulse">
          ALL-IN
        </div>
      )}
      {player.isSittingOut && (
        <div className="absolute top-0 left-0 right-0 text-center px-2 py-1 rounded-md bg-gray-900/90 text-gray-400 text-xs font-bold">
          Sitzt aus
        </div>
      )}
      {!player.isConnected && (
        <div className="absolute top-0 left-0 right-0 text-center px-2 py-1 rounded-md bg-gray-900/90 text-gray-500 text-xs">
          Getrennt
        </div>
      )}

      {/* "DEIN ZUG" badge for active player */}
      {isActive && isCurrentUser && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-md bg-yellow-500 text-gray-900 text-sm font-bold animate-pulse shadow-lg">
          DEIN ZUG
        </div>
      )}
    </div>
  );
}
