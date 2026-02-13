'use client';

import { ChipStack } from '@/components/casino/ChipStack';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface PotDisplayProps {
  mainPot: number;
  sidePots?: { amount: number; eligibleCount: number }[];
  className?: string;
}

export function PotDisplay({ mainPot, sidePots = [], className }: PotDisplayProps) {
  const [animatedAmount, setAnimatedAmount] = useState(mainPot);

  useEffect(() => {
    // Smooth transition for pot amount changes
    setAnimatedAmount(mainPot);
  }, [mainPot]);

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* Main Pot */}
      <div className="flex flex-col items-center">
        <ChipStack amount={animatedAmount} size="lg" showLabel={true} />
        <p className="text-sm font-semibold text-white mt-1">Haupttopf</p>
      </div>

      {/* Side Pots */}
      {sidePots.length > 0 && (
        <div className="flex gap-3">
          {sidePots.map((sidePot, index) => (
            <div key={index} className="flex flex-col items-center">
              <ChipStack amount={sidePot.amount} size="md" showLabel={true} />
              <p className="text-xs text-gray-300 mt-1">
                Nebentopf ({sidePot.eligibleCount})
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
