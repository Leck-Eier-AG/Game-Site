/**
 * Texas Hold'em Poker State Machine
 * Pure functions following project conventions (return Error, not throw)
 */

import type { Card } from '../cards/types';
import { dealCards } from '../cards/deck';
import { compareHands, findBestHand } from './hand-evaluator';

export type PokerPhase =
  | 'waiting'
  | 'blinds'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'hand_end'
  | 'game_end';

export interface PokerPlayer {
  userId: string;
  displayName: string;
  holeCards: Card[];
  chips: number;
  currentBet: number;
  totalBetInHand: number;
  isFolded: boolean;
  isAllIn: boolean;
  isConnected: boolean;
  seatIndex: number;
  isSittingOut: boolean;
}

export interface PokerSettings {
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
  blindEscalation: boolean;
  blindInterval: number;
  turnTimer: number;
}

export interface PokerGameState {
  phase: PokerPhase;
  players: PokerPlayer[];
  communityCards: Card[];
  deck: Card[];
  pot: number;
  currentBet: number;
  dealerIndex: number;
  activePlayerIndex: number;
  handNumber: number;
  blinds: { small: number; big: number };
  blindEscalation: boolean;
  blindInterval: number;
  lastBlindIncrease: number;
  settings: PokerSettings;
  lastRaiseAmount: number; // Track last raise for minimum raise
  lastAggressorIndex: number; // Track last player to raise/bet
}

export type PokerAction =
  | { type: 'POST_BLINDS' }
  | { type: 'FOLD' }
  | { type: 'CHECK' }
  | { type: 'CALL' }
  | { type: 'RAISE'; amount: number }
  | { type: 'ALL_IN' }
  | { type: 'PLAYER_DISCONNECT'; userId: string };

/**
 * Create initial poker state
 */
export function createPokerState(
  players: Array<{ userId: string; displayName: string }>,
  settings: PokerSettings,
  deck: Card[]
): PokerGameState {
  const pokerPlayers: PokerPlayer[] = players.map((p, index) => ({
    userId: p.userId,
    displayName: p.displayName,
    holeCards: [],
    chips: settings.startingChips,
    currentBet: 0,
    totalBetInHand: 0,
    isFolded: false,
    isAllIn: false,
    isConnected: true,
    seatIndex: index,
    isSittingOut: false
  }));

  return {
    phase: 'blinds',
    players: pokerPlayers,
    communityCards: [],
    deck,
    pot: 0,
    currentBet: 0,
    dealerIndex: 0,
    activePlayerIndex: 0,
    handNumber: 1,
    blinds: { small: settings.smallBlind, big: settings.bigBlind },
    blindEscalation: settings.blindEscalation,
    blindInterval: settings.blindInterval,
    lastBlindIncrease: 0,
    settings,
    lastRaiseAmount: settings.bigBlind,
    lastAggressorIndex: -1
  };
}

/**
 * Apply a poker action to the state
 */
export function applyPokerAction(
  state: PokerGameState,
  action: PokerAction,
  userId: string
): PokerGameState | Error {
  switch (action.type) {
    case 'POST_BLINDS':
      return handlePostBlinds(state);

    case 'FOLD':
      return handleFold(state, userId);

    case 'CHECK':
      return handleCheck(state, userId);

    case 'CALL':
      return handleCall(state, userId);

    case 'RAISE':
      return handleRaise(state, userId, action.amount);

    case 'ALL_IN':
      return handleAllIn(state, userId);

    case 'PLAYER_DISCONNECT':
      return handlePlayerDisconnect(state, action.userId);

    default:
      return new Error('Unknown action type');
  }
}

/**
 * Handle posting blinds
 */
