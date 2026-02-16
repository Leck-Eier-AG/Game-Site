'use client';

import { useEffect, useRef } from 'react';
import { Card } from '@/components/casino/Card';
import type { Card as CardType } from '@/lib/game/cards/types';
import type { PokerPhase } from '@/lib/game/poker/state-machine';
import { cn } from '@/lib/utils';

interface PokerCommunityCardsProps {
  cards: CardType[];
  phase: PokerPhase;
}

export function PokerCommunityCards({ cards, phase }: PokerCommunityCardsProps) {
  const prevCardCountRef = useRef(0);

  // Track new cards for staggered animation
  useEffect(() => {
    prevCardCountRef.current = cards.length;
  }, [cards.length]);

  // Determine how many cards to show based on phase
  const visibleCardCount = (() => {
    switch (phase) {
      case 'waiting':
      case 'blinds':
      case 'preflop':
        return 0;
      case 'flop':
        return 3;
      case 'turn':
        return 4;
      case 'river':
      case 'showdown':
      case 'hand_end':
        return 5;
      default:
        return cards.length;
    }
  })();

  // Create placeholders for unrevealed cards
  const displayCards = Array.from({ length: 5 }, (_, index) => {
    if (index < cards.length && index < visibleCardCount) {
      return { type: 'real' as const, card: cards[index], index };
    }
    return { type: 'placeholder' as const, index };
  });

  if (phase === 'waiting' || phase === 'blinds') {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      {displayCards.map((item) => {
        if (item.type === 'real') {
          const isNewCard = item.index >= prevCardCountRef.current;
          return (
            <div
              key={`${item.card.suit}-${item.card.rank}-${item.index}`}
              className={cn(
                isNewCard && 'animate-poker-card-deal'
              )}
              style={{
                animationDelay: `${item.index * 150}ms`,
                '--deck-offset-x': '-400px',
                '--deck-offset-y': '-200px'
              } as React.CSSProperties}
            >
              <Card
                rank={item.card.rank}
                suit={item.card.suit}
                faceDown={false}
                size="md"
              />
            </div>
          );
        }

        // Placeholder for unrevealed card
        return (
          <div
            key={`placeholder-${item.index}`}
            className="w-[80px] h-[112px] rounded-lg border-2 border-dashed border-gray-600 bg-gray-900/30"
          />
        );
      })}
    </div>
  );
}
