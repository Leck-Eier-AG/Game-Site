/**
 * Blackjack State Machine
 * Pure functional state machine following Kniffel pattern
 * Wraps engine-blackjack for multiplayer orchestration
 */

import type { Card } from '../cards/types';
import { createMultiDeck, shuffleDeck, dealCards } from '../cards/deck';
import {
  calculateHandValue,
  isBlackjack,
  isBusted,
  getBestValue,
  isPair
} from './engine-wrapper';

// ============================================================================
// Types
// ============================================================================

export type BlackjackPhase =
  | 'betting'
  | 'dealing'
  | 'player_turn'
  | 'dealer_turn'
  | 'settlement'
  | 'round_end';

export type HandStatus =
  | 'playing'
  | 'stood'
  | 'busted'
  | 'blackjack'
  | 'surrendered';

export interface PlayerHand {
  cards: Card[];
  bet: number;
  status: HandStatus;
  isDoubled: boolean;
  isSplit: boolean;
}

export interface DealerHand {
  cards: Card[];
  hidden: boolean; // First card face down until dealer turn
}

export interface BlackjackPlayer {
  userId: string;
  displayName: string;
  hands: PlayerHand[];
  currentHandIndex: number;
  bet: number;
  insurance: number;
  isActive: boolean;
  isConnected: boolean;
}

export interface BlackjackSettings {
  deckCount: number;
  turnTimer: number;
  soloHandCount?: number; // For solo mode, up to 3 hands
}

export interface BlackjackGameState {
  phase: BlackjackPhase;
  players: BlackjackPlayer[];
  dealer: DealerHand;
  deck: Card[];
  roundNumber: number;
  settings: BlackjackSettings;
  currentPlayerIndex: number;
}

export type BlackjackAction =
  | { type: 'PLACE_BET'; payload: { amount: number } }
  | { type: 'HIT' }
  | { type: 'STAND' }
  | { type: 'DOUBLE' }
  | { type: 'SPLIT' }
  | { type: 'INSURANCE'; payload: { amount: number } }
  | { type: 'SURRENDER' }
  | { type: 'PLAYER_DISCONNECT'; payload: { userId: string } };

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Create initial blackjack state in betting phase
 */
export function createBlackjackState(
  players: Array<{ userId: string; displayName: string }>,
  settings: BlackjackSettings
): BlackjackGameState {
  const handCount = settings.soloHandCount || 1;

  const blackjackPlayers: BlackjackPlayer[] = players.map(p => ({
    userId: p.userId,
    displayName: p.displayName,
    hands: Array.from({ length: handCount }, () => ({
      cards: [],
      bet: 0,
      status: 'playing' as HandStatus,
      isDoubled: false,
      isSplit: false
    })),
    currentHandIndex: 0,
    bet: 0,
    insurance: 0,
    isActive: true,
    isConnected: true
  }));

  // Create and shuffle multi-deck shoe
  const deck = shuffleDeck(createMultiDeck(settings.deckCount));

  return {
    phase: 'betting',
    players: blackjackPlayers,
    dealer: {
      cards: [],
      hidden: true
    },
    deck,
    roundNumber: 1,
    settings,
    currentPlayerIndex: 0
  };
}

/**
 * Apply an action to the game state
 * Returns new state or Error if action is invalid
 */
export function applyBlackjackAction(
  state: BlackjackGameState,
  action: BlackjackAction,
  userId: string
): BlackjackGameState | Error {
  // Find player
  const playerIndex = state.players.findIndex(p => p.userId === userId);
  if (action.type !== 'PLAYER_DISCONNECT' && playerIndex === -1) {
    return new Error('Player not found');
  }

  switch (action.type) {
    case 'PLACE_BET':
      return handlePlaceBet(state, playerIndex, action.payload.amount);

    case 'HIT':
      return handleHit(state, playerIndex);

    case 'STAND':
      return handleStand(state, playerIndex);

    case 'DOUBLE':
      return handleDouble(state, playerIndex);

    case 'SPLIT':
      return handleSplit(state, playerIndex);

    case 'INSURANCE':
      return handleInsurance(state, playerIndex, action.payload.amount);

    case 'SURRENDER':
      return handleSurrender(state, playerIndex);

    case 'PLAYER_DISCONNECT':
      return handlePlayerDisconnect(state, action.payload.userId);

    default:
      return new Error('Unknown action type');
  }
}