function handlePostBlinds(state: PokerGameState): PokerGameState | Error {
  if (state.phase !== 'blinds') {
    return new Error('Not in blinds phase');
  }

  const newPlayers = [...state.players];
  const playerCount = newPlayers.length;

  // Determine small blind and big blind positions
  let smallBlindIndex: number;
  let bigBlindIndex: number;

  if (playerCount === 2) {
    // Heads-up: dealer posts small blind
    smallBlindIndex = state.dealerIndex;
    bigBlindIndex = (state.dealerIndex + 1) % playerCount;
  } else {
    // Multi-player: small blind left of dealer, big blind left of small blind
    smallBlindIndex = (state.dealerIndex + 1) % playerCount;
    bigBlindIndex = (state.dealerIndex + 2) % playerCount;
  }

  // Post small blind
  const smallBlindAmount = Math.min(state.blinds.small, newPlayers[smallBlindIndex].chips);
  newPlayers[smallBlindIndex] = {
    ...newPlayers[smallBlindIndex],
    chips: newPlayers[smallBlindIndex].chips - smallBlindAmount,
    currentBet: smallBlindAmount,
    totalBetInHand: smallBlindAmount
  };

  // Post big blind
  const bigBlindAmount = Math.min(state.blinds.big, newPlayers[bigBlindIndex].chips);
  newPlayers[bigBlindIndex] = {
    ...newPlayers[bigBlindIndex],
    chips: newPlayers[bigBlindIndex].chips - bigBlindAmount,
    currentBet: bigBlindAmount,
    totalBetInHand: bigBlindAmount
  };

  // Deal hole cards (2 per player)
  let remainingDeck = [...state.deck];
  for (let i = 0; i < newPlayers.length; i++) {
    const { dealt, remaining } = dealCards(remainingDeck, 2);
    newPlayers[i] = {
      ...newPlayers[i],
      holeCards: dealt
    };
    remainingDeck = remaining;
  }

  // Determine first to act (left of big blind)
  const firstToAct = (bigBlindIndex + 1) % playerCount;

  return {
    ...state,
    phase: 'preflop',
    players: newPlayers,
    deck: remainingDeck,
    pot: smallBlindAmount + bigBlindAmount,
    currentBet: bigBlindAmount,
    activePlayerIndex: firstToAct,
    lastRaiseAmount: state.blinds.big,
    lastAggressorIndex: bigBlindIndex
  };
}

/**
 * Handle fold action
 */
function handleFold(state: PokerGameState, userId: string): PokerGameState | Error {
  if (!isBettingPhase(state.phase)) {
    return new Error('Cannot fold in this phase');
  }

  const playerIndex = state.players.findIndex(p => p.userId === userId);
  if (playerIndex === -1) {
    return new Error('Player not found');
  }

  if (playerIndex !== state.activePlayerIndex) {
    return new Error('Not your turn');
  }

  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    isFolded: true
  };

  // Check if only one player left (all others folded)
  const activePlayers = newPlayers.filter(p => !p.isFolded);
  if (activePlayers.length === 1) {
    return handleLastPlayerStanding({
      ...state,
      players: newPlayers
    });
  }

  return advanceAction({
    ...state,
    players: newPlayers
  });
}

/**
 * Handle check action
 */
function handleCheck(state: PokerGameState, userId: string): PokerGameState | Error {
  if (!isBettingPhase(state.phase)) {
    return new Error('Cannot check in this phase');
  }

  const playerIndex = state.players.findIndex(p => p.userId === userId);
  if (playerIndex === -1) {
    return new Error('Player not found');
  }

  if (playerIndex !== state.activePlayerIndex) {
    return new Error('Not your turn');
  }

  const player = state.players[playerIndex];

  // Can only check if current bet equals player's current bet
  if (state.currentBet > player.currentBet) {
    return new Error('You cannot check - there is an outstanding bet');
  }

  return advanceAction(state);
}

/**
 * Handle call action
 */
function handleCall(state: PokerGameState, userId: string): PokerGameState | Error {
  if (!isBettingPhase(state.phase)) {
    return new Error('Cannot call in this phase');
  }

  const playerIndex = state.players.findIndex(p => p.userId === userId);
  if (playerIndex === -1) {
    return new Error('Player not found');
  }

  if (playerIndex !== state.activePlayerIndex) {
    return new Error('Not your turn');
  }

  const player = state.players[playerIndex];
  const callAmount = state.currentBet - player.currentBet;

  if (callAmount > player.chips) {
    return new Error('Insufficient chips - use ALL_IN instead');
  }

  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    chips: player.chips - callAmount,
    currentBet: player.currentBet + callAmount,
    totalBetInHand: player.totalBetInHand + callAmount
  };

  const newState: PokerGameState = {
    ...state,
    players: newPlayers,
    pot: state.pot + callAmount
  };

  return advanceAction(newState);
}

