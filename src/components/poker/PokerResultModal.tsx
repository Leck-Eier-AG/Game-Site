'use client';

import { useEffect, useState } from 'react';
import { PokerHandStrength } from './PokerHandStrength';
import type { Card } from '@/lib/game/cards/types';
import { cn } from '@/lib/utils';

export interface PokerResultPlayer {
  userId: string;
  displayName: string;
  holeCards: Card[];
  handName: string;
  bestHandCards: Card[];
  isWinner: boolean;
  winAmount?: number;
}

interface PokerResultModalProps {
  isOpen: boolean;
  winners: PokerResultPlayer[];
  otherPlayers: PokerResultPlayer[];
  communityCards: Card[];
  totalPot: number;
  onClose: () => void;
  autoCloseDelay?: number; // Auto-close after N milliseconds (default: 5000)
}

export function PokerResultModal({
  isOpen,
  winners,
  otherPlayers,
  communityCards,
  totalPot,
  onClose,
  autoCloseDelay = 5000
}: PokerResultModalProps) {
  const [countdown, setCountdown] = useState(Math.ceil(autoCloseDelay / 1000));

  useEffect(() => {
    if (!isOpen) {
      setCountdown(Math.ceil(autoCloseDelay / 1000));
      return;
    }

    // Auto-close timer
    const closeTimer = setTimeout(() => {
      onClose();
    }, autoCloseDelay);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearTimeout(closeTimer);
      clearInterval(countdownInterval);
    };
  }, [isOpen, autoCloseDelay, onClose]);

  if (!isOpen) {
    return null;
  }

  const isSplit = winners.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="relative max-w-6xl w-full max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl p-8 shadow-2xl border-2 border-yellow-500/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold transition-colors"
        >
          ✕
        </button>

        {/* Winner announcement */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce">
            {isSplit ? '🤝' : '🏆'}
          </div>
          <h2 className="text-4xl font-bold text-yellow-500 mb-2">
            {isSplit ? 'Split Pot!' : 'Gewinner!'}
          </h2>
          <div className="text-2xl text-gray-300">
            {isSplit ? (
              <>
                {winners.map((w) => w.displayName).join(' & ')}
                {' teilen '}
                <span className="text-yellow-400 font-bold">
                  ${totalPot.toLocaleString()}
                </span>
              </>
            ) : (
              <>
                {winners[0].displayName}
                {' gewinnt '}
                <span className="text-yellow-400 font-bold">
                  ${totalPot.toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Winner hands */}
        <div className={cn(
          'grid gap-4 mb-6',
          isSplit ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
        )}>
          {winners.map((winner) => (
            <PokerHandStrength
              key={winner.userId}
              holeCards={winner.holeCards}
              communityCards={communityCards}
              playerName={winner.displayName}
              handName={winner.handName}
              bestHandCards={winner.bestHandCards}
              isWinner={true}
            />
          ))}
        </div>

        {/* Other players' hands */}
        {otherPlayers.length > 0 && (
          <>
            <div className="border-t border-gray-700 pt-6 mb-4">
              <h3 className="text-lg font-semibold text-gray-400 mb-4">
                Andere Spieler
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherPlayers.map((player) => (
                <PokerHandStrength
                  key={player.userId}
                  holeCards={player.holeCards}
                  communityCards={communityCards}
                  playerName={player.displayName}
                  handName={player.handName}
                  bestHandCards={player.bestHandCards}
                  isWinner={false}
                />
              ))}
            </div>
          </>
        )}

        {/* Auto-close countdown */}
        <div className="mt-8 text-center">
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold text-lg transition-colors"
          >
            Weiter
          </button>
          <div className="mt-2 text-sm text-gray-500">
            Schließt automatisch in {countdown}s
          </div>
        </div>
      </div>
    </div>
  );
}
