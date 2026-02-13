/**
 * Engine Blackjack Wrapper
 * Thin wrapper around engine-blackjack npm library
 * Adapts single-player engine to our multiplayer card types
 */

import type { Card, Rank } from '../cards/types';

// We'll implement hand value calculation ourselves since engine-blackjack
// uses a different card format. Our implementation handles Ace flexibility.

/**
 * Get numeric value for a rank
 */
function getRankValue(rank: Rank): number {
  if (rank === 'A') return 1; // Ace treated as 1, with hi/lo logic later
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return parseInt(rank, 10);
}

/**
 * Calculate hand value (returns both high and low for Aces)
 * Follows engine-blackjack's calculate() pattern
 */
export function calculateHandValue(cards: Card[]): { hi: number; lo: number } {
  if (cards.length === 0) {
    return { hi: 0, lo: 0 };
  }

  if (cards.length === 1) {
    const value = getRankValue(cards[0].rank);
    return {
      hi: value === 1 ? 11 : value,
      lo: value === 1 ? 1 : value
    };
  }

  // Count aces and calculate base value
  const aces: number[] = [];
  let baseValue = 0;

  for (const card of cards) {
    const value = getRankValue(card.rank);
    if (value === 1) {
      aces.push(1);
    } else {
      baseValue += value;
    }
  }

  // If no aces, hi and lo are the same
  if (aces.length === 0) {
    return { hi: baseValue, lo: baseValue };
  }

  // Try to use aces as 11 optimally
  let hi = baseValue;
  let lo = baseValue;

  for (let i = 0; i < aces.length; i++) {
    if (i === 0 && hi + 11 <= 21) {
      hi += 11; // First ace as 11 if it doesn't bust
      lo += 1;
    } else {
      hi += 1;
      lo += 1;
    }
  }

  // If hi busted but lo is valid, use lo for hi too
  if (hi > 21 && lo <= 21) {
    hi = lo;
  }

  return { hi, lo };
}

/**
 * Check if hand is blackjack (Ace + 10-value card, exactly 2 cards)
 */
export function isBlackjack(cards: Card[]): boolean {
  if (cards.length !== 2) return false;

  const values = calculateHandValue(cards);
  return values.hi === 21;
}

/**
 * Check if hand is busted (>21)
 */
export function isBusted(cards: Card[]): boolean {
  const values = calculateHandValue(cards);
  return values.hi > 21 && values.lo > 21;
}

/**
 * Get the best value for a hand (prefer hi if <= 21, otherwise lo)
 */
export function getBestValue(cards: Card[]): number {
  const values = calculateHandValue(cards);
  return values.hi <= 21 ? values.hi : values.lo;
}

/**
 * Check if two cards are a pair (same rank)
 */
export function isPair(cards: Card[]): boolean {
  if (cards.length !== 2) return false;
  return cards[0].rank === cards[1].rank;
}

/**
 * Get available actions for a hand given dealer's up card
 * This implements blackjack action availability rules
 */
export function getAvailableActions(
  hand: Card[],
  dealerUpCard: Card,
  options: {
    isInitialHand?: boolean;
    isSplitHand?: boolean;
    allowDouble?: boolean;
    allowSplit?: boolean;
    allowInsurance?: boolean;
    allowSurrender?: boolean;
  } = {}
): {
  hit: boolean;
  stand: boolean;
  double: boolean;
  split: boolean;
  insurance: boolean;
  surrender: boolean;
} {
  const {
    isInitialHand = false,
    isSplitHand = false,
    allowDouble = true,
    allowSplit = true,
    allowInsurance = true,
    allowSurrender = true
  } = options;

  const blackjack = isBlackjack(hand);
  const busted = isBusted(hand);
  const dealerShowsAce = dealerUpCard.rank === 'A';

  // If hand is done (blackjack or busted), no actions available
  if (blackjack || busted) {
    return {
      hit: false,
      stand: false,
      double: false,
      split: false,
      insurance: false,
      surrender: false
    };
  }

  return {
    hit: true,
    stand: true,
    double: allowDouble && hand.length === 2 && !isSplitHand,
    split: allowSplit && isPair(hand) && isInitialHand && !isSplitHand,
    insurance: allowInsurance && dealerShowsAce && isInitialHand,
    surrender: allowSurrender && isInitialHand && !isSplitHand
  };
}

/**
 * Create a blackjack engine config
 * This provides standard blackjack rules for our game
 */
export function createBlackjackEngine(config: {
  decks: number;
  standOnSoft17: boolean;
  double: 'any' | 'none' | '9or10' | '9or10or11' | '9thru15';
  split: boolean;
  doubleAfterSplit: boolean;
  surrender: boolean;
  insurance: boolean;
}) {
  return config; // For now, we just return the config since we implement logic ourselves
}
