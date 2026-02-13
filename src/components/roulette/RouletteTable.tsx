'use client';

import { useState } from 'react';
import { FeltTable } from '@/components/casino/FeltTable';
import { RouletteWheel } from './RouletteWheel';
import { BettingGrid } from './BettingGrid';
import { ResultHistory } from './ResultHistory';
import { Button } from '@/components/ui/button';
import type { RouletteGameState, RouletteBet } from '@/lib/game/roulette/state-machine';
import type { RouletteBetType } from '@/lib/game/roulette/bet-validator';
import type { Socket } from 'socket.io-client';
import { cn } from '@/lib/utils';

interface RouletteTableProps {
  gameState: RouletteGameState;
  roomId: string;
  currentUserId: string;
  socket: Socket;
  isBetRoom?: boolean;
  isHost: boolean;
}

export function RouletteTable({
  gameState,
  roomId,
  currentUserId,
  socket,
  isBetRoom = false,
  isHost,
}: RouletteTableProps) {
  const [isSpinning, setIsSpinning] = useState(false);

  const currentPlayer = gameState.players.find((p) => p.userId === currentUserId);
  const playerBets = currentPlayer?.bets || [];

  const handlePlaceBet = (betType: RouletteBetType, numbers: number[], amount: number) => {
    socket.emit('roulette:place-bet', { roomId, betType, numbers, amount }, (response: any) => {
      if (!response?.success) {
        console.error('Failed to place bet:', response?.error);
      }
    });
  };

  const handleRemoveBet = (betIndex: number) => {
    socket.emit('roulette:remove-bet', { roomId, betIndex }, (response: any) => {
      if (!response?.success) {
        console.error('Failed to remove bet:', response?.error);
      }
    });
  };

  const handleSpin = () => {
    if (!isHost) return;
    setIsSpinning(true);
    socket.emit('roulette:spin', { roomId }, (response: any) => {
      if (!response?.success) {
        console.error('Failed to spin:', response?.error);
        setIsSpinning(false);
      }
    });
  };

  const handleNextRound = () => {
    socket.emit('roulette:next-round', { roomId }, (response: any) => {
      if (!response?.success) {
        console.error('Failed to start next round:', response?.error);
      }
    });
  };

  const handleSpinComplete = () => {
    setIsSpinning(false);
  };

  // Phase display text
  const getPhaseText = () => {
    switch (gameState.phase) {
      case 'betting':
        return 'Einsätze platzieren';
      case 'spinning':
        return 'Kugel rollt...';
      case 'settlement':
        return 'Ergebnis';
      default:
        return '';
    }
  };

  // Countdown timer (if not manual spin)
  const showTimer = !gameState.isManualSpin && gameState.phase === 'betting';

  return (
    <FeltTable variant="red" className="w-full max-w-7xl mx-auto">
      <div className="space-y-6">
        {/* Header with phase and controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-yellow-400">Roulette</h2>
            <div
              className={cn(
                'px-4 py-2 rounded-full font-semibold text-sm',
                gameState.phase === 'betting' && 'bg-green-600 text-white',
                gameState.phase === 'spinning' && 'bg-yellow-600 text-white animate-pulse',
                gameState.phase === 'settlement' && 'bg-blue-600 text-white'
              )}
            >
              {getPhaseText()}
            </div>
            {showTimer && (
              <div className="px-4 py-2 rounded-full bg-gray-800 text-white font-mono text-sm">
                {gameState.spinTimerSec}s
              </div>
            )}
          </div>

          {/* Spin button (host only) */}
          {isHost && gameState.phase === 'betting' && (
            <Button
              onClick={handleSpin}
              disabled={isSpinning}
              className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold"
            >
              Drehen
            </Button>
          )}

          {/* Next round button */}
          {gameState.phase === 'settlement' && (
            <Button
              onClick={handleNextRound}
              className="bg-green-600 hover:bg-green-500 text-white font-bold"
            >
              Nächste Runde
            </Button>
          )}
        </div>

        {/* Main layout: Wheel + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
          {/* Left: Wheel */}
          <div className="flex flex-col gap-4">
            <div className="aspect-square max-w-[400px] mx-auto w-full">
              <RouletteWheel
                winningNumber={gameState.winningNumber ?? undefined}
                isSpinning={isSpinning}
                onSpinComplete={handleSpinComplete}
              />
            </div>

            {/* Player totals */}
            <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-3 space-y-2">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Spieler Einsätze</h3>
              {gameState.players.map((player) => (
                <div key={player.userId} className="flex items-center justify-between text-sm">
                  <span
                    className={cn(
                      'font-medium',
                      player.userId === currentUserId ? 'text-yellow-400' : 'text-gray-300'
                    )}
                  >
                    {player.displayName}
                  </span>
                  <span className="font-bold text-white">{player.totalBetAmount}</span>
                </div>
              ))}
            </div>

            {/* Result history */}
            {gameState.resultHistory.length > 0 && (
              <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-3">
                <ResultHistory results={gameState.resultHistory} maxDisplay={10} />
              </div>
            )}
          </div>

          {/* Right: Betting Grid */}
          <div>
            <BettingGrid
              onPlaceBet={handlePlaceBet}
              onRemoveBet={handleRemoveBet}
              playerBets={playerBets}
              disabled={gameState.phase !== 'betting' || isSpinning}
              chipValue={isBetRoom ? 5 : 1}
            />
          </div>
        </div>

        {/* Settlement overlay */}
        {gameState.phase === 'settlement' && gameState.winningNumber !== null && (
          <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 border-2 border-yellow-500 rounded-xl p-6 text-center">
            <h3 className="text-3xl font-bold text-yellow-400 mb-4">Gewinnzahl</h3>
            <div className="text-6xl font-bold text-white mb-4">{gameState.winningNumber}</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {gameState.players.map((player) => {
                const totalBet = player.totalBetAmount;
                // Calculate payout (would need to import calculatePlayerPayout)
                const payout = 0; // Placeholder
                const netResult = payout - totalBet;

                return (
                  <div
                    key={player.userId}
                    className={cn(
                      'p-4 rounded-lg border-2',
                      netResult > 0
                        ? 'bg-green-600/20 border-green-500'
                        : netResult < 0
                        ? 'bg-red-600/20 border-red-500'
                        : 'bg-gray-600/20 border-gray-500'
                    )}
                  >
                    <div className="font-semibold text-white">{player.displayName}</div>
                    <div className="text-2xl font-bold text-yellow-400 mt-2">
                      {netResult > 0 ? '+' : ''}
                      {netResult}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </FeltTable>
  );
}
