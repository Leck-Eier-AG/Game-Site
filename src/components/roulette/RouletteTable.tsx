'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RouletteWheel } from './RouletteWheel';
import { BettingGrid } from './BettingGrid';
import { ResultHistory } from './ResultHistory';
import { Button } from '@/components/ui/button';
import { calculatePlayerPayout } from '@/lib/game/roulette/state-machine';
import type { RouletteGameState, RouletteBet } from '@/lib/game/roulette/state-machine';
import type { RouletteBetType } from '@/lib/game/roulette/bet-validator';
import { getNumberColor } from '@/lib/game/roulette/wheel';
import type { Socket } from 'socket.io-client';
import { useSocket } from '@/lib/socket/provider';
import { GameBalance } from '@/components/wallet/game-balance';
import { TransferDialog } from '@/components/wallet/transfer-dialog';
import { LogOut, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  const router = useRouter();
  const { balance: realBalance } = useSocket();
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [displayBalance, setDisplayBalance] = useState<number | null>(null);
  const prevWinningNumberRef = useRef<number | null>(null);
  const autoNextRoundRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWinBalanceRef = useRef<number | null>(null);

  const currentPlayer = gameState.players.find((p) => p.userId === currentUserId);
  const playerBets = currentPlayer?.bets || [];

  // Initialize display balance from real balance
  useEffect(() => {
    if (displayBalance === null && realBalance !== null) {
      setDisplayBalance(realBalance);
    }
  }, [realBalance, displayBalance]);

  // Track balance locally to delay win updates until after wheel animation
  useEffect(() => {
    const handleBalanceUpdate = (data: {newBalance?: number; balance?: number; change?: number; description?: string}) => {
      const newBal = data.newBalance ?? data.balance;
      if (newBal == null) return;

      // ALWAYS queue roulette win updates - show them only after wheel stops
      if (data.description?.includes('Roulette Gewinn')) {
        pendingWinBalanceRef.current = newBal;
        // Don't update displayBalance yet - wait for spin animation to complete
        return;
      }

      // For bet placements and other updates, show immediately
      setDisplayBalance(newBal);
    };

    socket.on('balance:updated', handleBalanceUpdate);

    return () => {
      socket.off('balance:updated', handleBalanceUpdate);
    };
  }, [socket]);

  // Trigger spin animation for ALL users when a new winning number arrives
  useEffect(() => {
    if (
      gameState.winningNumber !== null &&
      gameState.winningNumber !== prevWinningNumberRef.current
    ) {
      setIsSpinning(true);
      prevWinningNumberRef.current = gameState.winningNumber;
    }
    if (gameState.phase === 'betting') {
      prevWinningNumberRef.current = null;
    }
  }, [gameState.winningNumber, gameState.phase]);

  // Clear modal and auto-next-round timer when new round starts
  useEffect(() => {
    if (gameState.phase === 'betting') {
      setShowResultModal(false);
      if (autoNextRoundRef.current) {
        clearTimeout(autoNextRoundRef.current);
        autoNextRoundRef.current = null;
      }
    }
  }, [gameState.phase]);

  // Cleanup auto-next-round timer on unmount
  useEffect(() => {
    return () => {
      if (autoNextRoundRef.current) {
        clearTimeout(autoNextRoundRef.current);
      }
    };
  }, []);

  // Calculate payout for modal
  const winningNumber = gameState.winningNumber;
  const payout = currentPlayer && winningNumber !== null
    ? calculatePlayerPayout(currentPlayer, winningNumber)
    : 0;
  const totalBet = currentPlayer?.totalBetAmount || 0;
  const netResult = payout - totalBet;
  const isWin = netResult > 0;
  const isBreakEven = netResult === 0 && payout > 0;
  const numberColor = winningNumber !== null ? getNumberColor(winningNumber) : 'green';

  // Hide the latest result from history while wheel is still spinning
  const visibleHistory = isSpinning && gameState.resultHistory.length > 0
    ? gameState.resultHistory.slice(0, -1)
    : gameState.resultHistory;

  const handlePlaceBet = (betType: RouletteBetType, numbers: number[], amount: number) => {
    socket.emit('roulette:place-bet', { roomId, betType, numbers, amount }, (response: any) => {
      if (!response?.success) {
        toast.error(response?.error || 'Einsatz konnte nicht platziert werden');
      }
    });
  };

  const handleRemoveBet = (betIndex: number) => {
    socket.emit('roulette:remove-bet', { roomId, betIndex }, (response: any) => {
      if (!response?.success) {
        toast.error(response?.error || 'Einsatz konnte nicht entfernt werden');
      }
    });
  };

  const handleSpin = () => {
    if (!isHost) return;
    socket.emit('roulette:spin', { roomId }, (response: any) => {
      if (!response?.success) {
        toast.error(response?.error || 'Drehen fehlgeschlagen');
      }
    });
  };

  const handleNextRound = () => {
    if (autoNextRoundRef.current) {
      clearTimeout(autoNextRoundRef.current);
      autoNextRoundRef.current = null;
    }
    socket.emit('roulette:next-round', { roomId }, (response: any) => {
      if (!response?.success) {
        toast.error(response?.error || 'Nächste Runde konnte nicht gestartet werden');
      }
    });
  };

  const handleSpinComplete = useCallback(() => {
    setIsSpinning(false);
    setShowResultModal(true);

    // Now show the win balance that was queued during the spin
    if (pendingWinBalanceRef.current !== null) {
      setDisplayBalance(pendingWinBalanceRef.current);
      pendingWinBalanceRef.current = null;
    } else {
      // No pending win, just clear override to show real balance
      setDisplayBalance(null);
    }

    // Auto-advance to next round after 5 seconds
    autoNextRoundRef.current = setTimeout(() => {
      socket.emit('roulette:next-round', { roomId }, (response: any) => {
        if (!response?.success) {
          toast.error(response?.error || 'Nächste Runde konnte nicht gestartet werden');
        }
      });
    }, 5000);
  }, [socket, roomId]);

  const handleLeave = () => {
    socket.emit('room:leave', { roomId });
    router.push('/');
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

  // Live countdown timer
  useEffect(() => {
    if (!gameState.isManualSpin && gameState.phase === 'betting' && gameState.spinTimerSec > 0) {
      setCountdown(gameState.spinTimerSec);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
  }, [gameState.phase, gameState.isManualSpin, gameState.spinTimerSec]);

  const showTimer = !gameState.isManualSpin && gameState.phase === 'betting' && countdown !== null;

  // Determine why the player can't bet (if applicable)
  const bettingDisabledReason = (() => {
    if (!currentPlayer) return 'Du bist noch nicht im Spiel';
    if (isSpinning) return 'Kugel rollt — warte auf das Ergebnis';
    if (gameState.phase === 'settlement') return 'Nächste Runde startet gleich...';
    return null;
  })();

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 md:px-6 py-2 md:py-3 shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
          <h2 className="text-lg md:text-2xl font-bold text-yellow-400">Roulette</h2>
          <div
            className={cn(
              'px-3 py-1.5 rounded-full font-semibold text-sm',
              gameState.phase === 'betting' && 'bg-green-600 text-white',
              (gameState.phase === 'spinning' || isSpinning) && 'bg-yellow-600 text-white animate-pulse',
              gameState.phase === 'settlement' && !isSpinning && 'bg-blue-600 text-white'
            )}
          >
            {isSpinning ? 'Kugel rollt...' : getPhaseText()}
          </div>
          {showTimer && (
            <div className={cn(
              'px-3 py-1.5 rounded-full font-mono text-sm font-bold',
              countdown !== null && countdown <= 5
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-gray-800 text-white'
            )}>
              {countdown}s
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {bettingDisabledReason && (
            <div className="px-3 py-1.5 rounded-full bg-amber-600/20 border border-amber-500/30 text-amber-300 text-xs font-medium">
              {bettingDisabledReason}
            </div>
          )}
          <GameBalance overrideBalance={displayBalance} />
          {isHost && gameState.phase === 'betting' && (
            <Button
              onClick={handleSpin}
              disabled={isSpinning}
              className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold"
            >
              Drehen
            </Button>
          )}
          {gameState.phase === 'settlement' && !isSpinning && (
            <Button
              onClick={handleNextRound}
              className="bg-green-600 hover:bg-green-500 text-white font-bold"
            >
              Nächste Runde
            </Button>
          )}
          <Button
            onClick={handleLeave}
            variant="outline"
            size="sm"
            className="border-red-600 text-red-400 hover:bg-red-600/10"
          >
            <LogOut className="w-4 h-4 mr-1" />
            <span className="hidden md:inline">Verlassen</span>
          </Button>
        </div>
      </div>

      {/* Main game area */}
      <div className="flex-1 min-h-0 px-2 md:px-4 pb-2 md:pb-4 flex flex-col gap-2 md:gap-3">
        {/* Top row: Wheel + info + settlement */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 shrink-0">
          {/* Wheel */}
          <div className="w-[200px] h-[200px] md:w-[320px] md:h-[320px] shrink-0">
            <RouletteWheel
              winningNumber={gameState.winningNumber ?? undefined}
              isSpinning={isSpinning}
              onSpinComplete={handleSpinComplete}
            />
          </div>

          {/* Info panel */}
          <div className="flex flex-col gap-2 flex-1 min-w-0 w-full">
            {/* Player totals + history side by side */}
            <div className="flex gap-2 md:gap-3">
              <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-2 flex-1">
                <h3 className="text-xs font-semibold text-gray-300 mb-1">Spieler</h3>
                {gameState.players.map((player) => (
                  <div key={player.userId} className="flex items-center justify-between text-sm gap-2">
                    <span className={cn('font-medium truncate', player.userId === currentUserId ? 'text-yellow-400' : 'text-gray-300')}>
                      {player.displayName}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-bold text-white">{player.totalBetAmount}</span>
                      {player.userId !== currentUserId && (
                        <TransferDialog
                          recipientId={player.userId}
                          recipientName={player.displayName}
                          trigger={
                            <button className="text-gray-400 hover:text-green-400 transition-colors p-0.5">
                              <Send className="w-3 h-3" />
                            </button>
                          }
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {visibleHistory.length > 0 && (
                <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-2 flex-1">
                  <ResultHistory results={visibleHistory} maxDisplay={10} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: Full-width betting table */}
        <div className="flex-1 min-h-0">
          <BettingGrid
            onPlaceBet={handlePlaceBet}
            onRemoveBet={handleRemoveBet}
            playerBets={playerBets}
            disabled={gameState.phase !== 'betting' || isSpinning || !currentPlayer}
            chipValue={isBetRoom ? 5 : 1}
          />
        </div>
      </div>

      {/* ========== Settlement Result Modal ========== */}
      {showResultModal && gameState.phase === 'settlement' && winningNumber !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer animate-in fade-in duration-300"
          onClick={() => setShowResultModal(false)}
        >
          <div className="flex flex-col items-center gap-6 p-8 md:p-12 max-w-md w-[90%] animate-in zoom-in-95 duration-500">
            {/* Winning number */}
            <div className="relative">
              <div
                className={cn(
                  'w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center text-5xl md:text-7xl font-black text-white shadow-2xl border-4',
                  numberColor === 'red' && 'bg-red-600 border-red-400 shadow-red-500/50',
                  numberColor === 'black' && 'bg-gray-900 border-gray-500 shadow-gray-500/50',
                  numberColor === 'green' && 'bg-green-600 border-green-400 shadow-green-500/50'
                )}
              >
                {winningNumber}
              </div>
              {/* Glow ring */}
              <div
                className={cn(
                  'absolute inset-0 rounded-full animate-ping opacity-30',
                  numberColor === 'red' && 'bg-red-500',
                  numberColor === 'black' && 'bg-gray-500',
                  numberColor === 'green' && 'bg-green-500'
                )}
              />
            </div>

            {/* Result text */}
            {totalBet > 0 ? (
              <>
                <div className="text-center">
                  {isWin && (
                    <>
                      <p className="text-2xl md:text-3xl font-black text-green-400 tracking-wide">
                        GEWONNEN!
                      </p>
                      <p className="text-4xl md:text-5xl font-black text-green-300 mt-2">
                        +{netResult}
                      </p>
                    </>
                  )}
                  {isBreakEven && (
                    <>
                      <p className="text-2xl md:text-3xl font-black text-yellow-400 tracking-wide">
                        UNENTSCHIEDEN
                      </p>
                      <p className="text-xl md:text-2xl font-bold text-gray-300 mt-2">
                        Einsatz zurück
                      </p>
                    </>
                  )}
                  {!isWin && !isBreakEven && (
                    <>
                      <p className="text-2xl md:text-3xl font-black text-red-400 tracking-wide">
                        VERLOREN
                      </p>
                      <p className="text-4xl md:text-5xl font-black text-red-300 mt-2">
                        {netResult}
                      </p>
                    </>
                  )}
                </div>

                {/* Bet breakdown */}
                <div className="text-center text-sm text-gray-400">
                  <span>Einsatz: {totalBet}</span>
                  {payout > 0 && <span className="ml-3">Auszahlung: {payout}</span>}
                </div>
              </>
            ) : (
              <p className="text-xl md:text-2xl font-bold text-gray-400">
                Keine Wetten platziert
              </p>
            )}

            {/* Dismiss hint */}
            <p className="text-xs text-gray-500 mt-2 animate-pulse">
              Klicke irgendwo um fortzufahren
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
