# Kniffel Tooltips Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add German tooltips to Kniffel lobby rule toggles and match mode toggles for clearer UX.

**Architecture:** Add a shared UI tooltip component (Radix/shadcn style) and wrap toggle rows in `CreateRoomDialog` with tooltip triggers. Tooltips use concise German copy.

**Tech Stack:** React (Next.js), TypeScript, Radix UI Tooltip (via shadcn-style wrapper).

---

### Task 1: Add UI tooltip component

**Files:**
- Create: `src/components/ui/tooltip.tsx`
- Test: `src/components/lobby/__tests__/create-room-dialog.test.tsx`

**Step 1: Write the failing test**
```tsx
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

describe('CreateRoomDialog tooltips', () => {
  it('renders tooltip copy for rule toggles', () => {
    const html = renderToStaticMarkup(
      <CreateRoomDialog open onOpenChange={() => {}} />
    )

    expect(html).toContain('Erlaubt es, eine Kategorie mit 0 Punkten zu streichen.')
    expect(html).toContain('Kleine Straße nur 1-2-3-4-5, große Straße nur 2-3-4-5-6.')
  })
})
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/components/lobby/__tests__/create-room-dialog.test.tsx`
Expected: FAIL with missing tooltip component or copy.

**Step 3: Write minimal implementation**
```tsx
// src/components/ui/tooltip.tsx
'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import { cn } from '@/lib/utils'

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 shadow-md',
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/components/lobby/__tests__/create-room-dialog.test.tsx`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/components/ui/tooltip.tsx src/components/lobby/__tests__/create-room-dialog.test.tsx

git commit -m "feat(ui): add tooltip component"
```

---

### Task 2: Add tooltips to rule toggles and match modes

**Files:**
- Modify: `src/components/lobby/create-room-dialog.tsx`
- Test: `src/components/lobby/__tests__/create-room-dialog.test.tsx`

**Step 1: Write the failing test**
```tsx
it('renders tooltip copy for match modes', () => {
  const html = renderToStaticMarkup(
    <CreateRoomDialog open onOpenChange={() => {}} />
  )

  expect(html).toContain('Nach jedem Wurf wird der Wurf in einer Draft-Phase beansprucht.')
  expect(html).toContain('Best-of-N-Runden mit begrenztem Kategorien-Pool.')
})
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/components/lobby/__tests__/create-room-dialog.test.tsx`
Expected: FAIL with missing tooltip copy.

**Step 3: Write minimal implementation**
```tsx
// src/components/lobby/create-room-dialog.tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'

// Wrap rows in TooltipProvider + Tooltip/Trigger/Content
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="flex items-center gap-2">
        ...checkbox + label...
      </div>
    </TooltipTrigger>
    <TooltipContent>
      Erlaubt es, eine Kategorie mit 0 Punkten zu streichen.
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Tooltip copy (German):**
- Scratch erlauben: „Erlaubt es, eine Kategorie mit 0 Punkten zu streichen.“
- Strikte Straßen: „Kleine Straße nur 1-2-3-4-5, große Straße nur 2-3-4-5-6.“
- Full House = Summe: „Full House zählt die Augensumme statt 25 Punkte.“
- Max. Würfe: „Wie oft pro Runde gewürfelt werden darf (3 oder 4).“
- Speed Mode: „Wenn die Zeit abläuft, wird automatisch die beste Kategorie gewählt.“
- Draft Mode: „Nach jedem Wurf wird der Wurf in einer Draft-Phase beansprucht.“
- Duel Mode: „Best-of-N-Runden mit begrenztem Kategorien-Pool.“

**Step 4: Run test to verify it passes**
Run: `npm test -- src/components/lobby/__tests__/create-room-dialog.test.tsx`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/components/lobby/create-room-dialog.tsx src/components/lobby/__tests__/create-room-dialog.test.tsx

git commit -m "feat(ui): add tooltips for kniffel toggles"
```

---

## Execution Handoff
Plan complete and saved to `docs/plans/2026-02-24-kniffel-tooltips-implementation.md`. Two execution options:

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration
2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
