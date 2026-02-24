import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PlayerList } from '../PlayerList'
import type { KniffelRuleset, PlayerState } from '@/types/game'

jest.mock('@/components/wallet/transfer-dialog', () => ({
  TransferDialog: ({ trigger }: { trigger: React.ReactNode }) => <div>{trigger}</div>
}))

describe('PlayerList', () => {
  it('renders totals for multi-column scoresheets with ruleset multipliers', () => {
    const players: PlayerState[] = [
      {
        userId: 'user1',
        displayName: 'Alice',
        scoresheet: {
          columns: [
            { ones: 10 },
            { ones: 10 },
            { ones: 10 }
          ]
        },
        isReady: true,
        isConnected: true,
        lastActivity: 0,
        consecutiveInactive: 0
      }
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
        specialCategories: []
      },
      speedMode: {
        enabled: false,
        autoScore: false
      }
    }

    const html = renderToStaticMarkup(
      <PlayerList
        players={players}
        currentPlayerIndex={0}
        currentUserId="user1"
        ruleset={ruleset}
      />
    )

    expect(html).toContain('60 Punkte')
  })
})