/**
 * Handle raise action
 */
function handleRaise(state: PokerGameState, userId: string, raiseAmount: number): PokerGameState | Error {
  if (!isBettingPhase(state.phase)) {
    return new Error('Cannot raise in this phase');
  }

  const playerIndex = state.players.findIndex(p => p.userId === userId);
  if (playerIndex === -1) {
    return new Error('Player not found');
  }

  if (playerIndex !== state.activePlayerIndex) {
    return new Error('Not your turn');
  }

  const player = state.players[playerIndex];

  // Calculate minimum raise (at least previous raise amount)
  const minimumRaise = state.currentBet + state.lastRaiseAmount;

  if (raiseAmount < minimumRaise) {
    return new Error(`Minimum raise is ${minimumRaise}`);
  }

  if (raiseAmount > player.chips + player.currentBet) {
    return new Error('Insufficient chips');
  }

  const additionalChips = raiseAmount - player.currentBet;
  const actualRaiseAmount = raiseAmount - state.currentBet;

  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    chips: player.chips - additionalChips,
    currentBet: raiseAmount,
    totalBetInHand: player.totalBetInHand + additionalChips
  };

  const newState: PokerGameState = {
    ...state,
    players: newPlayers,
    pot: state.pot + additionalChips,
    currentBet: raiseAmount,
    lastRaiseAmount: actualRaiseAmount,
    lastAggressorIndex: playerIndex
  };

  return advanceAction(newState);
}

/**
 * Handle all-in action
 */
function handleAllIn(state: PokerGameState, userId: string): PokerGameState | Error {
  if (!isBettingPhase(state.phase)) {
    return new Error('Cannot go all-in in this phase');
  }

  const playerIndex = state.players.findIndex(p => p.userId === userId);
  if (playerIndex === -1) {
    return new Error('Player not found');
  }

  if (playerIndex !== state.activePlayerIndex) {
    return new Error('Not your turn');
  }

  const player = state.players[playerIndex];
  const allInAmount = player.chips + player.currentBet;

  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    chips: 0,
    currentBet: allInAmount,
    totalBetInHand: player.totalBetInHand + player.chips,
    isAllIn: true
  };

  const newCurrentBet = Math.max(state.currentBet, allInAmount);

  const newState: PokerGameState = {
    ...state,
    players: newPlayers,
    pot: state.pot + player.chips,
    currentBet: newCurrentBet
  };

  return advanceAction(newState);
}

/**
 * Handle player disconnect
 */
function handlePlayerDisconnect(state: PokerGameState, userId: string): PokerGameState | Error {
  const playerIndex = state.players.findIndex(p => p.userId === userId);
  if (playerIndex === -1) {
    return new Error('Player not found');
  }

  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    isConnected: false,
    isFolded: true
  };

  // Check if only one player left
  const activePlayers = newPlayers.filter(p => !p.isFolded);
  if (activePlayers.length === 1) {
    return handleLastPlayerStanding({
      ...state,
      players: newPlayers
    });
  }

  // If it was this player's turn, advance
  if (state.activePlayerIndex === playerIndex) {
    return advanceAction({
      ...state,
      players: newPlayers
    });
  }

  return {
    ...state,
    players: newPlayers
  };
}

/**
 * Advance to next action in betting round
 */
