'use client';

import { Card } from '@/components/casino/Card';
import type { Card as CardType } from '@/lib/game/cards/types';
import { cn } from '@/lib/utils';

interface PokerHandStrengthProps {
  holeCards: CardType[];
  communityCards: CardType[];
  playerName: string;
  handName: string; // Pre-evaluated hand name from server
  bestHandCards?: CardType[]; // Pre-evaluated best 5-card hand from server
  isWinner?: boolean;
  className?: string;
}

export function PokerHandStrength({
  holeCards,
  communityCards,
  playerName,
  handName,
  bestHandCards = [],
  isWinner = false,
  className
}: PokerHandStrengthProps) {
  // Check if a card is part of the best hand
  const isCardInBestHand = (card: CardType) => {
    if (!bestHandCards || bestHandCards.length === 0) return false;
    return bestHandCards.some(
      (bestCard) => bestCard.rank === card.rank && bestCard.suit === card.suit
    );
  };

  return (
    <div
      className={cn(
        'bg-gray-900/90 rounded-lg p-4 border-2 transition-all duration-300',
        isWinner ? 'border-yellow-500 shadow-lg shadow-yellow-500/50' : 'border-gray-700',
        'animate-hand-reveal',
        className
      )}
    >
      {/* Player name and hand rank */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-white">{playerName}</div>
        <div
          className={cn(
            'px-3 py-1 rounded-full text-sm font-bold',
            isWinner
              ? 'bg-yellow-500 text-gray-900'
              : handName.includes('Flush') || handName.includes('Straight')
              ? 'bg-purple-600 text-white'
              : handName.includes('Full') || handName.includes('Drilling') || handName.includes('Vierling')
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300'
          )}
        >
          {handName}
        </div>
      </div>

      {/* All cards with best hand highlighted */}
      <div className="space-y-2">
        {/* Hole cards */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-16">Hole:</span>
          <div className="flex gap-1">
            {holeCards.map((card, index) => {
              const isInBestHand = isCardInBestHand(card);
              return (
                <div
                  key={`hole-${index}`}
                  className={cn(
                    'relative',
                    isInBestHand && 'ring-4 ring-yellow-400 rounded-lg shadow-lg shadow-yellow-400/50'
                  )}
                >
                  <Card rank={card.rank} suit={card.suit} size="sm" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Community cards */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-16">Board:</span>
          <div className="flex gap-1">
            {communityCards.map((card, index) => {
              const isInBestHand = isCardInBestHand(card);
              return (
                <div
                  key={`community-${index}`}
                  className={cn(
                    'relative',
                    isInBestHand && 'ring-4 ring-yellow-400 rounded-lg shadow-lg shadow-yellow-400/50'
                  )}
                >
                  <Card rank={card.rank} suit={card.suit} size="sm" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Winner badge */}
      {isWinner && (
        <div className="mt-3 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500 text-gray-900 font-bold text-sm animate-pulse">
            <span className="text-lg">🏆</span>
            Gewinner
          </div>
        </div>
      )}
    </div>
  );
}
