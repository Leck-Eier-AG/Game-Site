'use client';

import { useRef, useEffect, useState } from 'react';
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
  const [localHidden, setLocalHidden] = useState(hidden);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const displayValue = localHidden ? '?' : getBestValue(cards);
  const isBusted = displayValue !== '?' && displayValue > 21;
  const isDealerTurn = phase === 'dealer_turn';
  const prevCountRef = useRef(cards.length);
  const prevHiddenRef = useRef(hidden);

  // Mark that initial render is complete
  useEffect(() => {
    setIsInitialRender(false);
  }, []);

  // Handle hidden state changes with a small delay to ensure smooth flip animation
  useEffect(() => {
    if (hidden !== prevHiddenRef.current) {
      prevHiddenRef.current = hidden;

      if (!hidden) {
        // When revealing, add a small delay to ensure state is stable
        const timer = setTimeout(() => {
          setLocalHidden(false);
        }, 50);
        return () => clearTimeout(timer);
      } else {
        // When hiding, update immediately
        setLocalHidden(true);
      }
    }
  }, [hidden]);

  useEffect(() => {
    prevCountRef.current = cards.length;
  }, [cards.length]);

  const prevCount = prevCountRef.current;

  return (
    <div className="flex flex-col items-center space-y-3">
      {/* Cards */}
      <div className="flex gap-2">
        {cards.map((card, index) => {
          const isNew = index >= prevCount;
          const isSecondCard = index === 1;
          const shouldBeFaceDown = localHidden && isSecondCard;

          // Disable flip transition for hole card during dealing to prevent it from flashing face-up
          // Keep transition disabled while hidden is true to prevent any flashing
          const disableFlipTransition = shouldBeFaceDown;

          return (
            <div
              key={`${card.rank}-${card.suit}-${index}`}
              className={cn(isNew && 'animate-card-slide-in')}
              style={{
                ...(isNew ? {
                  '--deck-offset-x': '-300px',
                  '--deck-offset-y': '0px',
                  animationDelay: `${(index - prevCount) * 150}ms`,
                } : {})
              } as React.CSSProperties}
            >
              <Card
                rank={card.rank}
                suit={card.suit}
                faceDown={shouldBeFaceDown}
                size="md"
                className={disableFlipTransition ? '!transition-none' : undefined}
                style={{
                  ...(disableFlipTransition ? { transitionDuration: '0s !important' } : {})
                }}
              />
            </div>
          );
        })}
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
