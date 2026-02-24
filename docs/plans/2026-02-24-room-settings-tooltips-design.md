# Room Settings Tooltips Design

Date: 2026-02-24

## Goal
Add concise, helpful tooltips for all room settings in the room creation dialog, including general settings and Kniffel-specific settings. Tooltips should be shown when hovering the full row/label area.

## Scope
- Room creation dialog only.
- General settings (room name, game type, max players, timers, privacy, bet settings, casino settings).
- Kniffel-specific settings (preset, mode, rules toggles, speed mode, match modes, category randomizer and sub-options).

## UX Requirements
- Tooltip triggers cover the entire row or label block for each setting.
- Short German copy, as brief as possible while still fully explanatory.
- Consistent tooltip styling and placement.

## Components
- Add a reusable tooltip UI component in `src/components/ui/tooltip.tsx` (Radix Tooltip).
- Use `TooltipTrigger` with `asChild` to wrap row containers in `create-room-dialog`.

## Data & Behavior
- Tooltips are static strings embedded in the dialog.
- No behavioral changes to settings or validation.

## Testing
- Update or add a render test for `CreateRoomDialog` to assert key tooltip texts appear in the output.

## Out of Scope
- Any behavior changes to game rules or validation.
- Tooltip support outside the room creation dialog.
