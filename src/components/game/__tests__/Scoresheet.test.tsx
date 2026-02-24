import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Scoresheet } from '../Scoresheet'
import type { PlayerState, KniffelRuleset } from '@/types/game'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key
}))

describe('Scoresheet', () => {
  it('renders column headers for multi-column scoresheets', () => {
    const players: PlayerState[] = [
      {
        userId: 'user1',
        displayName: 'Alice',
        scoresheet: { columns: [{}, {}, {}] },
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
      <Scoresheet
        players={players}
        currentPlayerIndex={0}
        currentUserId="user1"
        dice={[1, 1, 1, 1, 1]}
        rollsRemaining={2}
        ruleset={ruleset}
        onSelectCategory={() => {}}
        canScore={false}
      />
    )

    expect(html).toContain('x1')
    expect(html).toContain('x2')
    expect(html).toContain('x3')
  })
})
