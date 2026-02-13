'use client';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface BettingControlsProps {
  availableActions: string[];
  currentBet: number;
  playerBet: number;
  playerChips: number;
  minRaise: number;
  pot: number;
  onAction: (action: string, amount?: number) => void;
  disabled: boolean;
  timeLeft?: number;
}

export function BettingControls({
  availableActions,
  currentBet,
  playerBet,
  playerChips,
  minRaise,
  pot,
  onAction,
  disabled,
  timeLeft,
}: BettingControlsProps) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const callAmount = currentBet - playerBet;
  const maxRaise = playerChips + playerBet;

  // Quick bet buttons
  const quickBets = [
    { label: 'Min', value: minRaise },
    { label: '1/2 Pot', value: Math.floor(pot / 2) + currentBet },
    { label: '3/4 Pot', value: Math.floor((pot * 3) / 4) + currentBet },
    { label: 'Pot', value: pot + currentBet },
  ].filter(bet => bet.value >= minRaise && bet.value <= maxRaise);

  const handleRaise = () => {
    onAction('raise', raiseAmount);
  };

  return (
    <div className="bg-gray-900/95 border-2 border-yellow-600/50 rounded-xl p-4 shadow-2xl">
      {/* Timer Bar */}
      {timeLeft !== undefined && timeLeft > 0 && (
        <div className="mb-3 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-1000 ease-linear',
              timeLeft > 10 ? 'bg-green-500' : timeLeft > 5 ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: `${(timeLeft / 30) * 100}%` }}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 items-center justify-center mb-3">
        {availableActions.includes('fold') && (
          <Button
            onClick={() => onAction('fold')}
            disabled={disabled}
            variant="destructive"
            size="lg"
            className="min-w-[100px]"
          >
            Passen
          </Button>
        )}

        {availableActions.includes('check') && (
          <Button
            onClick={() => onAction('check')}
            disabled={disabled}
            variant="outline"
            size="lg"
            className="min-w-[100px] border-green-600 text-green-600 hover:bg-green-600/10"
          >
            Schieben
          </Button>
        )}

        {availableActions.includes('call') && (
          <Button
            onClick={() => onAction('call')}
            disabled={disabled}
            size="lg"
            className="min-w-[120px] bg-blue-600 hover:bg-blue-700"
          >
            Mitgehen (${callAmount})
          </Button>
        )}

        {availableActions.includes('raise') && (
          <Button
            onClick={handleRaise}
            disabled={disabled || raiseAmount < minRaise || raiseAmount > maxRaise}
            size="lg"
            className="min-w-[100px] bg-orange-600 hover:bg-orange-700"
          >
            Erhöhen
          </Button>
        )}

        {availableActions.includes('all_in') && (
          <Button
            onClick={() => onAction('all_in')}
            disabled={disabled}
            size="lg"
            className="min-w-[100px] bg-red-600 hover:bg-red-700"
          >
            All-In (${playerChips})
          </Button>
        )}
      </div>

      {/* Raise Controls */}
      {availableActions.includes('raise') && (
        <div className="space-y-3 bg-gray-800/50 p-3 rounded-lg">
          <div className="flex items-center justify-between text-sm text-gray-300">
            <span>Erhöhen auf:</span>
            <span className="text-xl font-bold text-yellow-400">${raiseAmount}</span>
          </div>

          {/* Slider */}
          <Slider
            value={[raiseAmount]}
            onValueChange={(value) => setRaiseAmount(value[0])}
            min={minRaise}
            max={maxRaise}
            step={Math.max(1, Math.floor((maxRaise - minRaise) / 100))}
            className="w-full"
            disabled={disabled}
          />

          {/* Quick Bet Buttons */}
          <div className="flex gap-2 flex-wrap justify-center">
            {quickBets.map((bet) => (
              <Button
                key={bet.label}
                onClick={() => setRaiseAmount(bet.value)}
                disabled={disabled}
                variant="outline"
                size="sm"
                className="text-xs border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/10"
              >
                {bet.label}
              </Button>
            ))}
          </div>

          <div className="flex justify-between text-xs text-gray-400">
            <span>Min: ${minRaise}</span>
            <span>Max: ${maxRaise}</span>
          </div>
        </div>
      )}
    </div>
  );
}