function advanceAction(state: PokerGameState): PokerGameState | Error {
  // Find next active player
  let nextIndex = (state.activePlayerIndex + 1) % state.players.length;
  let foundActivePlayer = false;

  const startIndex = nextIndex;
  do {
    const player = state.players[nextIndex];
    if (!player.isFolded && !player.isAllIn) {
      foundActivePlayer = true;
      break;
    }
    nextIndex = (nextIndex + 1) % state.players.length;
  } while (nextIndex !== startIndex);

  // Check if betting round is complete
  if (isBettingRoundComplete(state, nextIndex)) {
    return advancePhase({
      ...state,
      activePlayerIndex: nextIndex
    });
  }

  return {
    ...state,
    activePlayerIndex: nextIndex
  };
}

/**
 * Check if betting round is complete
 * Round is complete when all active players have acted and bets are equalized
 */
function isBettingRoundComplete(state: PokerGameState, nextActiveIndex: number): boolean {
  const activePlayers = state.players.filter(p => !p.isFolded && !p.isAllIn);

  if (activePlayers.length === 0) {
    return true; // All players all-in or folded
  }

  if (activePlayers.length === 1) {
    return true; // Only one player can act, round is complete
  }

  // Check if all active players have matching bets
  const currentBet = state.currentBet;
  const allBetsEqual = activePlayers.every(p => p.currentBet === currentBet);

  if (!allBetsEqual) {
    return false; // Bets not equalized yet
  }

  // Bets are equal - check if action has completed the circle
  // Round is complete when we've cycled back to the last aggressor (or past them)
  if (state.lastAggressorIndex === -1) {
    // No aggressor yet (all checks), complete when we cycle back to first to act
    // In post-flop, first to act is left of dealer
    const firstToAct = getFirstToActPostFlop(state);
    return nextActiveIndex === firstToAct;
  }

  // Round complete when we've cycled back to (or past) the last aggressor
  // Exception: in preflop, big blind gets option to raise even if just called
  if (state.phase === 'preflop' && state.lastAggressorIndex !== -1) {
    const playerCount = state.players.length;
    const bigBlindIndex = playerCount === 2
      ? (state.dealerIndex + 1) % playerCount
      : (state.dealerIndex + 2) % playerCount;

    // If last aggressor is big blind and current bet is still just big blind
    if (state.lastAggressorIndex === bigBlindIndex && currentBet === state.blinds.big) {
      // Round not complete until big blind has had a chance to act (check or raise)
      // We know they already have currentBet === big blind from posting
      // So round is complete only after they've acted (checked/raised)
      // This happens when action moves past them
      const bbActedAgain = nextActiveIndex !== bigBlindIndex;
      return bbActedAgain;
    }
  }

  if (state.lastAggressorIndex === -1) {
    // No aggressor (all checks), complete when back to first position
    return true;
  }

  return nextActiveIndex === state.lastAggressorIndex ||
         (state.players[state.lastAggressorIndex].isFolded || state.players[state.lastAggressorIndex].isAllIn);
}

/**
 * Advance to next phase
 */
function advancePhase(state: PokerGameState): PokerGameState | Error {
  // Reset player bets for new round
  const newPlayers = state.players.map(p => ({
    ...p,
    currentBet: 0
  }));

  let newState: PokerGameState = {
    ...state,
    players: newPlayers,
    currentBet: 0,
    lastRaiseAmount: state.blinds.big,
    lastAggressorIndex: -1
  };

  // Determine next phase
  switch (state.phase) {
    case 'preflop':
      // Deal flop (3 cards)
      const { dealt: flopCards, remaining: deckAfterFlop } = dealCards(state.deck, 3);
      newState = {
        ...newState,
        phase: 'flop',
        communityCards: flopCards,
        deck: deckAfterFlop,
        activePlayerIndex: getFirstToActPostFlop(newState)
      };
      break;

    case 'flop':
      // Deal turn (1 card)
      const { dealt: turnCards, remaining: deckAfterTurn } = dealCards(state.deck, 1);
      newState = {
        ...newState,
        phase: 'turn',
        communityCards: [...state.communityCards, ...turnCards],
        deck: deckAfterTurn,
        activePlayerIndex: getFirstToActPostFlop(newState)
      };
      break;

    case 'turn':
      // Deal river (1 card)
      const { dealt: riverCards, remaining: deckAfterRiver } = dealCards(state.deck, 1);
      newState = {
        ...newState,
        phase: 'river',
        communityCards: [...state.communityCards, ...riverCards],
        deck: deckAfterRiver,
        activePlayerIndex: getFirstToActPostFlop(newState)
      };
      break;

    case 'river':
      // Go to showdown
      return handleShowdown(newState);

    default:
      return new Error(`Cannot advance from phase ${state.phase}`);
  }

  return newState;
}