// ============================================================================
// Action Handlers
// ============================================================================

function handlePlaceBet(
  state: BlackjackGameState,
  playerIndex: number,
  amount: number
): BlackjackGameState | Error {
  if (state.phase !== 'betting') {
    return new Error('Not in betting phase');
  }

  const newPlayers = [...state.players];
  const player = { ...newPlayers[playerIndex] };

  player.bet = amount;
  // Set bet on all hands (for solo mode with multiple hands)
  player.hands = player.hands.map(hand => ({
    ...hand,
    bet: amount
  }));

  newPlayers[playerIndex] = player;

  // Check if all players have placed bets
  const allBetsPlaced = newPlayers.every(p => p.bet > 0);

  if (allBetsPlaced) {
    // Transition to dealing phase first
    const dealingState = {
      ...state,
      phase: 'dealing' as BlackjackPhase,
      players: newPlayers
    };

    // Then deal cards
    return dealInitialCards(dealingState);
  }

  return {
    ...state,
    players: newPlayers
  };
}

function dealInitialCards(state: BlackjackGameState): BlackjackGameState {
  let deck = [...state.deck];
  const newPlayers = state.players.map(p => ({ ...p, hands: p.hands.map(h => ({ ...h })) }));

  // Deal 2 cards to each player hand
  for (const player of newPlayers) {
    for (let i = 0; i < player.hands.length; i++) {
      const { dealt, remaining } = dealCards(deck, 2);
      player.hands[i].cards = dealt;
      deck = remaining;

      // Update status based on cards
      player.hands[i] = updateHandStatus(player.hands[i]);
    }
  }

  // Deal 2 cards to dealer
  const { dealt: dealerCards, remaining: finalDeck } = dealCards(deck, 2);

  // Return in player_turn phase (dealing is instantaneous)
  return {
    ...state,
    phase: 'player_turn' as BlackjackPhase,
    players: newPlayers,
    dealer: {
      cards: dealerCards,
      hidden: true
    },
    deck: finalDeck,
    currentPlayerIndex: 0
  };
}

function handleHit(
  state: BlackjackGameState,
  playerIndex: number
): BlackjackGameState | Error {
  const validationError = validatePlayerTurn(state, playerIndex);
  if (validationError) return validationError;

  const player = state.players[playerIndex];
  const handIndex = player.currentHandIndex;
  const hand = player.hands[handIndex];

  if (hand.status !== 'playing') {
    return new Error('Hand is not active');
  }

  // Deal one card
  const { dealt, remaining } = dealCards(state.deck, 1);

  const newState = updatePlayerHand(state, playerIndex, handIndex, (h) => {
    const newCards = [...h.cards, ...dealt];
    return {
      ...h,
      cards: newCards,
      status: isBusted(newCards) ? 'busted' : h.status
    };
  });

  const updatedHand = newState.players[playerIndex].hands[handIndex];

  // If busted, auto-advance
  if (updatedHand.status === 'busted') {
    return advanceTurn({ ...newState, deck: remaining });
  }

  return { ...newState, deck: remaining };
}

function handleStand(
  state: BlackjackGameState,
  playerIndex: number
): BlackjackGameState | Error {
  const validationError = validatePlayerTurn(state, playerIndex);
  if (validationError) return validationError;

  const player = state.players[playerIndex];
  const handIndex = player.currentHandIndex;

  const newState = updatePlayerHand(state, playerIndex, handIndex, (hand) => ({
    ...hand,
    status: 'stood' as HandStatus
  }));

  return advanceTurn(newState);
}

