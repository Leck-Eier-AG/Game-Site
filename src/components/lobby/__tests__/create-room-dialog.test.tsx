import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CreateRoomDialog } from '../create-room-dialog'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}))

jest.mock('@/lib/socket/provider', () => ({
  useSocket: () => ({ socket: null })
}))

jest.mock('next-intl', () => ({
  useTranslations: () => () => ''
}))

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/components/ui/tooltip', () => {
  const React = require('react')
  return {
    TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  }
})

describe('CreateRoomDialog', () => {
  it('renders draft and duel toggles', () => {
    const html = renderToStaticMarkup(
      <CreateRoomDialog open onOpenChange={() => {}} />
    )

    expect(html).toContain('Draft Mode')
    expect(html).toContain('Duel Mode')
  })

  it('renders tooltip copy for rule toggles', () => {
    const html = renderToStaticMarkup(
      <CreateRoomDialog open onOpenChange={() => {}} />
    )

    expect(html).toContain('Erlaubt es, eine Kategorie mit 0 Punkten zu streichen.')
    expect(html).toContain('Kleine Straße nur 1-2-3-4-5, große Straße nur 2-3-4-5-6.')
  })

  it('renders tooltip copy for match modes', () => {
    const html = renderToStaticMarkup(
      <CreateRoomDialog open onOpenChange={() => {}} />
    )

    expect(html).toContain('Nach jedem Wurf wird der Wurf in einer Draft-Phase beansprucht.')
    expect(html).toContain('Best-of-N-Runden mit begrenztem Kategorien-Pool.')
  })
})
