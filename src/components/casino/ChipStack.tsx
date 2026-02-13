'use client';

import { cn } from '@/lib/utils';

interface ChipStackProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const CHIP_DENOMINATIONS = [
  { value: 1000, color: 'bg-gradient-to-br from-yellow-400 to-yellow-600', label: '1K', border: 'border-yellow-700' },
  { value: 500, color: 'bg-gradient-to-br from-purple-500 to-purple-700', label: '500', border: 'border-purple-800' },
  { value: 100, color: 'bg-gradient-to-br from-gray-800 to-gray-900', label: '100', border: 'border-gray-950' },
  { value: 25, color: 'bg-gradient-to-br from-green-500 to-green-700', label: '25', border: 'border-green-800' },
  { value: 5, color: 'bg-gradient-to-br from-red-500 to-red-700', label: '5', border: 'border-red-800' },
  { value: 1, color: 'bg-gradient-to-br from-gray-100 to-gray-300', label: '1', border: 'border-gray-400' },
];

const SIZE_CLASSES = {
  sm: { chip: 'w-8 h-8 text-[8px]', spacing: 1 },
  md: { chip: 'w-12 h-12 text-xs', spacing: 2 },
  lg: { chip: 'w-16 h-16 text-sm', spacing: 3 },
};

function breakIntoChips(amount: number): { denomination: number; count: number; color: string; label: string; border: string }[] {
  const chips: { denomination: number; count: number; color: string; label: string; border: string }[] = [];
  let remaining = amount;

  for (const denom of CHIP_DENOMINATIONS) {
    const count = Math.floor(remaining / denom.value);
    if (count > 0) {
      chips.push({
        denomination: denom.value,
        count,
        color: denom.color,
        label: denom.label,
        border: denom.border,
      });
      remaining -= count * denom.value;
    }
  }

  return chips;
}

export function ChipStack({ amount, size = 'md', showLabel = true, className }: ChipStackProps) {
  const chipBreakdown = breakIntoChips(amount);
  const { chip: chipClass, spacing } = SIZE_CLASSES[size];

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative flex items-end gap-1">
        {chipBreakdown.map((chip, stackIndex) => (
          <div key={stackIndex} className="relative flex flex-col-reverse">
            {Array.from({ length: Math.min(chip.count, 5) }).map((_, chipIndex) => (
              <div
                key={chipIndex}
                className={cn(
                  'rounded-full border-4 flex items-center justify-center font-bold shadow-lg',
                  chip.color,
                  chip.border,
                  chipClass,
                  chip.label === '1' ? 'text-gray-700' : 'text-white'
                )}
                style={{
                  marginTop: chipIndex > 0 ? `-${spacing * 4}px` : 0,
                }}
              >
                {chip.label}
              </div>
            ))}
            {chip.count > 5 && (
              <div className="absolute -top-3 -right-2 bg-gray-900 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold border border-gray-700">
                {chip.count}
              </div>
            )}
          </div>
        ))}
      </div>

      {showLabel && (
        <div className="text-sm font-semibold text-gray-200 bg-gray-900/50 px-3 py-1 rounded-full">
          ${amount.toLocaleString()}
        </div>
      )}
    </div>
  );
}