/**
 * Get first to act after flop (left of dealer)
 */
function getFirstToActPostFlop(state: PokerGameState): number {
  let index = (state.dealerIndex + 1) % state.players.length;
  const startIndex = index;

  do {
    const player = state.players[index];
    if (!player.isFolded && !player.isAllIn) {
      return index;
    }
    index = (index + 1) % state.players.length;
  } while (index !== startIndex);

  return index;
}

/**
 * Handle showdown
 */
function handleShowdown(state: PokerGameState): PokerGameState | Error {
  const activePlayers = state.players.filter(p => !p.isFolded);

  if (activePlayers.length === 0) {
    return new Error('No active players for showdown');
  }

  if (activePlayers.length === 1) {
    return handleLastPlayerStanding(state);
  }

  // Evaluate all hands
  const evaluatedPlayers = activePlayers.map(player => {
    const bestHand = findBestHand(player.holeCards, state.communityCards);
    return {
      player,
      hand: bestHand
    };
  });

  // Find winner(s)
  let winners = [evaluatedPlayers[0]];

  for (let i = 1; i < evaluatedPlayers.length; i++) {
    const comparison = compareHands(
      evaluatedPlayers[i].hand.cards,
      winners[0].hand.cards
    );

    if (comparison === 1) {
      // New winner
      winners = [evaluatedPlayers[i]];
    } else if (comparison === 0) {
      // Tie
      winners.push(evaluatedPlayers[i]);
    }
  }

  // Award pot (split if multiple winners)
  const potShare = Math.floor(state.pot / winners.length);
  const newPlayers = [...state.players];

  for (const winner of winners) {
    const index = newPlayers.findIndex(p => p.userId === winner.player.userId);
    newPlayers[index] = {
      ...newPlayers[index],
      chips: newPlayers[index].chips + potShare
    };
  }

  return {
    ...state,
    phase: 'showdown',
    players: newPlayers,
    pot: 0
  };
}

/**
 * Handle last player standing (all others folded)
 */
function handleLastPlayerStanding(state: PokerGameState): PokerGameState {
  const winner = state.players.find(p => !p.isFolded);

  if (!winner) {
    // This shouldn't happen, but handle gracefully
    return {
      ...state,
      phase: 'hand_end'
    };
  }

  const newPlayers = [...state.players];
  const winnerIndex = newPlayers.findIndex(p => p.userId === winner.userId);
  newPlayers[winnerIndex] = {
    ...newPlayers[winnerIndex],
    chips: newPlayers[winnerIndex].chips + state.pot
  };

  // Rotate dealer
  const newDealerIndex = (state.dealerIndex + 1) % state.players.length;

  // Check if blinds should escalate
  let newBlinds = state.blinds;
  let newLastBlindIncrease = state.lastBlindIncrease;

  if (state.blindEscalation && state.blindInterval > 0) {
    if (state.handNumber - state.lastBlindIncrease >= state.blindInterval) {
      // Escalate blinds (double them)
      newBlinds = {
        small: state.blinds.small * 2,
        big: state.blinds.big * 2
      };
      newLastBlindIncrease = state.handNumber;
    }
  }

  return {
    ...state,
    phase: 'hand_end',
    players: newPlayers,
    pot: 0,
    dealerIndex: newDealerIndex,
    blinds: newBlinds,
    lastBlindIncrease: newLastBlindIncrease
  };
}

/**
 * Check if phase is a betting phase
 */
function isBettingPhase(phase: PokerPhase): boolean {
  return ['preflop', 'flop', 'turn', 'river'].includes(phase);
}
