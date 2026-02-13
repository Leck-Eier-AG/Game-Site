'use client';

import { type Socket } from 'socket.io-client';
import { FeltTable } from '@/components/casino/FeltTable';
import { PlayerSeat } from './PlayerSeat';
import { CommunityCards } from './CommunityCards';
import { PotDisplay } from './PotDisplay';
import { BettingControls } from './BettingControls';
import { GameChat } from '@/components/game/GameChat';
import type { PokerGameState } from '@/lib/game/poker/state-machine';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface PokerTableProps {
  gameState: PokerGameState;
  roomId: string;
  currentUserId: string;
  socket: Socket;
  isBetRoom?: boolean;
}

// Phase display names in German
const PHASE_LABELS: Record<string, string> = {
  waiting: 'Warten',
  blinds: 'Blinds',
  preflop: 'Preflop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
  hand_end: 'Hand beendet',
  game_end: 'Spiel beendet',
};

export function PokerTable({
  gameState,
  roomId,
  currentUserId,
  socket,
  isBetRoom = false,
}: PokerTableProps) {
  const [timeLeft, setTimeLeft] = useState<number | undefined>(undefined);

  // Find current user in players
  const currentUserIndex = gameState.players.findIndex(p => p.userId === currentUserId);
  const isActivePlayer = gameState.activePlayerIndex === currentUserIndex;

  // Rotate seats so current user is always at position 0 (bottom center)
  const rotatedPlayers = currentUserIndex >= 0
    ? [
        ...gameState.players.slice(currentUserIndex),
        ...gameState.players.slice(0, currentUserIndex),
      ]
    : gameState.players;

  // Determine dealer, SB, BB positions (relative to rotated view)
  const getDealerPosition = () => {
    if (currentUserIndex < 0) return gameState.dealerIndex;
    const offset = gameState.dealerIndex - currentUserIndex;
    return offset >= 0 ? offset : offset + gameState.players.length;
  };

  const dealerPosition = getDealerPosition();
  const playerCount = gameState.players.length;

  let sbPosition: number;
  let bbPosition: number;

  if (playerCount === 2) {
    // Heads-up: dealer is SB
    sbPosition = dealerPosition;
    bbPosition = (dealerPosition + 1) % playerCount;
  } else {
    // Multi-player
    sbPosition = (dealerPosition + 1) % playerCount;
    bbPosition = (dealerPosition + 2) % playerCount;
  }

  // Determine which cards to show
  const shouldShowCards = (playerIndex: number): boolean => {
    if (gameState.phase === 'showdown' || gameState.phase === 'hand_end') {
      // Show all non-folded players' cards at showdown
      return !rotatedPlayers[playerIndex].isFolded;
    }
    return false;
  };

  // Get available actions for current player
  const getAvailableActions = (): string[] => {
    if (!isActivePlayer) return [];

    const actions: string[] = [];
    const currentPlayer = gameState.players[currentUserIndex];

    if (!currentPlayer || currentPlayer.isFolded) return [];

    // Always can fold
    actions.push('fold');

    // Can check if no bet to call
    if (gameState.currentBet === currentPlayer.currentBet) {
      actions.push('check');
    } else {
      // Must call or raise
      actions.push('call');
    }

    // Can raise if have chips
    if (currentPlayer.chips > 0) {
      actions.push('raise');
      actions.push('all_in');
    }

    return actions;
  };

  const availableActions = getAvailableActions();
  const currentPlayer = currentUserIndex >= 0 ? gameState.players[currentUserIndex] : null;

  // Handle player action
  const handleAction = (action: string, amount?: number) => {
    const actionData: any = { roomId };

    switch (action) {
      case 'fold':
        actionData.action = 'fold';
        break;
      case 'check':
        actionData.action = 'check';
        break;
      case 'call':
        actionData.action = 'call';
        break;
      case 'raise':
        actionData.action = 'raise';
        actionData.amount = amount;
        break;
      case 'all_in':
        actionData.action = 'all_in';
        break;
      default:
        return;
    }

    socket.emit('poker:action', actionData, (response: any) => {
      if (!response?.success) {
        console.error('Poker action failed:', response?.error);
      }
    });
  };

  // Timer countdown
  useEffect(() => {
    if (!isActivePlayer) {
      setTimeLeft(undefined);
      return;
    }

    // Start at 30 seconds
    setTimeLeft(30);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === undefined || prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActivePlayer, gameState.activePlayerIndex]);

  const minRaise = gameState.currentBet + gameState.lastRaiseAmount;
  const maxRaise = currentPlayer ? currentPlayer.chips + currentPlayer.currentBet : 0;

  return (
    <div className="relative h-screen bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
      {/* Main Table */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <FeltTable variant="blue" className="w-full max-w-6xl h-[600px]">
          {/* Phase Label */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900/90 px-4 py-2 rounded-lg border border-yellow-600">
            <p className="text-lg font-bold text-yellow-400">
              {PHASE_LABELS[gameState.phase] || gameState.phase}
            </p>
          </div>

          {/* Blinds Info */}
          <div className="absolute top-4 right-4 bg-gray-900/90 px-3 py-1 rounded-lg text-sm text-white">
            <p>SB: ${gameState.blinds.small} / BB: ${gameState.blinds.big}</p>
          </div>

          {/* Hand Number */}
          <div className="absolute top-4 left-4 bg-gray-900/90 px-3 py-1 rounded-lg text-sm text-white">
            <p>Hand #{gameState.handNumber}</p>
          </div>

          {/* Center Area: Community Cards + Pot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
            {/* Pot Display */}
            <PotDisplay mainPot={gameState.pot} />

            {/* Community Cards */}
            <CommunityCards cards={gameState.communityCards} phase={gameState.phase} />
          </div>

          {/* Player Seats */}
          {rotatedPlayers.map((player, index) => (
            <PlayerSeat
              key={player.userId}
              player={player}
              isDealer={index === dealerPosition}
              isSmallBlind={index === sbPosition}
              isBigBlind={index === bbPosition}
              isActive={gameState.activePlayerIndex === (currentUserIndex >= 0 ? (index + currentUserIndex) % playerCount : index)}
              isCurrentUser={index === 0}
              showCards={shouldShowCards(index)}
              position={index}
              timeLeft={
                gameState.activePlayerIndex === (currentUserIndex >= 0 ? (index + currentUserIndex) % playerCount : index)
                  ? timeLeft
                  : undefined
              }
            />
          ))}
        </FeltTable>
      </div>

      {/* Betting Controls (bottom) */}
      {isActivePlayer && availableActions.length > 0 && currentPlayer && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4">
          <BettingControls
            availableActions={availableActions}
            currentBet={gameState.currentBet}
            playerBet={currentPlayer.currentBet}
            playerChips={currentPlayer.chips}
            minRaise={minRaise}
            pot={gameState.pot}
            onAction={handleAction}
            disabled={false}
            timeLeft={timeLeft}
          />
        </div>
      )}

      {/* Game Chat (right side) */}
      <div className="absolute right-4 top-4 bottom-4 w-80">
        <GameChat roomId={roomId} socket={socket} currentUserId={currentUserId} />
      </div>
    </div>
  );
}
