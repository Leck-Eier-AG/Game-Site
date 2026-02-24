# Room Settings Tooltips Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add concise tooltips for all room settings (general + Kniffel-specific) in the room creation dialog, with row/label-wide hover targets.

**Architecture:** Introduce a reusable Radix-based tooltip component and wrap each settings row/label block in `CreateRoomDialog` with a tooltip trigger. Tooltip text is static, short German copy mapped to each setting.

**Tech Stack:** Next.js, React, TypeScript, Radix UI Tooltip.

---

### Task 1: Add Tooltip UI Component

**Files:**
- Create: `src/components/ui/tooltip.tsx`

**Step 1: Write the failing test**

```tsx
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

test('tooltip renders content', () => {
  const html = renderToStaticMarkup(
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>Trigger</span>
        </TooltipTrigger>
        <TooltipContent>Hinweis</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
  expect(html).toContain('Hinweis')
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ui/__tests__/tooltip.test.tsx`
Expected: FAIL with module not found for tooltip component.

**Step 3: Write minimal implementation**

```tsx
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
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 max-w-xs rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 shadow-md',
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ui/__tests__/tooltip.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/ui/tooltip.tsx src/components/ui/__tests__/tooltip.test.tsx
git commit -m "feat(ui): add tooltip component"
```

---

### Task 2: Add Tooltip Copy Map for Room Settings

**Files:**
- Modify: `src/components/lobby/create-room-dialog.tsx`

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

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

test('create room dialog includes key tooltip text', () => {
  const html = renderToStaticMarkup(<CreateRoomDialog open onOpenChange={() => {}} />)
  expect(html).toContain('Der Spielmodus bestimmt die Teamaufteilung')
  expect(html).toContain('Wenn aktiviert, wird bei Timeout automatisch gewertet')
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/lobby/__tests__/create-room-dialog.tooltips.test.tsx`
Expected: FAIL because tooltips are missing.

**Step 3: Write minimal implementation**

Add a `tooltipCopy` map in `create-room-dialog.tsx` and wrap each settings row/label block with tooltip components and row-wide triggers. Example copy snippets:

```ts
const tooltipCopy = {
  roomName: 'Name des Raums (3–30 Zeichen).',
  gameType: 'Wählt das Spiel. Casino-Spiele sind immer Echtgeld-Runden.',
  maxPlayers: 'Maximale Spielerzahl für den Raum.',
  kniffelPreset: 'Voreinstellungen für Regelpakete (nur Classic verfügbar).',
  kniffelMode: 'Der Spielmodus bestimmt die Teamaufteilung.',
  allowScratch: 'Ein Feld darf als 0 gewertet werden.',
  strictStraights: 'Straßen zählen nur mit exakten Sequenzen.',
  fullHouseSum: 'Full House zählt als Augensumme statt Fixwert.',
  maxRolls: 'Maximale Würfe pro Zug (4 aktiviert Risk Roll).',
  speedMode: 'Wenn aktiviert, wird bei Timeout automatisch gewertet.',
  draftMode: 'Spieler wählen Kategorien aus einem Draft-Pool.',
  duelMode: 'Direkte Duelle mit kleinerem Kategorienpool.',
  categoryRandomizer: 'Aktiviert zufällige De-/Aktivierung von Kategorien.',
  disabledCategories: 'Kategorien, die im Match nicht wählbar sind.',
  specialCategories: 'Zusätzliche Kategorien, die ins Spiel kommen.',
  turnTimer: 'Zeitlimit pro Zug in Sekunden.',
  afkThreshold: 'Züge bis ein Spieler als AFK gilt.',
  privateRoom: 'Nur mit Einladungslink beitretbar.',
  betRoom: 'Einsatzrunde. Nur Kniffel erlaubt eigene Einsätze.',
  betAmount: 'Einsatz pro Spieler (muss zwischen Min/Max liegen).',
  minBet: 'Kleinster erlaubter Einsatz.',
  maxBet: 'Größter erlaubter Einsatz.',
  payoutRatios: 'Anteile der Auszahlungen müssen 100% ergeben.',
  spinTimer: 'Zeit bis zum Roulette-Spin.',
  startingBlinds: 'Start-Blinds für Poker.',
}
```

Wrap each row container with:

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="...">...</div>
    </TooltipTrigger>
    <TooltipContent>{tooltipCopy.roomName}</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/lobby/__tests__/create-room-dialog.tooltips.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/lobby/create-room-dialog.tsx src/components/lobby/__tests__/create-room-dialog.tooltips.test.tsx
git commit -m "feat(ui): add tooltips for room settings"
```

---

### Task 3: Ensure Tooltip Trigger Coverage for All Rows

**Files:**
- Modify: `src/components/lobby/create-room-dialog.tsx`

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

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

test('tooltips include general settings copy', () => {
  const html = renderToStaticMarkup(<CreateRoomDialog open onOpenChange={() => {}} />)
  expect(html).toContain('Zeitlimit pro Zug')
  expect(html).toContain('Nur mit Einladungslink beitretbar')
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/lobby/__tests__/create-room-dialog.tooltips-general.test.tsx`
Expected: FAIL until copy is present.

**Step 3: Write minimal implementation**

Ensure all rows (general + casino + betting + kniffel) are wrapped with tooltip triggers. Include copy for each row label.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/lobby/__tests__/create-room-dialog.tooltips-general.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/lobby/create-room-dialog.tsx src/components/lobby/__tests__/create-room-dialog.tooltips-general.test.tsx
git commit -m "test(ui): cover general settings tooltips"
```
```
