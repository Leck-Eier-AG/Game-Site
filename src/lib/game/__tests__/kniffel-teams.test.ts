import type { KniffelRuleset, PlayerState, TeamInfo } from '@/types/game'
import { buildTeamTotals } from '../kniffel-teams'

describe('buildTeamTotals', () => {
  it('uses column multipliers for team totals', () => {
    const teams: TeamInfo[] = [
      { id: 'team-a', name: 'Team A', memberUserIds: ['u1'] },
      { id: 'team-b', name: 'Team B', memberUserIds: ['u2'] },
    ]
    const players: PlayerState[] = [
      {
        userId: 'u1',
        displayName: 'Alice',
        scoresheet: { columns: [{ ones: 6 }, {}, {}] },
        isReady: true,
        isConnected: true,
        lastActivity: 0,
        consecutiveInactive: 0,
      },
      {
        userId: 'u2',
        displayName: 'Bob',
        scoresheet: { columns: [{}, {}, { ones: 3 }] },
        isReady: true,
        isConnected: true,
        lastActivity: 0,
        consecutiveInactive: 0,
      },
    ]
    const ruleset: KniffelRuleset = {
      preset: 'triple',
      allowScratch: true,
      strictStraights: false,
      fullHouseUsesSum: false,
      maxRolls: 3,
      columnCount: 3,
      columnMultipliers: [1, 2, 3],
      columnSelection: 'choose',
      jokerCount: 0,
      jokerMaxPerTurn: 0,
      draftEnabled: false,
      duelEnabled: false,
      riskRollEnabled: false,
      riskRollThreshold: 24,
      dailyEnabled: false,
      ladderEnabled: false,
      constraintsEnabled: false,
      rogueliteEnabled: false,
      categoryRandomizer: {
        enabled: false,
        disabledCategories: [],
        specialCategories: [],
      },
      speedMode: {
        enabled: false,
        autoScore: false,
      },
    }

    const totals = buildTeamTotals(teams, players, ruleset)

    expect(totals[0].teamId).toBe('team-b')
    expect(totals[0].total).toBe(9)
    expect(totals[1].total).toBe(6)
  })
})
