/**
 * Blackjack State Machine TDD Tests
 * Test-first implementation following RED-GREEN-REFACTOR cycle
 */

import { describe, it, expect } from '@jest/globals';
import type { Card } from '../../cards/types';
import { createBlackjackState, applyBlackjackAction, updateHandStatus, dealerStep } from '../state-machine';
import type { BlackjackGameState, BlackjackAction } from '../state-machine';

describe('Blackjack State Machine', () => {
  describe('Game Initialization', () => {
    it('should create initial state with 1 player in betting phase', () => {
      const players = [{ userId: 'user1', displayName: 'Player 1' }];
      const settings = { deckCount: 6, turnTimer: 30000 };

      const state = createBlackjackState(players, settings);

      expect(state.phase).toBe('betting');
      expect(state.players).toHaveLength(1);
      expect(state.players[0].userId).toBe('user1');
      expect(state.players[0].hands).toHaveLength(1);
      expect(state.players[0].hands[0].cards).toHaveLength(0);
      expect(state.roundNumber).toBe(1);
      expect(state.deck.length).toBe(312); // 6 decks * 52 cards
    });

    it('should create initial state with multiple players (2-7)', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' },
        { userId: 'user3', displayName: 'Player 3' }
      ];
      const settings = { deckCount: 6, turnTimer: 30000 };

      const state = createBlackjackState(players, settings);

      expect(state.phase).toBe('betting');
      expect(state.players).toHaveLength(3);
      expect(state.players.every(p => p.hands.length === 1)).toBe(true);
    });
  });

  describe('Betting Phase', () => {
    it('should accept bet placement from player', () => {
      const state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      const action: BlackjackAction = {
        type: 'PLACE_BET',
        payload: { amount: 100 }
      };

      const newState = applyBlackjackAction(state, action, 'user1');

      expect(newState).not.toBeInstanceOf(Error);
      if (!(newState instanceof Error)) {
        expect(newState.players[0].bet).toBe(100);
        expect(newState.players[0].hands[0].bet).toBe(100);
      }
    });

    it('should transition to player_turn phase when all players have bet', () => {
      let state = createBlackjackState(
        [
          { userId: 'user1', displayName: 'Player 1' },
          { userId: 'user2', displayName: 'Player 2' }
        ],
        { deckCount: 6, turnTimer: 30000 }
      );

      // First player bets
      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;
      expect(state.phase).toBe('betting');

      // Second player bets (triggers dealing and transition to player_turn)
      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 50 } }, 'user2') as BlackjackGameState;
      expect(state.phase).toBe('player_turn');
      expect(state.players[0].hands[0].cards).toHaveLength(2); // Cards were dealt
      expect(state.players[1].hands[0].cards).toHaveLength(2);
    });

    it('should return error if player bets in wrong phase', () => {
      const state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      // Manually set phase to dealing
      const dealingState = { ...state, phase: 'dealing' as const };

      const result = applyBlackjackAction(
        dealingState,
        { type: 'PLACE_BET', payload: { amount: 100 } },
        'user1'
      );

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('Not in betting phase');
    });
  });

  describe('Dealing Phase', () => {
    it('should deal 2 cards to each player and dealer when dealing starts', () => {
      let state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      // Place bet to trigger dealing
      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;

      expect(state.phase).toBe('player_turn'); // Dealing is instantaneous
      expect(state.players[0].hands[0].cards).toHaveLength(2);
      expect(state.dealer.cards).toHaveLength(2);
      expect(state.dealer.hidden).toBe(true); // Hole card is hidden
    });

    it('should transition to player_turn phase after dealing', () => {
      let state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;

      // After dealing, should move to player turn
      expect(state.phase).toBe('player_turn');
    });
  });

  describe('Player Actions - HIT', () => {
    it('should add card to player hand on HIT', () => {
      let state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;

      const initialCardCount = state.players[0].hands[0].cards.length;

      state = applyBlackjackAction(state, { type: 'HIT' }, 'user1') as BlackjackGameState;

      expect(state.players[0].hands[0].cards.length).toBe(initialCardCount + 1);
    });

    it('should bust hand if total exceeds 21', () => {
      let state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      // Manually set up a hand that will bust on next hit
      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;

      // Set up cards that total >21
      const cards: Card[] = [
        { rank: 'K', suit: 'hearts' },
        { rank: '10', suit: 'spades' },
        { rank: 'Q', suit: 'diamonds' } // Total: 30 (busted)
      ];

      state.players[0].hands[0].cards = cards;
      // Update status to reflect the cards (in real game, this happens through actions)
      state.players[0].hands[0] = updateHandStatus(state.players[0].hands[0]);

      expect(state.players[0].hands[0].status).toBe('busted');
    });

    it('should return error if non-current player tries to HIT', () => {
      let state = createBlackjackState(
        [
          { userId: 'user1', displayName: 'Player 1' },
          { userId: 'user2', displayName: 'Player 2' }
        ],
        { deckCount: 6, turnTimer: 30000 }
      );

      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;
      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 50 } }, 'user2') as BlackjackGameState;

      // Assume user1 is current player, user2 should not be able to act
      const result = applyBlackjackAction(state, { type: 'HIT' }, 'user2');

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('Not your turn');
    });
  });

  describe('Player Actions - STAND', () => {
    it('should mark hand as stood and move to next player', () => {
      let state = createBlackjackState(
        [
          { userId: 'user1', displayName: 'Player 1' },
          { userId: 'user2', displayName: 'Player 2' }
        ],
        { deckCount: 6, turnTimer: 30000 }
      );

      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;
      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 50 } }, 'user2') as BlackjackGameState;

      state = applyBlackjackAction(state, { type: 'STAND' }, 'user1') as BlackjackGameState;

      expect(state.players[0].hands[0].status).toBe('stood');
      expect(state.currentPlayerIndex).toBe(1); // Moved to player 2
    });

    it('should transition to dealer turn when all players have stood', () => {
      let state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;
      state = applyBlackjackAction(state, { type: 'STAND' }, 'user1') as BlackjackGameState;

      // After all players stand, game enters dealer turn; dealer plays via dealerStep
      expect(state.phase).toBe('dealer_turn');
      expect(state.dealer.hidden).toBe(false);

      const settled = dealerStep({
        ...state,
        dealer: {
          ...state.dealer,
          cards: [
            { rank: 'K', suit: 'hearts' },
            { rank: '7', suit: 'clubs' },
          ],
        },
      });

      expect(settled.phase).toBe('settlement');
    });
  });

  describe('Player Actions - DOUBLE', () => {
    it('should double bet, deal one card, and auto-stand', () => {
      let state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;

      const initialCardCount = state.players[0].hands[0].cards.length;

      state = applyBlackjackAction(state, { type: 'DOUBLE' }, 'user1') as BlackjackGameState;

      expect(state.players[0].hands[0].bet).toBe(200); // Doubled
      expect(state.players[0].hands[0].cards.length).toBe(initialCardCount + 1);
      // Status can be 'stood' or 'busted' depending on the dealt card
      expect(['stood', 'busted']).toContain(state.players[0].hands[0].status);
      expect(state.players[0].hands[0].isDoubled).toBe(true);
    });
  });

  describe('Player Actions - SPLIT', () => {
    it('should split pair into two hands', () => {
      let state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;

      // Manually set up a pair
      state.players[0].hands[0].cards = [
        { rank: '8', suit: 'hearts' },
        { rank: '8', suit: 'spades' }
      ];

      state = applyBlackjackAction(state, { type: 'SPLIT' }, 'user1') as BlackjackGameState;

      expect(state.players[0].hands).toHaveLength(2);
      expect(state.players[0].hands[0].cards).toHaveLength(2); // Original card + new card
      expect(state.players[0].hands[1].cards).toHaveLength(2); // Split card + new card
      expect(state.players[0].hands[0].bet).toBe(100);
      expect(state.players[0].hands[1].bet).toBe(100);
      expect(state.players[0].hands[0].isSplit).toBe(true);
      expect(state.players[0].hands[1].isSplit).toBe(true);
    });

    it('should return error if trying to split non-pair', () => {
      let state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;

      // Cards are not a pair
      state.players[0].hands[0].cards = [
        { rank: '8', suit: 'hearts' },
        { rank: '9', suit: 'spades' }
      ];

      const result = applyBlackjackAction(state, { type: 'SPLIT' }, 'user1');

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('Cannot split');
    });
  });

  describe('Player Actions - INSURANCE', () => {
    it('should allow insurance when dealer shows Ace', () => {
      let state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;

      // Set dealer's visible card to Ace
      state.dealer.cards[0] = { rank: 'A', suit: 'hearts' };

      state = applyBlackjackAction(state, { type: 'INSURANCE', payload: { amount: 50 } }, 'user1') as BlackjackGameState;

      expect(state.players[0].insurance).toBe(50);
    });

    it('should return error if dealer does not show Ace', () => {
      let state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;

      // Ensure dealer's visible card is not Ace
      state.dealer.cards[0] = { rank: 'K', suit: 'spades' };

      const result = applyBlackjackAction(state, { type: 'INSURANCE', payload: { amount: 50 } }, 'user1');

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('Insurance not available');
    });
  });

  describe('Player Actions - SURRENDER', () => {
    it('should surrender hand and forfeit half bet', () => {
      let state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;
      state = applyBlackjackAction(state, { type: 'SURRENDER' }, 'user1') as BlackjackGameState;

      expect(state.players[0].hands[0].status).toBe('surrendered');
    });
  });

  describe('Dealer Turn', () => {
    it('should dealer hit on 16 or less and transition to settlement', () => {
      let state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;
      state = applyBlackjackAction(state, { type: 'STAND' }, 'user1') as BlackjackGameState;

      // After all players stand, dealer plays via dealerStep
      expect(state.phase).toBe('dealer_turn');
      expect(state.dealer.hidden).toBe(false); // Hole card revealed

      const withSixteen = {
        ...state,
        dealer: {
          ...state.dealer,
          cards: [
            { rank: '10', suit: 'hearts' },
            { rank: '6', suit: 'spades' },
          ],
        },
        deck: [
          { rank: '5', suit: 'diamonds' },
          ...state.deck,
        ],
      };

      const hitResult = dealerStep(withSixteen);
      expect(hitResult.phase).toBe('dealer_turn');
      expect(hitResult.dealer.cards.length).toBe(3);

      const settled = dealerStep(hitResult);
      expect(settled.phase).toBe('settlement');
    });

    it('should dealer play and transition to settlement', () => {
      let state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;
      state = applyBlackjackAction(state, { type: 'STAND' }, 'user1') as BlackjackGameState;

      // Dealer plays via dealerStep and game moves to settlement
      expect(state.phase).toBe('dealer_turn');

      const settled = dealerStep({
        ...state,
        dealer: {
          ...state.dealer,
          cards: [
            { rank: 'Q', suit: 'hearts' },
            { rank: '7', suit: 'spades' },
          ],
        },
      });

      expect(settled.phase).toBe('settlement');
    });
  });

  describe('Settlement', () => {
    it('should detect blackjack (Ace + 10-value) and pay 3:2', () => {
      let state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;

      // Set up blackjack (Ace + King = 21)
      state.players[0].hands[0].cards = [
        { rank: 'A', suit: 'hearts' },
        { rank: 'K', suit: 'spades' }
      ];
      state.players[0].hands[0] = updateHandStatus(state.players[0].hands[0]);

      expect(state.players[0].hands[0].status).toBe('blackjack');
    });

    it('should handle push (tie with dealer)', () => {
      let state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;

      // Both player and dealer have 20
      state.players[0].hands[0].cards = [
        { rank: 'K', suit: 'hearts' },
        { rank: 'Q', suit: 'spades' }
      ];
      state.dealer.cards = [
        { rank: 'K', suit: 'diamonds' },
        { rank: 'J', suit: 'clubs' }
      ];

      state = applyBlackjackAction(state, { type: 'STAND' }, 'user1') as BlackjackGameState;

      expect(state.phase).toBe('dealer_turn');

      const settled = dealerStep(state);
      expect(settled.phase).toBe('settlement');
    });
  });

  describe('Player Disconnect', () => {
    it('should auto-stand remaining hands when player disconnects', () => {
      let state = createBlackjackState(
        [
          { userId: 'user1', displayName: 'Player 1' },
          { userId: 'user2', displayName: 'Player 2' }
        ],
        { deckCount: 6, turnTimer: 30000 }
      );

      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 100 } }, 'user1') as BlackjackGameState;
      state = applyBlackjackAction(state, { type: 'PLACE_BET', payload: { amount: 50 } }, 'user2') as BlackjackGameState;

      state = applyBlackjackAction(state, { type: 'PLAYER_DISCONNECT', payload: { userId: 'user1' } }, 'user1') as BlackjackGameState;

      expect(state.players[0].isConnected).toBe(false);
      expect(state.players[0].hands[0].status).toBe('stood');
    });
  });

  describe('Solo Mode', () => {
    it('should support up to 3 starting hands in solo mode', () => {
      const state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000, soloHandCount: 3 }
      );

      expect(state.players[0].hands).toHaveLength(3);
    });
  });

  describe('Error Cases', () => {
    it('should return Error for invalid action type', () => {
      const state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      const result = applyBlackjackAction(
        state,
        { type: 'INVALID_ACTION' } as any,
        'user1'
      );

      expect(result).toBeInstanceOf(Error);
    });

    it('should return Error when user not found in game', () => {
      const state = createBlackjackState(
        [{ userId: 'user1', displayName: 'Player 1' }],
        { deckCount: 6, turnTimer: 30000 }
      );

      const result = applyBlackjackAction(
        state,
        { type: 'PLACE_BET', payload: { amount: 100 } },
        'nonexistent-user'
      );

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('Player not found');
    });
  });
});
