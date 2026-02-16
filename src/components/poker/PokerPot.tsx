'use client';

import { useEffect, useState } from 'react';
import { calculateSidePots, type Pot } from '@/lib/game/poker/pot-calculator';
import { cn } from '@/lib/utils';

interface PokerPotProps {
  mainPot: number;
  players: Array<{
    userId: string;
    totalBetInHand: number;
    isFolded: boolean;
  }>;
  animateUpdate?: boolean;
}

export function PokerPot({ mainPot, players, animateUpdate = false }: PokerPotProps) {
  const [displayPot, setDisplayPot] = useState(mainPot);
  const [pots, setPots] = useState<Pot[]>([]);

  // Calculate side pots
  useEffect(() => {
    const contributions = players.map(p => ({
      userId: p.userId,
      amount: p.totalBetInHand,
      isFolded: p.isFolded
    }));

    const calculatedPots = calculateSidePots(contributions);
    setPots(calculatedPots);
  }, [players]);

  // Animate pot value changes
  useEffect(() => {
    if (animateUpdate && displayPot !== mainPot) {
      const diff = mainPot - displayPot;
      const steps = 20;
      const increment = diff / steps;
      let current = displayPot;

      const interval = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= mainPot) || (increment < 0 && current <= mainPot)) {
          setDisplayPot(mainPot);
          clearInterval(interval);
        } else {
          setDisplayPot(Math.round(current));
        }
      }, 30);

      return () => clearInterval(interval);
    } else {
      setDisplayPot(mainPot);
    }
  }, [mainPot, animateUpdate]);

  // If there are side pots, show them
  const hasSidePots = pots.length > 1;
  const mainPotFromCalc = pots[0]?.amount || mainPot;
  const sidePots = pots.slice(1);

  if (mainPot === 0 && pots.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Main pot display */}
      <div className={cn(
        'bg-gray-900/80 backdrop-blur-sm rounded-xl px-6 py-4 border-2 border-yellow-500/30',
        animateUpdate && 'animate-count-up'
      )}>
        <div className="text-center">
          <div className="text-xs font-semibold text-gray-400 mb-1">
            {hasSidePots ? 'Hauptpot' : 'Pot'}
          </div>
          <div className="text-3xl font-bold text-yellow-400">
            ${(hasSidePots ? mainPotFromCalc : displayPot).toLocaleString()}
          </div>
          {hasSidePots && (
            <div className="text-xs text-gray-400 mt-1">
              {pots[0]?.eligiblePlayerIds.length || 0} Spieler
            </div>
          )}
        </div>
      </div>

      {/* Side pots grid (2x2 layout) */}
      {sidePots.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {sidePots.slice(0, 4).map((pot, index) => (
            <div
              key={index}
              className="bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-700 animate-count-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-center">
                <div className="text-xs font-semibold text-gray-400">
                  Side {index + 1}
                </div>
                <div className="text-lg font-bold text-yellow-300">
                  ${pot.amount.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {pot.eligiblePlayerIds.length}p
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warning if more than 4 side pots (overflow) */}
      {sidePots.length > 4 && (
        <div className="text-xs text-gray-500">
          +{sidePots.length - 4} weitere
        </div>
      )}
    </div>
  );
}
