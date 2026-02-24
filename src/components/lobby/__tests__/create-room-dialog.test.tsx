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

describe('CreateRoomDialog', () => {
  it('renders draft and duel toggles', () => {
    const html = renderToStaticMarkup(
      <CreateRoomDialog open onOpenChange={() => {}} />
    )

    expect(html).toContain('Draft Mode')
    expect(html).toContain('Duel Mode')
  })
})
