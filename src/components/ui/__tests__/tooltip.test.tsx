import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

jest.mock('@radix-ui/react-tooltip', () => {
  const actual = jest.requireActual('@radix-ui/react-tooltip')
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>
  }
})

test('tooltip renders content', () => {
  const html = renderToStaticMarkup(
    <TooltipProvider>
      <Tooltip defaultOpen>
        <TooltipTrigger asChild>
          <span>Trigger</span>
        </TooltipTrigger>
        <TooltipContent>Hinweis</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  expect(html).toContain('Hinweis')
})
