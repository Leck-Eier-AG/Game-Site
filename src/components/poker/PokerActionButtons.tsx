'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PokerActionButtonsProps {
  availableActions: string[]; // ['fold', 'check', 'call', 'raise', 'all-in']
  currentBet: number;
  playerBet: number;
  playerChips: number;
  minRaise: number;
  pot: number;
  onAction: (action: string, amount?: number) => void;
  timeLeft?: number; // For top timer bar
}

export function PokerActionButtons({
  availableActions,
  currentBet,
  playerBet,
  playerChips,
  minRaise,
  pot,
  onAction,
  timeLeft
}: PokerActionButtonsProps) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);

  const callAmount = currentBet - playerBet;
  const maxRaise = playerBet + playerChips;

  // Calculate quick bet amounts
  const halfPot = Math.min(currentBet + Math.floor(pot / 2), maxRaise);
  const fullPot = Math.min(currentBet + pot, maxRaise);

  // Timer bar color based on time left
  const timerColor = (() => {
    if (timeLeft === undefined) return 'bg-gray-600';
    if (timeLeft <= 5) return 'bg-red-500';
    if (timeLeft <= 10) return 'bg-yellow-500';
    return 'bg-green-500';
  })();

  const timerProgress = timeLeft !== undefined ? (timeLeft / 30) * 100 : 0;

  const handleRaise = () => {
    onAction('raise', raiseAmount);
    setShowRaiseSlider(false);
    setRaiseAmount(minRaise);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Top timer bar */}
      {timeLeft !== undefined && (
        <div className="w-full h-2 bg-gray-800 rounded-full mb-4 overflow-hidden">
          <div
            className={cn('h-full transition-all duration-1000 linear', timerColor)}
            style={{ width: `${timerProgress}%` }}
          />
        </div>
      )}

      {/* Raise slider panel */}
      {showRaiseSlider && availableActions.includes('raise') && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-300">Erhöhen auf:</span>
            <span className="text-xl font-bold text-yellow-400">${raiseAmount.toLocaleString()}</span>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={minRaise}
            max={maxRaise}
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
          />

          {/* Quick bet buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setRaiseAmount(minRaise)}
              className="flex-1 px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold transition-colors"
            >
              Min (${minRaise.toLocaleString()})
            </button>
            <button
              onClick={() => setRaiseAmount(halfPot)}
              className="flex-1 px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold transition-colors"
            >
              1/2 Pot
            </button>
            <button
              onClick={() => setRaiseAmount(fullPot)}
              className="flex-1 px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold transition-colors"
            >
              Pot
            </button>
            <button
              onClick={() => setRaiseAmount(maxRaise)}
              className="flex-1 px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold transition-colors"
            >
              All-In
            </button>
          </div>

          {/* Confirm/Cancel */}
          <div className="flex gap-2">
            <button
              onClick={handleRaise}
              className="flex-1 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold transition-colors"
            >
              Erhöhen
            </button>
            <button
              onClick={() => {
                setShowRaiseSlider(false);
                setRaiseAmount(minRaise);
              }}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Fold button */}
        {availableActions.includes('fold') && (
          <button
            onClick={() => onAction('fold')}
            className={cn(
              'px-6 py-4 rounded-lg font-bold text-lg transition-all duration-200',
              'bg-red-600 hover:bg-red-500 text-white',
              'hover:scale-105 active:scale-95',
              'shadow-lg hover:shadow-xl'
            )}
          >
            Fold
          </button>
        )}

        {/* Check button */}
        {availableActions.includes('check') && (
          <button
            onClick={() => onAction('check')}
            className={cn(
              'px-6 py-4 rounded-lg font-bold text-lg transition-all duration-200',
              'bg-blue-600 hover:bg-blue-500 text-white',
              'hover:scale-105 active:scale-95',
              'shadow-lg hover:shadow-xl'
            )}
          >
            Check
          </button>
        )}

        {/* Call button */}
        {availableActions.includes('call') && (
          <button
            onClick={() => onAction('call')}
            className={cn(
              'px-6 py-4 rounded-lg font-bold text-lg transition-all duration-200',
              'bg-green-600 hover:bg-green-500 text-white',
              'hover:scale-105 active:scale-95',
              'shadow-lg hover:shadow-xl'
            )}
          >
            Call ${callAmount.toLocaleString()}
          </button>
        )}

        {/* Raise button (opens slider) */}
        {availableActions.includes('raise') && !showRaiseSlider && (
          <button
            onClick={() => setShowRaiseSlider(true)}
            className={cn(
              'px-6 py-4 rounded-lg font-bold text-lg transition-all duration-200',
              'bg-orange-600 hover:bg-orange-500 text-white',
              'hover:scale-105 active:scale-95',
              'shadow-lg hover:shadow-xl'
            )}
          >
            Erhöhen
          </button>
        )}

        {/* All-In button */}
        {availableActions.includes('all-in') && (
          <button
            onClick={() => onAction('all-in')}
            className={cn(
              'px-6 py-4 rounded-lg font-bold text-lg transition-all duration-200',
              'bg-red-700 hover:bg-red-600 text-white',
              'hover:scale-105 active:scale-95',
              'shadow-lg hover:shadow-xl',
              'animate-pulse'
            )}
          >
            All-In ${playerChips.toLocaleString()}
          </button>
        )}
      </div>
    </div>
  );
}
