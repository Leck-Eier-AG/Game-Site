'use client';

import { Card } from '@/components/casino/Card';
import { ChipStack } from '@/components/casino/ChipStack';
import type { PlayerHand as PlayerHandType } from '@/lib/game/blackjack/state-machine';
import { calculateHandValue, getBestValue } from '@/lib/game/blackjack/engine-wrapper';
import { cn } from '@/lib/utils';

interface PlayerHandProps {
  hand: PlayerHandType;
  isActive: boolean;
  playerName: string;
  isCurrentUser: boolean;
}

export function PlayerHand({ hand, isActive, playerName, isCurrentUser }: PlayerHandProps) {
  const handValue = getBestValue(hand.cards);
  const handValues = calculateHandValue(hand.cards);
  const isSoft = handValues.hi <= 21 && handValues.hi !== handValues.lo && handValue === handValues.hi;
  const isBusted = hand.status === 'busted';
  const isBlackjack = hand.status === 'blackjack';
  const isStood = hand.status === 'stood';
  const isSurrendered = hand.status === 'surrendered';

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl transition-all duration-300',
        isActive && 'ring-4 ring-yellow-400 shadow-xl shadow-yellow-400/50',
        isBusted && 'opacity-60',
        isBlackjack && 'ring-4 ring-yellow-500 shadow-xl shadow-yellow-500/50'
      )}
    >
      {/* Cards */}
      <div className="flex gap-2 mb-3">
        {hand.cards.map((card, index) => (
          <Card
            key={index}
            rank={card.rank}
            suit={card.suit}
            size="md"
            className="transition-all duration-300 hover:translate-y-[-4px]"
          />
        ))}
      </div>

      {/* Hand Value */}
      <div className="flex flex-col items-center space-y-2">
        <div
          className={cn(
            'text-lg font-bold px-4 py-1 rounded-full',
            isBusted && 'bg-red-500 text-white',
            isBlackjack && 'bg-yellow-500 text-black',
            isStood && 'bg-gray-500 text-white',
            isSurrendered && 'bg-gray-600 text-white',
            !isBusted && !isBlackjack && !isStood && !isSurrendered && 'bg-white/90 text-gray-900'
          )}
        >
          {isBusted && 'BUST'}
          {isBlackjack && 'BLACKJACK!'}
          {isSurrendered && 'AUFGEGEBEN'}
          {!isBusted && !isBlackjack && !isSurrendered && (
            <>
              {isSoft && 'Soft '}
              {handValue}
            </>
          )}
        </div>

        {/* Bet Amount */}
        {hand.bet > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/80">Einsatz:</span>
            <ChipStack amount={hand.bet} size="sm" />
          </div>
        )}

        {/* Split Indicator */}
        {hand.isSplit && (
          <div className="text-xs text-yellow-400 font-semibold">Geteilt</div>
        )}

        {/* Doubled Indicator */}
        {hand.isDoubled && (
          <div className="text-xs text-blue-400 font-semibold">Verdoppelt</div>
        )}
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
          Dein Zug
        </div>
      )}
    </div>
  );
}
