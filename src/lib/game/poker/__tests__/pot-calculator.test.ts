/**
 * Poker Pot Calculator Tests
 * Side pot calculation is the most error-prone part of poker implementation
 */

import { calculateSidePots, distributePots, type Pot, type PlayerContribution } from '../pot-calculator';

describe('calculateSidePots', () => {
  describe('Simple scenarios', () => {
    test('2 players, no all-in: single pot, winner takes all', () => {
      const contributions: PlayerContribution[] = [
        { userId: 'p1', amount: 100, isFolded: false },
        { userId: 'p2', amount: 100, isFolded: false }
      ];

      const pots = calculateSidePots(contributions);

      expect(pots).toHaveLength(1);
      expect(pots[0]).toEqual({
        amount: 200,
        eligiblePlayerIds: ['p1', 'p2']
      });
    });

    test('2 players, one all-in: main pot at all-in level, excess returned', () => {
      const contributions: PlayerContribution[] = [
        { userId: 'p1', amount: 50, isFolded: false }, // all-in
        { userId: 'p2', amount: 100, isFolded: false }
      ];

      const pots = calculateSidePots(contributions);

      expect(pots).toHaveLength(2);
      expect(pots[0]).toEqual({
        amount: 100, // 2 × 50
        eligiblePlayerIds: ['p1', 'p2']
      });
      expect(pots[1]).toEqual({
        amount: 50, // excess returned to p2
        eligiblePlayerIds: ['p2']
      });
    });

    test('all players fold except one: single pot with one eligible', () => {
      const contributions: PlayerContribution[] = [
        { userId: 'p1', amount: 50, isFolded: true },
        { userId: 'p2', amount: 75, isFolded: false },
        { userId: 'p3', amount: 50, isFolded: true }
      ];

      const pots = calculateSidePots(contributions);

      expect(pots).toHaveLength(2);
      expect(pots[0]).toEqual({
        amount: 150, // 3 × 50
        eligiblePlayerIds: ['p2'] // only non-folded
      });
      expect(pots[1]).toEqual({
        amount: 25, // 75 - 50
        eligiblePlayerIds: ['p2']
      });
    });

    test('zero contribution player (folded preflop)', () => {
      const contributions: PlayerContribution[] = [
        { userId: 'p1', amount: 0, isFolded: true },
        { userId: 'p2', amount: 100, isFolded: false },
        { userId: 'p3', amount: 100, isFolded: false }
      ];

      const pots = calculateSidePots(contributions);

      expect(pots).toHaveLength(1);
      expect(pots[0]).toEqual({
        amount: 200,
        eligiblePlayerIds: ['p2', 'p3']
      });
    });
  });

  describe('Multi-player with one all-in', () => {
    test('3 players, one all-in with smallest stack', () => {
      const contributions: PlayerContribution[] = [
        { userId: 'p1', amount: 30, isFolded: false }, // all-in
        { userId: 'p2', amount: 100, isFolded: false },
        { userId: 'p3', amount: 100, isFolded: false }
      ];

      const pots = calculateSidePots(contributions);

      expect(pots).toHaveLength(2);
      // Main pot: all 3 players contribute 30
      expect(pots[0]).toEqual({
        amount: 90, // 3 × 30
        eligiblePlayerIds: ['p1', 'p2', 'p3']
      });
      // Side pot: remaining 2 players contribute 70 each
      expect(pots[1]).toEqual({
        amount: 140, // 2 × 70
        eligiblePlayerIds: ['p2', 'p3']
      });
    });

    test('4 players, one all-in, others continue', () => {
      const contributions: PlayerContribution[] = [
        { userId: 'p1', amount: 20, isFolded: false }, // all-in
        { userId: 'p2', amount: 50, isFolded: false },
        { userId: 'p3', amount: 50, isFolded: false },
        { userId: 'p4', amount: 50, isFolded: false }
      ];

      const pots = calculateSidePots(contributions);

      expect(pots).toHaveLength(2);
      expect(pots[0]).toEqual({
        amount: 80, // 4 × 20
        eligiblePlayerIds: ['p1', 'p2', 'p3', 'p4']
      });
      expect(pots[1]).toEqual({
        amount: 90, // 3 × 30
        eligiblePlayerIds: ['p2', 'p3', 'p4']
      });
    });
  });

  describe('Multi-player with multiple all-ins', () => {
    test('3 players, two all-in at different levels', () => {
      const contributions: PlayerContribution[] = [
        { userId: 'p1', amount: 30, isFolded: false }, // smallest all-in
        { userId: 'p2', amount: 70, isFolded: false }, // medium all-in
        { userId: 'p3', amount: 150, isFolded: false } // largest
      ];

      const pots = calculateSidePots(contributions);

      expect(pots).toHaveLength(3);
      // Main pot: all 3 × 30
      expect(pots[0]).toEqual({
        amount: 90,
        eligiblePlayerIds: ['p1', 'p2', 'p3']
      });
      // Side pot 1: 2 players × 40
      expect(pots[1]).toEqual({
        amount: 80,
        eligiblePlayerIds: ['p2', 'p3']
      });
      // Side pot 2: 1 player × 80 (excess returned)
      expect(pots[2]).toEqual({
        amount: 80,
        eligiblePlayerIds: ['p3']
      });
    });

    test('4 players with varying stacks all-in', () => {
      const contributions: PlayerContribution[] = [
        { userId: 'p1', amount: 10, isFolded: false },
        { userId: 'p2', amount: 30, isFolded: false },
        { userId: 'p3', amount: 60, isFolded: false },
        { userId: 'p4', amount: 100, isFolded: false }
      ];

      const pots = calculateSidePots(contributions);

      expect(pots).toHaveLength(4);
      expect(pots[0]).toEqual({
        amount: 40, // 4 × 10
        eligiblePlayerIds: ['p1', 'p2', 'p3', 'p4']
      });
      expect(pots[1]).toEqual({
        amount: 60, // 3 × 20
        eligiblePlayerIds: ['p2', 'p3', 'p4']
      });
      expect(pots[2]).toEqual({
        amount: 60, // 2 × 30
        eligiblePlayerIds: ['p3', 'p4']
      });
      expect(pots[3]).toEqual({
        amount: 40, // 1 × 40
        eligiblePlayerIds: ['p4']
      });

      // Conservation check
      const totalPot = pots.reduce((sum, pot) => sum + pot.amount, 0);
      const totalContributions = contributions.reduce((sum, c) => sum + c.amount, 0);
      expect(totalPot).toBe(totalContributions);
    });

    test('9 players with 5 different all-in levels (stress test)', () => {
      const contributions: PlayerContribution[] = [
        { userId: 'p1', amount: 10, isFolded: false },
        { userId: 'p2', amount: 10, isFolded: false },
        { userId: 'p3', amount: 25, isFolded: false },
        { userId: 'p4', amount: 25, isFolded: false },
        { userId: 'p5', amount: 50, isFolded: false },
        { userId: 'p6', amount: 75, isFolded: false },
        { userId: 'p7', amount: 100, isFolded: false },
        { userId: 'p8', amount: 100, isFolded: false },
        { userId: 'p9', amount: 150, isFolded: false }
      ];

      const pots = calculateSidePots(contributions);

      // Should create pots at levels: 10, 25, 50, 75, 100, 150
      expect(pots.length).toBeGreaterThanOrEqual(5);

      // Conservation check
      const totalPot = pots.reduce((sum, pot) => sum + pot.amount, 0);
      const totalContributions = contributions.reduce((sum, c) => sum + c.amount, 0);
      expect(totalPot).toBe(totalContributions);

      // First pot should have all 9 players
      expect(pots[0].eligiblePlayerIds).toHaveLength(9);

      // Last pot should have only 1 player
      expect(pots[pots.length - 1].eligiblePlayerIds).toHaveLength(1);
    });
  });

  describe('Folded players', () => {
    test('folded player contributions included in pot but NOT eligible', () => {
      const contributions: PlayerContribution[] = [
        { userId: 'p1', amount: 50, isFolded: false },
        { userId: 'p2', amount: 100, isFolded: true }, // folded but contributed
        { userId: 'p3', amount: 100, isFolded: false }
      ];

      const pots = calculateSidePots(contributions);

      expect(pots).toHaveLength(2);
      // Main pot includes folded player's contribution
      expect(pots[0]).toEqual({
        amount: 150, // 3 × 50
        eligiblePlayerIds: ['p1', 'p3'] // p2 NOT eligible
      });
      expect(pots[1]).toEqual({
        amount: 100, // 2 × 50
        eligiblePlayerIds: ['p3'] // only p3 eligible
      });
    });

    test('multiple folded players with different contributions', () => {
      const contributions: PlayerContribution[] = [
        { userId: 'p1', amount: 20, isFolded: true },
        { userId: 'p2', amount: 50, isFolded: false },
        { userId: 'p3', amount: 50, isFolded: true },
        { userId: 'p4', amount: 100, isFolded: false }
      ];

      const pots = calculateSidePots(contributions);

      expect(pots).toHaveLength(3);
      expect(pots[0].eligiblePlayerIds).toEqual(['p2', 'p4']); // no folded players
      expect(pots[1].eligiblePlayerIds).toEqual(['p2', 'p4']); // no folded players
      expect(pots[2].eligiblePlayerIds).toEqual(['p4']); // only p4
    });
  });
});

