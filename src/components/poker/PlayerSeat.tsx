'use client';

import { Card } from '@/components/casino/Card';
import { ChipStack } from '@/components/casino/ChipStack';
import type { Card as CardType } from '@/lib/game/cards/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface PlayerSeatProps {
  player: {
    displayName: string;
    chips: number;
    currentBet: number;
    holeCards: CardType[];
    isFolded: boolean;
    isAllIn: boolean;
    isSittingOut: boolean;
  };
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isActive: boolean;
  isCurrentUser: boolean;
  showCards: boolean;
  position: number;
  timeLeft?: number;
  className?: string;
}

// Seat positions arranged clockwise around oval table
// Position 0 = bottom center (current player always here)
const SEAT_POSITIONS: Record<number, string> = {
  0: 'bottom-4 left-1/2 -translate-x-1/2', // Bottom center
  1: 'bottom-20 left-4', // Bottom left
  2: 'top-1/2 left-2 -translate-y-1/2', // Middle left
  3: 'top-4 left-16', // Top left
  4: 'top-2 left-1/2 -translate-x-1/2', // Top center
  5: 'top-4 right-16', // Top right
  6: 'top-1/2 right-2 -translate-y-1/2', // Middle right
  7: 'bottom-20 right-4', // Bottom right
  8: 'bottom-8 right-20', // Bottom right-center
};

export function PlayerSeat({
  player,
  isDealer,
  isSmallBlind,
  isBigBlind,
  isActive,
  isCurrentUser,
  showCards,
  position,
  timeLeft,
  className,
}: PlayerSeatProps) {
  const initials = player.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const statusText = player.isFolded
    ? 'Gepasst'
    : player.isAllIn
    ? 'All-In'
    : player.isSittingOut
    ? 'Pause'
    : null;

  return (
    <div
      className={cn(
        'absolute flex flex-col items-center gap-2 transition-all duration-300',
        SEAT_POSITIONS[position],
        className
      )}
    >
      {/* Hole Cards */}
      {player.holeCards.length > 0 && (
        <div className="flex gap-1 mb-1">
          {player.holeCards.map((card, index) => (
            <Card
              key={index}
              rank={card.rank}
              suit={card.suit}
              size="sm"
              faceDown={!isCurrentUser && !showCards}
            />
          ))}
        </div>
      )}

      {/* Player Avatar and Info */}
      <div
        className={cn(
          'relative flex flex-col items-center gap-1 transition-all duration-300',
          isActive && 'ring-4 ring-yellow-500 rounded-full animate-pulse-subtle'
        )}
      >
        {/* Avatar */}
        <div className="relative">
          <Avatar
            className={cn(
              'w-16 h-16 border-4 transition-all',
              isActive
                ? 'border-yellow-500'
                : isCurrentUser
                ? 'border-green-500'
                : 'border-gray-600',
              (player.isFolded || player.isSittingOut) && 'opacity-50 grayscale'
            )}
          >
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-800 text-white font-bold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Badges */}
          <div className="absolute -top-2 -right-2 flex gap-1">
            {isDealer && (
              <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-800 flex items-center justify-center font-bold text-sm shadow-lg">
                D
              </div>
            )}
            {isSmallBlind && (
              <div className="w-7 h-7 rounded-full bg-yellow-400 border-2 border-gray-800 flex items-center justify-center font-bold text-xs shadow-lg">
                SB
              </div>
            )}
            {isBigBlind && (
              <div className="w-7 h-7 rounded-full bg-orange-500 border-2 border-gray-800 flex items-center justify-center font-bold text-xs text-white shadow-lg">
                BB
              </div>
            )}
          </div>

          {/* Timer */}
          {isActive && timeLeft !== undefined && timeLeft > 0 && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-14 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / 30) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Player Name */}
        <div className="text-center">
          <p
            className={cn(
              'font-semibold text-sm text-white px-2 py-0.5 rounded-md bg-gray-900/80',
              isCurrentUser && 'bg-green-900/80'
            )}
          >
            {player.displayName}
          </p>
        </div>

        {/* Chip Count */}
        <div className="text-center">
          <p className="text-xs font-bold text-yellow-400 bg-gray-900/80 px-2 py-0.5 rounded-md">
            ${player.chips.toLocaleString()}
          </p>
        </div>

        {/* Status Label */}
        {statusText && (
          <div
            className={cn(
              'absolute -bottom-8 px-2 py-1 rounded-md text-xs font-bold',
              player.isFolded
                ? 'bg-gray-700 text-gray-300'
                : player.isAllIn
                ? 'bg-red-600 text-white'
                : 'bg-yellow-600 text-white'
            )}
          >
            {statusText}
          </div>
        )}
      </div>

      {/* Current Bet (shown in front of player) */}
      {player.currentBet > 0 && !player.isFolded && (
        <div className="mt-2">
          <ChipStack amount={player.currentBet} size="sm" showLabel={true} />
        </div>
      )}
    </div>
  );
}