function handleDouble(
  state: BlackjackGameState,
  playerIndex: number
): BlackjackGameState | Error {
  const validationError = validatePlayerTurn(state, playerIndex);
  if (validationError) return validationError;

  const player = state.players[playerIndex];
  const handIndex = player.currentHandIndex;
  const hand = player.hands[handIndex];

  if (hand.cards.length !== 2) {
    return new Error('Can only double on initial hand');
  }

  // Deal one card
  const { dealt, remaining } = dealCards(state.deck, 1);

  const newState = updatePlayerHand(state, playerIndex, handIndex, (h) => {
    const newCards = [...h.cards, ...dealt];
    return {
      ...h,
      cards: newCards,
      bet: h.bet * 2,
      isDoubled: true,
      status: isBusted(newCards) ? ('busted' as HandStatus) : ('stood' as HandStatus)
    };
  });

  return advanceTurn({ ...newState, deck: remaining });
}

function handleSplit(
  state: BlackjackGameState,
  playerIndex: number
): BlackjackGameState | Error {
  if (state.phase !== 'player_turn') {
    return new Error('Not in player turn phase');
  }

  if (state.currentPlayerIndex !== playerIndex) {
    return new Error('Not your turn');
  }

  const player = state.players[playerIndex];
  const handIndex = player.currentHandIndex;
  const hand = player.hands[handIndex];

  if (!isPair(hand.cards)) {
    return new Error('Cannot split - not a pair');
  }

  // Split into two hands
  const card1 = hand.cards[0];
  const card2 = hand.cards[1];

  // Deal one card to each hand
  const { dealt: newCards, remaining } = dealCards(state.deck, 2);

  const hand1: PlayerHand = {
    cards: [card1, newCards[0]],
    bet: hand.bet,
    status: 'playing',
    isDoubled: false,
    isSplit: true
  };

  const hand2: PlayerHand = {
    cards: [card2, newCards[1]],
    bet: hand.bet,
    status: 'playing',
    isDoubled: false,
    isSplit: true
  };

  const newPlayers = [...state.players];
  const newPlayer = { ...newPlayers[playerIndex] };

  // Replace current hand with split hands
  newPlayer.hands = [...newPlayer.hands];
  newPlayer.hands[handIndex] = hand1;
  newPlayer.hands.splice(handIndex + 1, 0, hand2);

  newPlayers[playerIndex] = newPlayer;

  return {
    ...state,
    players: newPlayers,
    deck: remaining
  };
}

function handleInsurance(
  state: BlackjackGameState,
  playerIndex: number,
  amount: number
): BlackjackGameState | Error {
  if (state.phase !== 'player_turn') {
    return new Error('Not in player turn phase');
  }

  if (state.dealer.cards[0].rank !== 'A') {
    return new Error('Insurance not available - dealer does not show Ace');
  }

  const newPlayers = [...state.players];
  const newPlayer = { ...newPlayers[playerIndex] };
  newPlayer.insurance = amount;
  newPlayers[playerIndex] = newPlayer;

  return {
    ...state,
    players: newPlayers
  };
}

function handleSurrender(
  state: BlackjackGameState,
  playerIndex: number
): BlackjackGameState | Error {
  const validationError = validatePlayerTurn(state, playerIndex);
  if (validationError) return validationError;

  const player = state.players[playerIndex];
  const handIndex = player.currentHandIndex;

  const newState = updatePlayerHand(state, playerIndex, handIndex, (hand) => ({
    ...hand,
    status: 'surrendered' as HandStatus
  }));

  return advanceTurn(newState);
}

