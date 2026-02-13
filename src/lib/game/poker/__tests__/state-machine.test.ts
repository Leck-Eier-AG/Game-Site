/**
 * Poker State Machine TDD Tests
 * Test-first implementation following RED-GREEN-REFACTOR cycle
 */

import { describe, it, expect } from '@jest/globals';
import type { Card } from '../../cards/types';
import { createDeck, shuffleDeck } from '../../cards/deck';
import {
  createPokerState,
  applyPokerAction,
  type PokerGameState,
  type PokerAction
} from '../state-machine';

describe('Poker State Machine', () => {
  describe('Game Initialization', () => {
    it('should create initial state with 2 players', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      const state = createPokerState(players, settings, deck);

      expect(state.phase).toBe('blinds');
      expect(state.players).toHaveLength(2);
      expect(state.players[0].chips).toBe(1000);
      expect(state.blinds.small).toBe(5);
      expect(state.blinds.big).toBe(10);
      expect(state.dealerIndex).toBe(0);
      expect(state.handNumber).toBe(1);
      expect(state.pot).toBe(0);
      expect(state.communityCards).toEqual([]);
    });

    it('should create initial state with 9 players (max)', () => {
      const players = Array.from({ length: 9 }, (_, i) => ({
        userId: `user${i + 1}`,
        displayName: `Player ${i + 1}`
      }));
      const settings = {
        smallBlind: 10,
        bigBlind: 20,
        startingChips: 500,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      const state = createPokerState(players, settings, deck);

      expect(state.phase).toBe('blinds');
      expect(state.players).toHaveLength(9);
      expect(state.players.every(p => p.chips === 500)).toBe(true);
    });

    it('should assign seat indices correctly', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' },
        { userId: 'user3', displayName: 'Player 3' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      const state = createPokerState(players, settings, deck);

      expect(state.players[0].seatIndex).toBe(0);
      expect(state.players[1].seatIndex).toBe(1);
      expect(state.players[2].seatIndex).toBe(2);
    });
  });

  describe('Blinds Phase', () => {
    it('should auto-post small and big blinds', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' },
        { userId: 'user3', displayName: 'Player 3' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);

      // Apply POST_BLINDS action
      const result = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1');
      expect(result).not.toBeInstanceOf(Error);

      state = result as PokerGameState;

      // Small blind is left of dealer (index 1)
      expect(state.players[1].currentBet).toBe(5);
      expect(state.players[1].chips).toBe(995);

      // Big blind is left of small blind (index 2)
      expect(state.players[2].currentBet).toBe(10);
      expect(state.players[2].chips).toBe(990);

      expect(state.pot).toBe(15);
      expect(state.currentBet).toBe(10);
      expect(state.phase).toBe('preflop');
    });

    it('should handle heads-up blind posting (dealer posts small blind)', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);

      const result = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1');
      state = result as PokerGameState;

      // In heads-up, dealer (index 0) posts small blind
      expect(state.players[0].currentBet).toBe(5);
      expect(state.players[0].chips).toBe(995);

      // Other player (index 1) posts big blind
      expect(state.players[1].currentBet).toBe(10);
      expect(state.players[1].chips).toBe(990);
    });
  });

  describe('Hole Card Dealing', () => {
    it('should deal 2 hole cards to each player after blinds', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;

      expect(state.players[0].holeCards).toHaveLength(2);
      expect(state.players[1].holeCards).toHaveLength(2);
      expect(state.deck.length).toBe(48); // 52 - 4 cards dealt
    });
  });

  describe('Preflop Betting', () => {
    it('should start action left of big blind', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' },
        { userId: 'user3', displayName: 'Player 3' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;

      // Dealer index 0, small blind index 1, big blind index 2
      // Action starts left of big blind = index 0
      expect(state.activePlayerIndex).toBe(0);
      expect(state.phase).toBe('preflop');
    });

    it('should allow FOLD action', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' },
        { userId: 'user3', displayName: 'Player 3' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;

      const result = applyPokerAction(state, { type: 'FOLD' }, 'user1');
      expect(result).not.toBeInstanceOf(Error);

      state = result as PokerGameState;
      expect(state.players[0].isFolded).toBe(true);
      expect(state.activePlayerIndex).toBe(1); // Advanced to next player
    });

    it('should allow CALL action to match big blind', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' },
        { userId: 'user3', displayName: 'Player 3' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;

      const result = applyPokerAction(state, { type: 'CALL' }, 'user1');
      state = result as PokerGameState;

      expect(state.players[0].currentBet).toBe(10);
      expect(state.players[0].chips).toBe(990);
      expect(state.pot).toBe(25); // 5 + 10 + 10
    });

    it('should allow RAISE action with valid amount', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' },
        { userId: 'user3', displayName: 'Player 3' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;

      const result = applyPokerAction(state, { type: 'RAISE', amount: 20 }, 'user1');
      state = result as PokerGameState;

      expect(state.players[0].currentBet).toBe(20);
      expect(state.players[0].chips).toBe(980);
      expect(state.currentBet).toBe(20);
      expect(state.pot).toBe(35); // 5 + 10 + 20
    });

    it('should enforce minimum raise (at least big blind)', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' },
        { userId: 'user3', displayName: 'Player 3' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;

      // Try to raise to 15 (only 5 more than big blind, minimum is 10)
      const result = applyPokerAction(state, { type: 'RAISE', amount: 15 }, 'user1');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('Minimum raise');
    });

    it('should allow ALL_IN action', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' },
        { userId: 'user3', displayName: 'Player 3' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;

      const result = applyPokerAction(state, { type: 'ALL_IN' }, 'user1');
      state = result as PokerGameState;

      expect(state.players[0].chips).toBe(0);
      expect(state.players[0].isAllIn).toBe(true);
      expect(state.players[0].currentBet).toBe(1000);
    });

    it('should reject CHECK when there is an outstanding bet', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;

      // Try to check when big blind is 10
      const result = applyPokerAction(state, { type: 'CHECK' }, 'user1');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('cannot check');
    });

    it('should reject action from wrong player', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' },
        { userId: 'user3', displayName: 'Player 3' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;

      // Active player is user1, try action from user2
      const result = applyPokerAction(state, { type: 'CALL' }, 'user2');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('Not your turn');
    });

    it('should end betting round when all bets are equalized', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;

      // User1 calls
      state = applyPokerAction(state, { type: 'CALL' }, 'user1') as PokerGameState;

      // User2 (big blind) checks
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;

      // Betting round complete, should advance to flop
      expect(state.phase).toBe('flop');
      expect(state.communityCards).toHaveLength(3);
    });
  });

  describe('Flop Phase', () => {
    it('should deal 3 community cards', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'CALL' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;

      expect(state.phase).toBe('flop');
      expect(state.communityCards).toHaveLength(3);
      expect(state.deck.length).toBe(45); // 52 - 4 hole - 3 flop
    });

    it('should reset currentBet and player bets for new round', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'CALL' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;

      expect(state.currentBet).toBe(0);
      expect(state.players[0].currentBet).toBe(0);
      expect(state.players[1].currentBet).toBe(0);
    });

    it('should allow CHECK when no bet has been made', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'CALL' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;

      // In flop, user2 is first to act (left of dealer)
      const result = applyPokerAction(state, { type: 'CHECK' }, 'user2');
      expect(result).not.toBeInstanceOf(Error);
    });
  });

  describe('Turn Phase', () => {
    it('should deal 1 community card', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'CALL' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;
      // Flop betting
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user1') as PokerGameState;

      expect(state.phase).toBe('turn');
      expect(state.communityCards).toHaveLength(4);
    });
  });

  describe('River Phase', () => {
    it('should deal 1 community card', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'CALL' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;
      // Flop betting
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user1') as PokerGameState;
      // Turn betting
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user1') as PokerGameState;

      expect(state.phase).toBe('river');
      expect(state.communityCards).toHaveLength(5);
    });
  });

  describe('Showdown Phase', () => {
    it('should evaluate hands and determine winner', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'CALL' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;
      // Flop
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user1') as PokerGameState;
      // Turn
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user1') as PokerGameState;
      // River
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user1') as PokerGameState;

      expect(state.phase).toBe('showdown');
      // Winner should be determined (requires hand evaluator)
      expect(state.players.some(p => p.chips > 1000 || p.chips < 1000)).toBe(true);
    });

    it('should award pot to winner', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;

      const initialPot = state.pot;
      expect(initialPot).toBe(15); // 5 + 10

      // Fast forward to showdown
      state = applyPokerAction(state, { type: 'CALL' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user2') as PokerGameState;
      state = applyPokerAction(state, { type: 'CHECK' }, 'user1') as PokerGameState;

      // One player should have won the pot
      const totalChips = state.players.reduce((sum, p) => sum + p.chips, 0);
      expect(totalChips).toBe(2000); // No chips lost
    });
  });

  describe('Dealer Rotation', () => {
    it('should rotate dealer after each hand', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' },
        { userId: 'user3', displayName: 'Player 3' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      expect(state.dealerIndex).toBe(0);

      // Complete a hand (fold immediately)
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'FOLD' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'FOLD' }, 'user2') as PokerGameState;

      // Hand should end, dealer should rotate
      expect(state.phase).toBe('hand_end');
      expect(state.dealerIndex).toBe(1);
    });
  });

  describe('Last Player Standing', () => {
    it('should award pot to last player when all others fold', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' },
        { userId: 'user3', displayName: 'Player 3' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;

      const initialChips = state.players[2].chips;

      // User1 folds, user2 folds, user3 wins
      state = applyPokerAction(state, { type: 'FOLD' }, 'user1') as PokerGameState;
      state = applyPokerAction(state, { type: 'FOLD' }, 'user2') as PokerGameState;

      expect(state.phase).toBe('hand_end');
      // User3 (index 2) should have won the pot
      expect(state.players[2].chips).toBeGreaterThan(initialChips);
    });
  });

  describe('Player Disconnect', () => {
    it('should auto-fold disconnected player', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;

      const result = applyPokerAction(state, { type: 'PLAYER_DISCONNECT', userId: 'user1' }, 'system');
      state = result as PokerGameState;

      expect(state.players[0].isConnected).toBe(false);
      expect(state.players[0].isFolded).toBe(true);
    });
  });

  describe('Blind Escalation', () => {
    it('should increase blinds after interval when enabled', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: true,
        blindInterval: 5, // Every 5 hands
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);

      // Play 5 hands (fast-forward with folds)
      for (let i = 0; i < 5; i++) {
        state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;
        state = applyPokerAction(state, { type: 'FOLD' }, 'user1') as PokerGameState;

        // Manually advance hand number and maintain state across hands
        if (i < 4) {
          state = {
            ...createPokerState(
              players,
              { ...settings, smallBlind: state.blinds.small, bigBlind: state.blinds.big },
              shuffleDeck(createDeck())
            ),
            handNumber: state.handNumber + 1,
            lastBlindIncrease: state.lastBlindIncrease,
            blinds: state.blinds
          };
        }
      }

      // Blinds should have increased after 5 hands
      expect(state.blinds.small).toBeGreaterThan(5);
      expect(state.blinds.big).toBeGreaterThan(10);
    });
  });

  describe('Error Cases', () => {
    it('should reject action in wrong phase', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      const state = createPokerState(players, settings, deck);

      // Try to fold in blinds phase
      const result = applyPokerAction(state, { type: 'FOLD' }, 'user1');
      expect(result).toBeInstanceOf(Error);
    });

    it('should reject invalid bet amount (insufficient chips)', () => {
      const players = [
        { userId: 'user1', displayName: 'Player 1' },
        { userId: 'user2', displayName: 'Player 2' }
      ];
      const settings = {
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 1000,
        blindEscalation: false,
        blindInterval: 0,
        turnTimer: 30000
      };
      const deck = shuffleDeck(createDeck());

      let state = createPokerState(players, settings, deck);
      state = applyPokerAction(state, { type: 'POST_BLINDS' }, 'user1') as PokerGameState;

      // Try to raise more than available chips
      const result = applyPokerAction(state, { type: 'RAISE', amount: 2000 }, 'user1');
      expect(result).toBeInstanceOf(Error);
    });
  });
});
