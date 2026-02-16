'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { PokerPlayerSeat } from './PokerPlayerSeat';
import { PokerPot } from './PokerPot';
import { PokerCommunityCards } from './PokerCommunityCards';
import { PokerActionButtons } from './PokerActionButtons';
import { PokerActionHistory, type PokerAction } from './PokerActionHistory';
import { PokerResultModal, type PokerResultPlayer } from './PokerResultModal';
import type { PokerGameState, PokerPlayer, PokerPhase } from '@/lib/game/poker/state-machine';
import { cn } from '@/lib/utils';

interface PokerTableProps {
  gameState: PokerGameState;
  roomId: string;
  currentUserId: string;
  socket: Socket;
  isBetRoom?: boolean;
}

export function PokerTable({ gameState: initialGameState, roomId, currentUserId, socket, isBetRoom = false }: PokerTableProps) {
  const [gameState, setGameState] = useState<PokerGameState>(initialGameState);
  const [actionHistory, setActionHistory] = useState<PokerAction[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | undefined>(undefined);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultData, setResultData] = useState<{
    winners: PokerResultPlayer[];
    otherPlayers: PokerResultPlayer[];
    totalPot: number;
  } | null>(null);

  const pendingWinBalanceRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get current user player
  const currentPlayer = gameState?.players.find(p => p.userId === currentUserId);

  // Calculate available actions
  const availableActions = (() => {
    if (!gameState || !currentPlayer) return [];
    if (gameState.activePlayerIndex !== gameState.players.findIndex(p => p.userId === currentUserId)) {
      return [];
    }
    if (currentPlayer.isFolded || currentPlayer.isAllIn || currentPlayer.isSittingOut) {
      return [];
    }

    const actions: string[] = ['fold'];
    const callAmount = gameState.currentBet - currentPlayer.currentBet;

    if (callAmount === 0) {
      actions.push('check');
    } else if (callAmount < currentPlayer.chips) {
      actions.push('call');
    }

    if (currentPlayer.chips > callAmount) {
      actions.push('raise');
    }

    if (currentPlayer.chips > 0) {
      actions.push('all-in');
    }

    return actions;
  })();

  // Calculate minimum raise
  const minRaise = (() => {
    if (!gameState || !currentPlayer) return 0;
    const callAmount = gameState.currentBet - currentPlayer.currentBet;
    return gameState.currentBet + gameState.lastRaiseAmount;
  })();

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleStateUpdate = (data: { state: PokerGameState; roomId: string }) => {
      if (data.roomId !== roomId) return;

      const prevState = gameState;
      setGameState(data.state);

      // Add action to history if there's a new action
      if (prevState) {
        const activePlayer = data.state.players[data.state.activePlayerIndex];
        const prevActivePlayer = prevState.players[prevState.activePlayerIndex];

        // Detect action changes
        if (prevState.activePlayerIndex !== data.state.activePlayerIndex) {
          // Someone acted, figure out what they did
          const actingPlayer = prevState.players[prevState.activePlayerIndex];

          if (actingPlayer) {
            let action: PokerAction | null = null;

            if (actingPlayer.isFolded && !prevState.players[prevState.activePlayerIndex].isFolded) {
              action = {
                playerId: actingPlayer.userId,
                playerName: actingPlayer.displayName,
                action: 'fold',
                timestamp: Date.now()
              };
            } else if (actingPlayer.currentBet > prevState.players[prevState.activePlayerIndex].currentBet) {
              if (actingPlayer.isAllIn) {
                action = {
                  playerId: actingPlayer.userId,
                  playerName: actingPlayer.displayName,
                  action: 'all-in',
                  amount: actingPlayer.currentBet,
                  timestamp: Date.now()
                };
              } else if (actingPlayer.currentBet > prevState.currentBet) {
                action = {
                  playerId: actingPlayer.userId,
                  playerName: actingPlayer.displayName,
                  action: 'raise',
                  amount: actingPlayer.currentBet,
                  timestamp: Date.now()
                };
              } else {
                action = {
                  playerId: actingPlayer.userId,
                  playerName: actingPlayer.displayName,
                  action: 'call',
                  amount: actingPlayer.currentBet - prevState.players[prevState.activePlayerIndex].currentBet,
                  timestamp: Date.now()
                };
              }
            } else if (prevState.currentBet === 0 || actingPlayer.currentBet === prevState.currentBet) {
              action = {
                playerId: actingPlayer.userId,
                playerName: actingPlayer.displayName,
                action: 'check',
                timestamp: Date.now()
              };
            }

            if (action) {
              setActionHistory(prev => [...prev, action!]);
            }
          }
        }
      }

      // Reset timer for new active player
      if (data.state.activePlayerIndex !== prevState?.activePlayerIndex) {
        setTimeLeft(30); // Reset to 30 seconds
      }
    };

    const handleShowdown = (data: {
      details: Array<{
        userId: string;
        displayName: string;
        holeCards: any[];
        handName: string;
        handRank: number;
        bestCards: any[];
        winAmount: number;
      }>;
      pots: Array<{
        number: number;
        amount: number;
        eligiblePlayerIds: string[];
      }>;
    }) => {
      if (!gameState) return;

      // Separate winners and other players
      const winners: PokerResultPlayer[] = data.details
        .filter(d => d.winAmount > 0)
        .map(d => ({
          userId: d.userId,
          displayName: d.displayName,
          holeCards: d.holeCards,
          handName: d.handName,
          bestHandCards: d.bestCards,
          isWinner: true,
          winAmount: d.winAmount
        }));

      const otherPlayers: PokerResultPlayer[] = data.details
        .filter(d => d.winAmount === 0)
        .map(d => ({
          userId: d.userId,
          displayName: d.displayName,
          holeCards: d.holeCards,
          handName: d.handName,
          bestHandCards: d.bestCards,
          isWinner: false
        }));

      // Calculate total pot from all pots
      const totalPot = data.pots.reduce((sum, pot) => sum + pot.amount, 0);

      setResultData({
        winners,
        otherPlayers,
        totalPot
      });
      setShowResultModal(true);
    };

    socket.on('game:state-update', handleStateUpdate);
    socket.on('poker:showdown', handleShowdown);

    return () => {
      socket.off('game:state-update', handleStateUpdate);
      socket.off('poker:showdown', handleShowdown);
    };
  }, [socket, roomId, gameState, currentUserId]);

  // Timer countdown
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (timeLeft !== undefined && timeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === undefined || prev <= 0) return 0;
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timeLeft]);

  // Handle result modal close
  const handleResultModalClose = useCallback(() => {
    setShowResultModal(false);
    setResultData(null);
  }, []);

  // Handle player actions
  const handleAction = useCallback((action: string, amount?: number) => {
    if (!socket) return;

    const actionMap: Record<string, string> = {
      'fold': 'fold',
      'check': 'check',
      'call': 'call',
      'raise': 'raise',
      'all-in': 'all_in'
    };

    socket.emit('poker:action', {
      roomId,
      action: actionMap[action],
      amount
    });
  }, [socket, roomId]);

  // Rotate players so current user is at position 0 (bottom center)
  const rotatedPlayers = (() => {
    if (!gameState || !currentPlayer) return [];

    const currentIndex = gameState.players.findIndex(p => p.userId === currentUserId);
    if (currentIndex === -1) return gameState.players;

    const rotated = [
      ...gameState.players.slice(currentIndex),
      ...gameState.players.slice(0, currentIndex)
    ];

    return rotated;
  })();

  // 8-seat oval positions (positions 0-7, position 0 is current user at bottom)
  const seatPositions = [
    'bottom-8 left-1/2 -translate-x-1/2', // 0: Current user (bottom center)
    'bottom-24 left-8',                    // 1: Bottom left
    'top-1/2 left-4 -translate-y-1/2',     // 2: Middle left
    'top-24 left-8',                       // 3: Top left
    'top-8 left-1/3',                      // 4: Top left-center
    'top-8 right-1/3',                     // 5: Top right-center
    'top-24 right-8',                      // 6: Top right
    'bottom-24 right-8'                    // 7: Bottom right
  ];

  if (!gameState) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-teal-950 to-gray-900">
        <div className="text-gray-400 text-lg">Warten auf Spiel...</div>
      </div>
    );
  }

  // Debug info
  console.log('Poker Debug:', {
    phase: gameState.phase,
    activePlayerIndex: gameState.activePlayerIndex,
    currentPlayerIndex: gameState.players.findIndex(p => p.userId === currentUserId),
    currentPlayer,
    availableActions,
    isMyTurn: gameState.activePlayerIndex === gameState.players.findIndex(p => p.userId === currentUserId)
  });

  // Phase badge color
  const phaseColor = (() => {
    switch (gameState.phase) {
      case 'waiting':
        return 'bg-gray-600';
      case 'blinds':
      case 'preflop':
        return 'bg-blue-600';
      case 'flop':
      case 'turn':
      case 'river':
        return 'bg-green-600';
      case 'showdown':
        return 'bg-purple-600';
      case 'hand_end':
        return 'bg-yellow-600';
      default:
        return 'bg-gray-600';
    }
  })();

  const showCards = gameState.phase === 'showdown' || gameState.phase === 'hand_end';

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-teal-950 to-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0">
        <div className="flex items-center gap-4">
          <div className={cn('px-4 py-2 rounded-lg text-white font-semibold', phaseColor)}>
            {gameState.phase.toUpperCase()}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-lg bg-gray-800/80 backdrop-blur-sm">
            <span className="text-sm text-gray-400">Blinds: </span>
            <span className="text-sm font-bold text-white">
              ${gameState.blinds.small}/{gameState.blinds.big}
            </span>
          </div>
          <div className="px-4 py-2 rounded-lg bg-gray-800/80 backdrop-blur-sm">
            <span className="text-sm text-gray-400">Hand #</span>
            <span className="text-sm font-bold text-white">{gameState.handNumber}</span>
          </div>
        </div>
      </div>

      {/* Main game area - flex-1 to fill remaining space */}
      <div className="flex-1 relative w-full overflow-hidden">
        {rotatedPlayers.slice(0, 8).map((player, visualIndex) => {
          const actualIndex = gameState.players.findIndex(p => p.userId === player.userId);
          const isActive = actualIndex === gameState.activePlayerIndex;
          const isCurrentUser = player.userId === currentUserId;
          const isDealer = actualIndex === gameState.dealerIndex;

          // Calculate small blind and big blind
          const playerCount = gameState.players.length;
          const smallBlindIndex = playerCount === 2
            ? gameState.dealerIndex
            : (gameState.dealerIndex + 1) % playerCount;
          const bigBlindIndex = playerCount === 2
            ? (gameState.dealerIndex + 1) % playerCount
            : (gameState.dealerIndex + 2) % playerCount;

          const isSmallBlind = actualIndex === smallBlindIndex;
          const isBigBlind = actualIndex === bigBlindIndex;

          return (
            <div
              key={player.userId}
              className={cn('absolute', seatPositions[visualIndex])}
            >
              <PokerPlayerSeat
                player={player}
                isActive={isActive}
                isCurrentUser={isCurrentUser}
                isDealer={isDealer}
                isSmallBlind={isSmallBlind}
                isBigBlind={isBigBlind}
                showCards={showCards || isCurrentUser}
                position={visualIndex}
                timeLeft={isActive ? timeLeft : undefined}
              />
            </div>
          );
        })}
      </div>

      {/* Center area: Community cards and pot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6">
        <PokerCommunityCards cards={gameState.communityCards} phase={gameState.phase} />
        <PokerPot
          mainPot={gameState.pot}
          players={gameState.players.map(p => ({
            userId: p.userId,
            totalBetInHand: p.totalBetInHand,
            isFolded: p.isFolded
          }))}
          animateUpdate={true}
        />
      </div>

      {/* Action history sidebar */}
      <div className="absolute top-4 right-4 bottom-24 max-h-[calc(100vh-200px)]">
        <PokerActionHistory actions={actionHistory} maxActions={10} />
      </div>

      {/* Debug info */}
      <div className="absolute top-20 left-4 bg-black/80 text-white text-xs p-2 rounded font-mono">
        <div>Phase: {gameState.phase}</div>
        <div>Active: {gameState.activePlayerIndex}</div>
        <div>My Index: {gameState.players.findIndex(p => p.userId === currentUserId)}</div>
        <div>Actions: {availableActions.join(', ') || 'none'}</div>
        <div>My Turn: {gameState.activePlayerIndex === gameState.players.findIndex(p => p.userId === currentUserId) ? 'YES' : 'NO'}</div>
      </div>

      {/* Action buttons at bottom */}
      {availableActions.length > 0 && currentPlayer && (
        <div className="shrink-0 w-full border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm px-4 py-3">
          <div className="max-w-4xl mx-auto">
          <PokerActionButtons
            availableActions={availableActions}
            currentBet={gameState.currentBet}
            playerBet={currentPlayer.currentBet}
            playerChips={currentPlayer.chips}
            minRaise={minRaise}
            pot={gameState.pot}
            onAction={handleAction}
            timeLeft={timeLeft}
          />
          </div>
        </div>
      )}

      {/* Result modal */}
      {showResultModal && resultData && (
        <PokerResultModal
          isOpen={showResultModal}
          winners={resultData.winners}
          otherPlayers={resultData.otherPlayers}
          communityCards={gameState.communityCards}
          totalPot={resultData.totalPot}
          onClose={handleResultModalClose}
          autoCloseDelay={5000}
        />
      )}
    </div>
  );
}