describe('distributePots', () => {
  test('single pot, clear winner', () => {
    const pots: Pot[] = [
      { amount: 200, eligiblePlayerIds: ['p1', 'p2'] }
    ];

    const handRankings = new Map<string, number>([
      ['p1', 1000], // better hand
      ['p2', 500]
    ]);

    const winnings = distributePots(pots, handRankings);

    expect(winnings.get('p1')).toBe(200);
    expect(winnings.get('p2')).toBeUndefined();
  });

  test('single pot, tie: split evenly, remainder to first', () => {
    const pots: Pot[] = [
      { amount: 101, eligiblePlayerIds: ['p1', 'p2'] }
    ];

    const handRankings = new Map<string, number>([
      ['p1', 1000],
      ['p2', 1000] // tie
    ]);

    const winnings = distributePots(pots, handRankings);

    // 101 / 2 = 50.5 → p1 gets 51, p2 gets 50
    expect(winnings.get('p1')).toBe(51);
    expect(winnings.get('p2')).toBe(50);
  });

  test('side pots: different winners for main and side pot', () => {
    const pots: Pot[] = [
      { amount: 90, eligiblePlayerIds: ['p1', 'p2', 'p3'] },
      { amount: 140, eligiblePlayerIds: ['p2', 'p3'] }
    ];

    const handRankings = new Map<string, number>([
      ['p1', 800], // wins main pot
      ['p2', 500],
      ['p3', 1000] // wins side pot
    ]);

    const winnings = distributePots(pots, handRankings);

    expect(winnings.get('p1')).toBe(90); // main pot
    expect(winnings.get('p3')).toBe(140); // side pot
    expect(winnings.get('p2')).toBeUndefined();
  });

  test('multiple pots with ties', () => {
    const pots: Pot[] = [
      { amount: 120, eligiblePlayerIds: ['p1', 'p2', 'p3'] },
      { amount: 60, eligiblePlayerIds: ['p2', 'p3'] }
    ];

    const handRankings = new Map<string, number>([
      ['p1', 1000], // ties for main pot
      ['p2', 1000], // ties for main pot, wins side pot
      ['p3', 500]
    ]);

    const winnings = distributePots(pots, handRankings);

    // Main pot split: 120 / 2 = 60 each for p1 and p2
    // Side pot: p2 wins 60
    expect(winnings.get('p1')).toBe(60);
    expect(winnings.get('p2')).toBe(120); // 60 + 60
    expect(winnings.get('p3')).toBeUndefined();
  });

  test('conservation: total distributed equals total pot', () => {
    const pots: Pot[] = [
      { amount: 40, eligiblePlayerIds: ['p1', 'p2', 'p3', 'p4'] },
      { amount: 60, eligiblePlayerIds: ['p2', 'p3', 'p4'] },
      { amount: 60, eligiblePlayerIds: ['p3', 'p4'] },
      { amount: 40, eligiblePlayerIds: ['p4'] }
    ];

    const handRankings = new Map<string, number>([
      ['p1', 200],
      ['p2', 500],
      ['p3', 1000],
      ['p4', 800]
    ]);

    const winnings = distributePots(pots, handRankings);

    const totalDistributed = Array.from(winnings.values()).reduce((sum, amt) => sum + amt, 0);
    const totalPot = pots.reduce((sum, pot) => sum + pot.amount, 0);

    expect(totalDistributed).toBe(totalPot);
  });

  test('3-way tie in main pot', () => {
    const pots: Pot[] = [
      { amount: 300, eligiblePlayerIds: ['p1', 'p2', 'p3'] }
    ];

    const handRankings = new Map<string, number>([
      ['p1', 1000],
      ['p2', 1000],
      ['p3', 1000] // all tie
    ]);

    const winnings = distributePots(pots, handRankings);

    // 300 / 3 = 100 each
    expect(winnings.get('p1')).toBe(100);
    expect(winnings.get('p2')).toBe(100);
    expect(winnings.get('p3')).toBe(100);
  });

  test('pot with single eligible player (all-in returned)', () => {
    const pots: Pot[] = [
      { amount: 100, eligiblePlayerIds: ['p1', 'p2'] },
      { amount: 50, eligiblePlayerIds: ['p2'] } // only p2 eligible
    ];

    const handRankings = new Map<string, number>([
      ['p1', 1000],
      ['p2', 500]
    ]);

    const winnings = distributePots(pots, handRankings);

    // p1 wins main pot, p2 gets side pot automatically
    expect(winnings.get('p1')).toBe(100);
    expect(winnings.get('p2')).toBe(50);
  });
});
