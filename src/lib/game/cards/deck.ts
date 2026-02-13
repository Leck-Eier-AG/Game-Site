/**
 * Deck creation and cryptographic shuffle utilities
 * Uses node:crypto randomInt for CSPRNG (same pattern as crypto-rng.ts)
 */

import { randomInt } from 'node:crypto';
import type { Card } from './types';
import { RANKS, SUITS } from './types';

/**
 * Creates a standard 52-card deck
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/**
 * Creates multiple decks combined (for blackjack 6-deck shoe)
 */
export function createMultiDeck(count: number): Card[] {
  const multiDeck: Card[] = [];
  for (let i = 0; i < count; i++) {
    multiDeck.push(...createDeck());
  }
  return multiDeck;
}

/**
 * Fisher-Yates shuffle with crypto.randomInt for unbiased random distribution
 * Returns new array (pure function)
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Deal cards from top of deck
 * Returns dealt cards and remaining deck
 */
export function dealCards(deck: Card[], count: number): { dealt: Card[]; remaining: Card[] } {
  const dealt = deck.slice(0, count);
  const remaining = deck.slice(count);
  return { dealt, remaining };
}
