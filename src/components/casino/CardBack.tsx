'use client';

import { cn } from '@/lib/utils';

interface CardBackProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'w-[60px] h-[84px]',
  md: 'w-[80px] h-[112px]',
  lg: 'w-[100px] h-[140px]',
};

export function CardBack({ className, size = 'md' }: CardBackProps) {
  return (
    <div className={cn('rounded-lg overflow-hidden shadow-md', SIZE_CLASSES[size], className)}>
      <svg viewBox="0 0 60 84" className="w-full h-full">
        {/* Background */}
        <rect width="60" height="84" fill="#1e3a8a" rx="4" />

        {/* Diamond pattern */}
        <pattern id="card-back-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#dc2626" />
          <rect x="10" y="10" width="10" height="10" fill="#dc2626" />
        </pattern>
        <rect x="4" y="4" width="52" height="76" fill="url(#card-back-pattern)" rx="3" />

        {/* Gold border */}
        <rect x="4" y="4" width="52" height="76" fill="none" stroke="#fbbf24" strokeWidth="1" rx="3" />
      </svg>
    </div>
  );
}
