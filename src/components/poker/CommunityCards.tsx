'use client';

import { Card } from '@/components/casino/Card';
import type { Card as CardType } from '@/lib/game/cards/types';
import { cn } from '@/lib/utils';

interface CommunityCardsProps {
  cards: CardType[];
  phase: string;
  className?: string;
}

export function CommunityCards({ cards, phase, className }: CommunityCardsProps) {
  // Determine which cards to show based on phase
  const visibleCards = cards.slice(0, getVisibleCardCount(phase));

  return (
    <div className={cn('flex gap-2 justify-center', className)}>
      {visibleCards.map((card, index) => (
        <div
          key={index}
          className="animate-slide-in"
          style={{
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'backwards'
          }}
        >
          <Card
            rank={card.rank}
            suit={card.suit}
            size="md"
            faceDown={false}
          />
        </div>
      ))}

      {/* Placeholder for unrevealed cards */}
      {Array.from({ length: 5 - visibleCards.length }).map((_, index) => (
        <div
          key={`placeholder-${index}`}
          className="w-[80px] h-[112px] rounded-lg border-2 border-dashed border-gray-600/50"
        />
      ))}
    </div>
  );
}

function getVisibleCardCount(phase: string): number {
  switch (phase) {
    case 'flop':
      return 3;
    case 'turn':
      return 4;
    case 'river':
    case 'showdown':
    case 'hand_end':
      return 5;
    default:
      return 0;
  }
}
