import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { GameResults } from '../GameResults'
import type { PlayerState } from '@/types/game'

describe('GameResults', () => {
  it('renders lower category totals for multi-column scoresheets', () => {
    const useStateSpy = jest.spyOn(React, 'useState')
    useStateSpy.mockImplementation(() => [true, jest.fn()])

    const players: PlayerState[] = [
      {
        userId: 'user1',
        displayName: 'Alice',
        scoresheet: {
          columns: [
            { kniffel: 15 },
            { kniffel: 25 }
          ]
        },
        isReady: true,
        isConnected: true,
        lastActivity: 0,
        consecutiveInactive: 0
      }
    ]

    const html = renderToStaticMarkup(
      <GameResults
        players={players}
        winnerId="user1"
        currentUserId="user1"
      />
    )

    expect(html).toMatch(/Kniffel<\/td><td[^>]*>40<\/td>/)

    useStateSpy.mockRestore()
  })
})
