/**
 * Poker Hand Evaluator
 * Wrapper around poker-evaluator-ts for Texas Hold'em hand evaluation
 */

import { evalHand } from 'poker-evaluator-ts';
import type { Card } from '../cards/types';

/**
 * Hand evaluation result
 */
export interface HandEvaluation {
  rank: number; // 1 (best) to 10 (worst)
  name: string; // German hand name
  value?: number; // Internal comparison value from poker-evaluator-ts
}

/**
 * Best hand result including the actual cards used
 */
export interface BestHandResult extends HandEvaluation {
  cards: Card[];
}

/**
 * Convert our Card type to poker-evaluator-ts format
 * poker-evaluator-ts expects strings like "As", "Kh", "2d", "Tc"
 */
function cardToString(card: Card): string {
  const rankMap: Record<string, string> = {
    'A': 'A',
    'K': 'K',
    'Q': 'Q',
    'J': 'J',
    '10': 'T',
    '9': '9',
    '8': '8',
    '7': '7',
    '6': '6',
    '5': '5',
    '4': '4',
    '3': '3',
    '2': '2'
  };

  const suitMap: Record<string, string> = {
    'hearts': 'h',
    'diamonds': 'd',
    'clubs': 'c',
    'spades': 's'
  };

  return rankMap[card.rank] + suitMap[card.suit];
}

/**
 * Convert poker-evaluator-ts handType to our rank (1-10)
 * poker-evaluator-ts handType: 1 (worst) to 10 (best)
 * Our rank: 1 (best) to 10 (worst)
 */
function convertHandTypeToRank(handType: number): number {
  return 11 - handType;
}

/**
 * Get German hand name from rank
 */
export function getHandName(rank: number): string {
  const names: Record<number, string> = {
    1: 'Royal Flush',
    2: 'Straight Flush',
    3: 'Vierling',
    4: 'Full House',
    5: 'Flush',
    6: 'Straße',
    7: 'Drilling',
    8: 'Zwei Paare',
    9: 'Ein Paar',
    10: 'Höchste Karte'
  };

  return names[rank] || 'Unknown';
}

/**
 * Check if a hand is a royal flush
 * Royal flush is a straight flush with A-K-Q-J-10
 */
function isRoyalFlush(cards: Card[]): boolean {
  const ranks = cards.map(c => c.rank).sort();
  const suits = new Set(cards.map(c => c.suit));

  // Must be all same suit
  if (suits.size !== 1) return false;

  // Must have exactly these ranks
  const royalRanks = ['10', 'J', 'Q', 'K', 'A'].sort();
  return JSON.stringify(ranks) === JSON.stringify(royalRanks);
}

/**
 * Evaluate a poker hand (5 or 7 cards)
 * Returns rank (1 = best, 10 = worst) and name
 */
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error('Hand must have 5-7 cards');
  }

  const cardStrings = cards.map(cardToString);
  const result = evalHand(cardStrings);

  let rank = convertHandTypeToRank(result.handType);

  // Check for royal flush (poker-evaluator-ts doesn't distinguish it)
  if (rank === 2) {
    // It's a straight flush, check if it's royal
    const handCards = cards.length === 5 ? cards : findBestStraightFlush(cards);
    if (handCards && isRoyalFlush(handCards)) {
      rank = 1;
    }
  }

  return {
    rank,
    name: getHandName(rank),
    value: result.value
  };
}

/**
 * Find the straight flush cards from a 7-card hand
 */
function findBestStraightFlush(cards: Card[]): Card[] | null {
  // Group by suit
  const bySuit: Record<string, Card[]> = {};
  for (const card of cards) {
    if (!bySuit[card.suit]) {
      bySuit[card.suit] = [];
    }
    bySuit[card.suit].push(card);
  }

  // Find suit with 5+ cards
  for (const suit in bySuit) {
    if (bySuit[suit].length >= 5) {
      // Check if these cards form a straight
      const suitCards = bySuit[suit];
      const combinations = getCombinations(suitCards, 5);

      for (const combo of combinations) {
        if (isStraight(combo)) {
          return combo;
        }
      }
    }
  }

  return null;
}

/**
 * Check if 5 cards form a straight
 */
function isStraight(cards: Card[]): boolean {
  const rankValues: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };

  const values = cards.map(c => rankValues[c.rank]).sort((a, b) => a - b);

  // Check for normal straight
  let isStraight = true;
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) {
      isStraight = false;
      break;
    }
  }

  if (isStraight) return true;

  // Check for ace-low straight (A-2-3-4-5)
  if (values[0] === 2 && values[1] === 3 && values[2] === 4 && values[3] === 5 && values[4] === 14) {
    return true;
  }

  return false;
}

/**
 * Compare two hands
 * Returns:
 *  1 if handA wins
 * -1 if handB wins
 *  0 if tie
 */
export function compareHands(handA: Card[], handB: Card[]): -1 | 0 | 1 {
  const resultA = evaluateHand(handA);
  const resultB = evaluateHand(handB);

  // Lower rank is better (1 is best)
  if (resultA.rank < resultB.rank) return 1;
  if (resultA.rank > resultB.rank) return -1;

  // Same hand type, compare by value (higher value is better)
  if (resultA.value! > resultB.value!) return 1;
  if (resultA.value! < resultB.value!) return -1;

  return 0;
}

/**
 * Find the best 5-card hand from hole cards and community cards
 * Evaluates all possible 5-card combinations and returns the best one
 */
export function findBestHand(holeCards: Card[], communityCards: Card[]): BestHandResult {
  const allCards = [...holeCards, ...communityCards];

  if (allCards.length < 5) {
    throw new Error('Need at least 5 cards total');
  }

  // If exactly 5 cards, just evaluate them
  if (allCards.length === 5) {
    const result = evaluateHand(allCards);
    return {
      ...result,
      cards: allCards
    };
  }

  // Generate all 5-card combinations and find the best
  const combinations = getCombinations(allCards, 5);
  let bestHand: BestHandResult | null = null;

  for (const combo of combinations) {
    const result = evaluateHand(combo);

    if (!bestHand || result.rank < bestHand.rank || (result.rank === bestHand.rank && result.value! > bestHand.value!)) {
      bestHand = {
        ...result,
        cards: combo
      };
    }
  }

  return bestHand!;
}

/**
 * Generate all k-combinations from an array
 */
function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 1) return arr.map(item => [item]);
  if (k === arr.length) return [arr];

  const results: T[][] = [];

  for (let i = 0; i <= arr.length - k; i++) {
    const head = arr[i];
    const tailCombs = getCombinations(arr.slice(i + 1), k - 1);

    for (const tailComb of tailCombs) {
      results.push([head, ...tailComb]);
    }
  }

  return results;
}
