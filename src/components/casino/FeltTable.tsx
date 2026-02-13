'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FeltTableProps {
  children: ReactNode;
  className?: string;
  variant?: 'green' | 'blue' | 'red';
}

const VARIANT_CLASSES = {
  green: 'from-green-800 to-green-900',
  blue: 'from-blue-800 to-blue-900',
  red: 'from-red-800 to-red-900',
};

export function FeltTable({ children, className, variant = 'green' }: FeltTableProps) {
  return (
    <div className={cn('rounded-[2rem] border-[12px] border-amber-900 shadow-2xl', className)}>
      <div
        className={cn(
          'relative rounded-[1.5rem] bg-gradient-to-br border-2 border-yellow-600/30 p-8',
          VARIANT_CLASSES[variant]
        )}
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.03) 2px,
              rgba(0,0,0,0.03) 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.03) 2px,
              rgba(0,0,0,0.03) 4px
            )
          `,
        }}
      >
        {children}
      </div>
    </div>
  );
}
