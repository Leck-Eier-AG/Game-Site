'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getNumberColor } from '@/lib/game/roulette/wheel';
import { getBetNumbers, type RouletteBetType } from '@/lib/game/roulette/bet-validator';
import type { RouletteBet } from '@/lib/game/roulette/state-machine';

interface BettingGridProps {
  onPlaceBet: (betType: RouletteBetType, numbers: number[], amount: number) => void;
  onRemoveBet: (index: number) => void;
  playerBets: RouletteBet[];
  allPlayerBets?: Map<string, RouletteBet[]>;
  disabled: boolean;
  chipValue: number;
  className?: string;
}

const CHIP_VALUES = [1, 5, 25, 100, 500];

export function BettingGrid({
  onPlaceBet,
  onRemoveBet,
  playerBets,
  allPlayerBets,
  disabled,
  chipValue: initialChipValue,
  className,
}: BettingGridProps) {
  const [selectedChipValue, setSelectedChipValue] = useState(initialChipValue || 5);

  // Build grid layout (3 columns × 12 rows)
  const grid: number[][] = [];
  for (let row = 0; row < 12; row++) {
    const rowNumbers = [
      row * 3 + 1, // Column 1
      row * 3 + 2, // Column 2
      row * 3 + 3, // Column 3
    ];
    grid.push(rowNumbers);
  }

  const handleStraightBet = (num: number) => {
    if (disabled) return;
    onPlaceBet('straight', [num], selectedChipValue);
  };

  const handleOutsideBet = (betType: RouletteBetType) => {
    if (disabled) return;
    onPlaceBet(betType, [], selectedChipValue);
  };

  const handleDozenBet = (dozen: 1 | 2 | 3) => {
    if (disabled) return;
    const identifier = dozen === 1 ? '1st' : dozen === 2 ? '2nd' : '3rd';
    const numbers = getBetNumbers('dozen', identifier);
    onPlaceBet('dozen', numbers, selectedChipValue);
  };

  const handleColumnBet = (column: 1 | 2 | 3) => {
    if (disabled) return;
    const identifier = column === 1 ? '1st' : column === 2 ? '2nd' : '3rd';
    const numbers = getBetNumbers('column', identifier);
    onPlaceBet('column', numbers, selectedChipValue);
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Chip selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-gray-300">Chip-Wert:</span>
        {CHIP_VALUES.map((value) => (
          <button
            key={value}
            onClick={() => setSelectedChipValue(value)}
            disabled={disabled}
            className={cn(
              'w-12 h-12 rounded-full border-4 flex items-center justify-center text-xs font-bold shadow-lg transition-all',
              selectedChipValue === value
                ? 'ring-4 ring-yellow-400 scale-110'
                : 'opacity-70 hover:opacity-100',
              disabled && 'opacity-30 cursor-not-allowed',
              value === 1 && 'bg-gray-100 text-gray-700 border-gray-400',
              value === 5 && 'bg-red-500 text-white border-red-800',
              value === 25 && 'bg-green-500 text-white border-green-800',
              value === 100 && 'bg-gray-900 text-white border-gray-950',
              value === 500 && 'bg-purple-600 text-white border-purple-800'
            )}
          >
            {value}
          </button>
        ))}
      </div>

      {/* Main betting grid */}
      <div className="grid grid-cols-[auto_1fr_auto] gap-2 bg-green-900/30 p-4 rounded-lg border border-yellow-600/30">
        {/* Zero */}
        <div className="col-span-1 row-span-12 flex items-center justify-center">
          <button
            onClick={() => handleStraightBet(0)}
            disabled={disabled}
            className={cn(
              'w-12 h-full bg-green-600 hover:bg-green-500 border-2 border-green-400 text-white font-bold text-lg rounded-md shadow-md transition-all',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            0
          </button>
        </div>

        {/* Number grid */}
        <div className="grid grid-cols-3 gap-1">
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} className="contents">
              {row.map((num) => {
                const color = getNumberColor(num);
                const bgColor =
                  color === 'red'
                    ? 'bg-red-600 hover:bg-red-500 border-red-400'
                    : 'bg-gray-900 hover:bg-gray-800 border-gray-600';

                return (
                  <button
                    key={num}
                    onClick={() => handleStraightBet(num)}
                    disabled={disabled}
                    className={cn(
                      'w-14 h-14 border-2 text-white font-bold text-lg rounded shadow-md transition-all relative',
                      bgColor,
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {num}
                    {/* Show player bets */}
                    {playerBets
                      .filter((bet) => bet.type === 'straight' && bet.numbers.includes(num))
                      .map((bet, index) => (
                        <div
                          key={index}
                          className="absolute top-0 right-0 w-3 h-3 bg-yellow-400 rounded-full border border-yellow-600"
                        />
                      ))}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Column bets */}
        <div className="col-span-1 row-span-12 flex flex-col gap-1">
          {[1, 2, 3].map((col) => (
            <button
              key={col}
              onClick={() => handleColumnBet(col as 1 | 2 | 3)}
              disabled={disabled}
              className={cn(
                'flex-1 px-2 bg-yellow-700 hover:bg-yellow-600 border-2 border-yellow-500 text-white font-semibold text-xs rounded shadow-md transition-all',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              2:1
            </button>
          ))}
        </div>

        {/* Dozen bets */}
        <div className="col-span-3 grid grid-cols-3 gap-1 mt-1">
          {[1, 2, 3].map((dozen) => (
            <button
              key={dozen}
              onClick={() => handleDozenBet(dozen as 1 | 2 | 3)}
              disabled={disabled}
              className={cn(
                'py-2 bg-yellow-700 hover:bg-yellow-600 border-2 border-yellow-500 text-white font-semibold text-sm rounded shadow-md transition-all',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {dozen === 1 ? '1st 12' : dozen === 2 ? '2nd 12' : '3rd 12'}
            </button>
          ))}
        </div>

        {/* Outside bets */}
        <div className="col-span-3 grid grid-cols-6 gap-1 mt-1">
          <button
            onClick={() => handleOutsideBet('low')}
            disabled={disabled}
            className={cn(
              'py-3 bg-yellow-700 hover:bg-yellow-600 border-2 border-yellow-500 text-white font-semibold text-sm rounded shadow-md transition-all',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            1-18
          </button>
          <button
            onClick={() => handleOutsideBet('even')}
            disabled={disabled}
            className={cn(
              'py-3 bg-yellow-700 hover:bg-yellow-600 border-2 border-yellow-500 text-white font-semibold text-sm rounded shadow-md transition-all',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            Gerade
          </button>
          <button
            onClick={() => handleOutsideBet('red')}
            disabled={disabled}
            className={cn(
              'py-3 bg-red-600 hover:bg-red-500 border-2 border-red-400 text-white font-semibold text-sm rounded shadow-md transition-all',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            Rot
          </button>
          <button
            onClick={() => handleOutsideBet('black')}
            disabled={disabled}
            className={cn(
              'py-3 bg-gray-900 hover:bg-gray-800 border-2 border-gray-600 text-white font-semibold text-sm rounded shadow-md transition-all',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            Schwarz
          </button>
          <button
            onClick={() => handleOutsideBet('odd')}
            disabled={disabled}
            className={cn(
              'py-3 bg-yellow-700 hover:bg-yellow-600 border-2 border-yellow-500 text-white font-semibold text-sm rounded shadow-md transition-all',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            Ungerade
          </button>
          <button
            onClick={() => handleOutsideBet('high')}
            disabled={disabled}
            className={cn(
              'py-3 bg-yellow-700 hover:bg-yellow-600 border-2 border-yellow-500 text-white font-semibold text-sm rounded shadow-md transition-all',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            19-36
          </button>
        </div>
      </div>

      {/* Placed bets summary */}
      {playerBets.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-300">Deine Wetten ({playerBets.length})</span>
            <span className="text-sm font-bold text-yellow-400">
              Total: {playerBets.reduce((sum, bet) => sum + bet.amount, 0)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {playerBets.map((bet, index) => (
              <button
                key={index}
                onClick={() => onRemoveBet(index)}
                disabled={disabled}
                className={cn(
                  'px-3 py-1.5 bg-gray-800 hover:bg-red-600 border border-gray-600 hover:border-red-400 rounded text-xs text-white transition-all',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {bet.type} ({bet.amount}) ✕
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
