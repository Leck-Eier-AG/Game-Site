'use client';

import { Card } from '@/components/casino/Card';
import type { Card as CardType } from '@/lib/game/cards/types';
import { getBestValue } from '@/lib/game/blackjack/engine-wrapper';
import { cn } from '@/lib/utils';

interface DealerHandProps {
  cards: CardType[];
  hidden: boolean;
  handValue: number;
  phase: string;
}

export function DealerHand({ cards, hidden, handValue, phase }: DealerHandProps) {
  const displayValue = hidden ? '?' : getBestValue(cards);
  const isBusted = displayValue !== '?' && displayValue > 21;
  const isDealerTurn = phase === 'dealer_turn';

  return (
    <div className="flex flex-col items-center space-y-3">
      {/* Cards */}
      <div className="flex gap-2">
        {cards.map((card, index) => (
          <Card
            key={index}
            rank={card.rank}
            suit={card.suit}
            faceDown={hidden && index === 0}
            size="md"
            className={cn(
              'transition-all duration-300',
              !hidden && 'animate-in fade-in-0 slide-in-from-top-4'
            )}
          />
        ))}
      </div>

      {/* Hand Value */}
      <div
        className={cn(
          'text-lg font-bold px-4 py-1 rounded-full',
          isBusted ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-900'
        )}
      >
        {isBusted ? 'BUST' : displayValue}
      </div>

      {/* Dealer Status */}
      {isDealerTurn && (
        <div className="text-yellow-400 text-sm font-semibold animate-pulse">
          Dealer zieht...
        </div>
      )}
    </div>
  );
}