function handlePlayerDisconnect(
  state: BlackjackGameState,
  userId: string
): BlackjackGameState | Error {
  const playerIndex = state.players.findIndex(p => p.userId === userId);
  if (playerIndex === -1) {
    return new Error('Player not found');
  }

  const newPlayers = [...state.players];
  const newPlayer = { ...newPlayers[playerIndex] };
  newPlayer.isConnected = false;

  // Auto-stand all hands that are currently 'playing' or 'blackjack'
  // (busted and surrendered hands stay as-is)
  newPlayer.hands = newPlayer.hands.map(hand =>
    (hand.status === 'playing' || hand.status === 'blackjack')
      ? { ...hand, status: 'stood' as HandStatus }
      : { ...hand }
  );

  newPlayers[playerIndex] = newPlayer;

  return {
    ...state,
    players: newPlayers
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate that current player can take action
 */
function validatePlayerTurn(
  state: BlackjackGameState,
  playerIndex: number
): Error | null {
  if (state.phase !== 'player_turn') {
    return new Error('Not in player turn phase');
  }

  if (state.currentPlayerIndex !== playerIndex) {
    return new Error('Not your turn');
  }

  return null;
}

/**
 * Update a specific hand for a player immutably
 */
function updatePlayerHand(
  state: BlackjackGameState,
  playerIndex: number,
  handIndex: number,
  updateFn: (hand: PlayerHand) => PlayerHand
): BlackjackGameState {
  const newPlayers = [...state.players];
  const newPlayer = { ...newPlayers[playerIndex] };
  newPlayer.hands = [...newPlayer.hands];
  newPlayer.hands[handIndex] = updateFn(newPlayer.hands[handIndex]);
  newPlayers[playerIndex] = newPlayer;

  return {
    ...state,
    players: newPlayers
  };
}

/**
 * Update hand status based on current cards
 * Exported for testing edge cases
 */
export function updateHandStatus(hand: PlayerHand): PlayerHand {
  if (hand.status === 'stood' || hand.status === 'surrendered') {
    return hand; // Don't change these statuses
  }

  if (isBlackjack(hand.cards)) {
    return { ...hand, status: 'blackjack' };
  }

  if (isBusted(hand.cards)) {
    return { ...hand, status: 'busted' };
  }

  return hand;
}

function advanceTurn(state: BlackjackGameState): BlackjackGameState {
  const currentPlayer = state.players[state.currentPlayerIndex];

  // Check if current player has more hands to play
  if (currentPlayer.currentHandIndex < currentPlayer.hands.length - 1) {
    const newPlayers = [...state.players];
    const newPlayer = { ...newPlayers[state.currentPlayerIndex] };
    newPlayer.currentHandIndex++;
    newPlayers[state.currentPlayerIndex] = newPlayer;

    return {
      ...state,
      players: newPlayers
    };
  }

  // Move to next player
  const nextPlayerIndex = state.currentPlayerIndex + 1;

  if (nextPlayerIndex >= state.players.length) {
    // All players done, move to dealer turn
    return dealerTurn(state);
  }

  return {
    ...state,
    currentPlayerIndex: nextPlayerIndex
  };
}

function dealerTurn(state: BlackjackGameState): BlackjackGameState {
  // Transition to dealer_turn phase and reveal hole card
  let newState = {
    ...state,
    phase: 'dealer_turn' as BlackjackPhase,
    dealer: {
      ...state.dealer,
      hidden: false // Reveal hole card
    }
  };

  // Auto-play dealer's hand
  let deck = [...newState.deck];
  let dealerCards = [...newState.dealer.cards];

  while (true) {
    const value = getBestValue(dealerCards);

    if (value >= 17) {
      break; // Stand on 17+
    }

    // Hit
    const { dealt, remaining } = dealCards(deck, 1);
    dealerCards = [...dealerCards, ...dealt];
    deck = remaining;
  }

  // Move to settlement
  return {
    ...newState,
    dealer: {
      ...newState.dealer,
      cards: dealerCards
    },
    deck,
    phase: 'settlement'
  };
}
