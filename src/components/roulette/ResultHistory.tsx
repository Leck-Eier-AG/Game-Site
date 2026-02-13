'use client';

import { cn } from '@/lib/utils';
import { getNumberColor } from '@/lib/game/roulette/wheel';

interface ResultHistoryProps {
  results: number[];
  maxDisplay?: number;
  className?: string;
}

export function ResultHistory({ results, maxDisplay = 20, className }: ResultHistoryProps) {
  const displayResults = results.slice(0, maxDisplay);

  // Calculate hot/cold numbers
  const numberCounts = new Map<number, number>();
  results.forEach((num) => {
    numberCounts.set(num, (numberCounts.get(num) || 0) + 1);
  });

  const avgCount = results.length / 37;
  const hotThreshold = avgCount * 1.5;
  const coldThreshold = avgCount * 0.5;

  // Calculate statistics
  const redCount = results.filter((n) => getNumberColor(n) === 'red').length;
  const blackCount = results.filter((n) => getNumberColor(n) === 'black').length;
  const oddCount = results.filter((n) => n !== 0 && n % 2 === 1).length;
  const evenCount = results.filter((n) => n !== 0 && n % 2 === 0).length;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Result chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <span className="text-sm font-semibold text-gray-300 whitespace-nowrap">Letzte {maxDisplay}:</span>
        <div className="flex gap-1.5">
          {displayResults.map((num, index) => {
            const color = getNumberColor(num);
            const count = numberCounts.get(num) || 0;
            const isHot = count > hotThreshold;
            const isCold = count < coldThreshold && results.length > 10;

            const bgColor =
              color === 'green'
                ? 'bg-green-600'
                : color === 'red'
                ? 'bg-red-600'
                : 'bg-gray-900';

            return (
              <div
                key={index}
                className={cn(
                  'relative w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 shadow-md',
                  bgColor,
                  color === 'green'
                    ? 'border-green-400'
                    : color === 'red'
                    ? 'border-red-400'
                    : 'border-gray-600',
                  isHot && 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-gray-900',
                  isCold && 'opacity-50 ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-900'
                )}
              >
                {num}
                {isHot && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-yellow-600 animate-pulse" />
                )}
                {isCold && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full border border-blue-600" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Statistics */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="bg-red-600/20 border border-red-600/50 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-red-300 font-medium">Rot:</span>
            <span className="text-white font-bold">{redCount}</span>
          </div>
          <div className="bg-gray-900/50 border border-gray-600 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-gray-300 font-medium">Schwarz:</span>
            <span className="text-white font-bold">{blackCount}</span>
          </div>
          <div className="bg-purple-600/20 border border-purple-600/50 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-purple-300 font-medium">Ungerade:</span>
            <span className="text-white font-bold">{oddCount}</span>
          </div>
          <div className="bg-blue-600/20 border border-blue-600/50 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-blue-300 font-medium">Gerade:</span>
            <span className="text-white font-bold">{evenCount}</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
          <span>Heiß</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-400 rounded-full" />
          <span>Kalt</span>
        </div>
      </div>
    </div>
  );
}
