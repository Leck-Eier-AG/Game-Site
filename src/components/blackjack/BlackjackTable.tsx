'use client';

import { type Socket } from 'socket.io-client';
import { FeltTable } from '@/components/casino/FeltTable';
import { DealerHand } from './DealerHand';
import { PlayerHand } from './PlayerHand';
import { ActionButtons } from './ActionButtons';
import { ChipStack } from '@/components/casino/ChipStack';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { BlackjackGameState, PlayerHand as PlayerHandType } from '@/lib/game/blackjack/state-machine';

interface BlackjackTableProps {
  gameState: BlackjackGameState;
  roomId: string;
  currentUserId: string;
  socket: Socket;
  isBetRoom?: boolean;
  betAmount?: number;
}

export function BlackjackTable({
  gameState,
  roomId,
  currentUserId,
  socket,
  isBetRoom = false,
  betAmount = 0,
}: BlackjackTableProps) {
  const [localBet, setLocalBet] = useState(betAmount || 10);
  const currentPlayer = gameState.players.find(p => p.userId === currentUserId);
  const isCurrentTurn = gameState.players[gameState.currentPlayerIndex]?.userId === currentUserId;

  // Calculate total pot for bet rooms
  const totalPot = isBetRoom
    ? gameState.players.reduce((sum, p) => sum + p.bet, 0)
    : 0;

  // Handle bet placement
  const handlePlaceBet = () => {
    socket.emit('blackjack:place-bet', { roomId, amount: localBet }, (response: any) => {
      if (!response?.success) {
        console.error('Failed to place bet:', response?.error);
      }
    });
  };

  // Handle player action
  const handleAction = (action: string) => {
    const data: any = { roomId, action };

    if (action === 'insurance' && currentPlayer) {
      data.insuranceAmount = Math.floor(currentPlayer.bet / 2);
    }

    socket.emit('blackjack:action', data, (response: any) => {
      if (!response?.success) {
        console.error('Failed to perform action:', response?.error);
      }
    });
  };

  // Calculate available actions for current hand
  const getAvailableActions = (): string[] => {
    if (!isCurrentTurn || !currentPlayer || gameState.phase !== 'player_turn') {
      return [];
    }

    const hand = currentPlayer.hands[currentPlayer.currentHandIndex];
    if (!hand || hand.status !== 'playing') {
      return [];
    }

    const actions: string[] = ['hit', 'stand'];

    // Can double on initial 2 cards
    if (hand.cards.length === 2) {
      actions.push('double');
      actions.push('surrender');
    }

    // Can split pairs
    if (hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank) {
      actions.push('split');
    }

    // Insurance if dealer shows Ace
    if (gameState.dealer.cards[0]?.rank === 'A' && hand.cards.length === 2) {
      actions.push('insurance');
    }

    return actions;
  };

  // Settlement results
  const getHandResult = (hand: PlayerHandType): string | null => {
    if (gameState.phase !== 'round_end') return null;

    if (hand.status === 'busted') return 'Verloren';
    if (hand.status === 'surrendered') return 'Aufgegeben';
    if (hand.status === 'blackjack') return 'Blackjack!';

    // Compare with dealer
    const dealerValue = gameState.dealer.cards.reduce((sum, card) => {
      const val = card.rank === 'A' ? 11 : ['K', 'Q', 'J'].includes(card.rank) ? 10 : parseInt(card.rank);
      return sum + val;
    }, 0);

    const handValue = hand.cards.reduce((sum, card) => {
      const val = card.rank === 'A' ? 11 : ['K', 'Q', 'J'].includes(card.rank) ? 10 : parseInt(card.rank);
      return sum + val;
    }, 0);

    if (dealerValue > 21 || handValue > dealerValue) return 'Gewonnen';
    if (handValue === dealerValue) return 'Unentschieden';
    return 'Verloren';
  };

  return (
    <FeltTable className="w-full max-w-6xl mx-auto">
      <div className="space-y-8">
        {/* Dealer Section */}
        <div className="flex flex-col items-center space-y-4">
          <h3 className="text-xl font-bold text-white">Dealer</h3>
          <DealerHand
            cards={gameState.dealer.cards}
            hidden={gameState.dealer.hidden}
            handValue={0}
            phase={gameState.phase}
          />
        </div>

        {/* Pot Display for Bet Rooms */}
        {isBetRoom && totalPot > 0 && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-black/30 px-6 py-3 rounded-full">
              <span className="text-yellow-400 text-lg font-bold">Pot:</span>
              <ChipStack amount={totalPot} size="sm" />
            </div>
          </div>
        )}

        {/* Betting Phase */}
        {gameState.phase === 'betting' && currentPlayer && currentPlayer.bet === 0 && (
          <div className="flex flex-col items-center space-y-4">
            <h3 className="text-xl font-bold text-white">Einsatz setzen</h3>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={localBet}
                onChange={(e) => setLocalBet(parseInt(e.target.value) || 0)}
                min={1}
                className="w-32"
              />
              <Button onClick={handlePlaceBet}>Setzen</Button>
            </div>
          </div>
        )}

        {/* Player Hands Section */}
        <div className="space-y-6">
          {gameState.players.map((player) => (
            <div key={player.userId} className="space-y-2">
              <h4 className="text-lg font-semibold text-white text-center">
                {player.displayName}
                {player.userId === currentUserId && ' (Du)'}
              </h4>

              <div className="flex flex-wrap justify-center gap-6">
                {player.hands.map((hand, handIndex) => {
                  const isActive =
                    gameState.phase === 'player_turn' &&
                    player.userId === gameState.players[gameState.currentPlayerIndex]?.userId &&
                    player.currentHandIndex === handIndex;

                  const result = getHandResult(hand);

                  return (
                    <div key={handIndex} className="relative">
                      <PlayerHand
                        hand={hand}
                        isActive={isActive}
                        playerName={player.displayName}
                        isCurrentUser={player.userId === currentUserId}
                      />
                      {result && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                          {result}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        {isCurrentTurn && currentPlayer && (
          <div className="flex justify-center">
            <ActionButtons
              availableActions={getAvailableActions()}
              onAction={handleAction}
              disabled={false}
              currentBet={currentPlayer.bet}
              balance={0}
            />
          </div>
        )}

        {/* Round End */}
        {gameState.phase === 'round_end' && (
          <div className="text-center">
            <Button
              onClick={() => {
                socket.emit('blackjack:next-round', { roomId });
              }}
              size="lg"
            >
              Nächste Runde
            </Button>
          </div>
        )}
      </div>
    </FeltTable>
  );
}
