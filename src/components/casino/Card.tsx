'use client';

import { type Rank, type Suit, SUIT_SYMBOLS, SUIT_COLORS } from '@/lib/game/cards/types';
import { cn } from '@/lib/utils';

interface CardProps {
  rank: Rank;
  suit: Suit;
  faceDown?: boolean;
  isDealing?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'w-[60px] h-[84px]',
  md: 'w-[80px] h-[112px]',
  lg: 'w-[100px] h-[140px]',
};

export function Card({ rank, suit, faceDown = false, isDealing = false, className, size = 'md' }: CardProps) {
  const color = SUIT_COLORS[suit];
  const symbol = SUIT_SYMBOLS[suit];
  const textColor = color === 'red' ? 'text-red-600' : 'text-gray-900';

  return (
    <div
      className={cn(
        'relative transition-transform duration-500 preserve-3d',
        SIZE_CLASSES[size],
        faceDown && 'rotate-y-180',
        isDealing && 'animate-card-deal',
        className
      )}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Card Back */}
      <div
        className="absolute inset-0 backface-hidden rotate-y-180 rounded-lg overflow-hidden"
        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
      >
        <svg viewBox="0 0 60 84" className="w-full h-full">
          <rect width="60" height="84" fill="#1e3a8a" rx="4" />
          <pattern id="card-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="#dc2626" />
            <rect x="10" y="10" width="10" height="10" fill="#dc2626" />
          </pattern>
          <rect x="4" y="4" width="52" height="76" fill="url(#card-pattern)" rx="3" />
          <rect x="4" y="4" width="52" height="76" fill="none" stroke="#fbbf24" strokeWidth="1" rx="3" />
        </svg>
      </div>

      {/* Card Face */}
      <div
        className="absolute inset-0 backface-hidden bg-white rounded-lg shadow-md border border-gray-200 flex flex-col p-1"
        style={{ backfaceVisibility: 'hidden' }}
      >
        {/* Top left corner */}
        <div className={cn('text-left font-bold leading-none', textColor, size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base')}>
          <div>{rank}</div>
          <div>{symbol}</div>
        </div>

        {/* Center suit symbol */}
        <div className={cn('flex-1 flex items-center justify-center', textColor, size === 'sm' ? 'text-3xl' : size === 'md' ? 'text-4xl' : 'text-5xl')}>
          {symbol}
        </div>

        {/* Bottom right corner (rotated) */}
        <div className={cn('text-right font-bold leading-none rotate-180', textColor, size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base')}>
          <div>{rank}</div>
          <div>{symbol}</div>
        </div>
      </div>
    </div>
  );
}
