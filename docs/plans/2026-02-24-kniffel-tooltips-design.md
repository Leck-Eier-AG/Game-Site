# Kniffel Tooltips Design

Date: 2026-02-24

## Goal
Add concise, German tooltips to the Kniffel lobby toggles so users understand the rules and modes without external docs.

## Scope
- Applies to the “Regel‑Toggles” block and the “Match Modes” block in the Kniffel room creation UI.
- Tooltips appear when hovering the entire row (checkbox + label).

## Approach
- Introduce a standard UI tooltip component (Radix Tooltip, shadcn-style wrapper) under `src/components/ui/tooltip.tsx`.
- Wrap each relevant toggle row with `Tooltip` and use the row as `TooltipTrigger`.
- Use concise German copy per toggle, favoring short but complete explanations.

## Tooltip Copy (German)
- Scratch erlauben: „Erlaubt es, eine Kategorie mit 0 Punkten zu streichen.“
- Strikte Straßen: „Kleine Straße nur 1‑2‑3‑4‑5, große Straße nur 2‑3‑4‑5‑6.“
- Full House = Summe: „Full House zählt die Augensumme statt 25 Punkte.“
- Max. Würfe: „Wie oft pro Runde gewürfelt werden darf (3 oder 4).“
- Speed Mode: „Wenn die Zeit abläuft, wird automatisch die beste Kategorie gewählt.“
- Draft Mode: „Nach jedem Wurf wird der Wurf in einer Draft‑Phase beansprucht.“
- Duel Mode: „Best‑of‑N‑Runden mit begrenztem Kategorien‑Pool.“

## Testing
- Add/extend a component test to assert tooltip copy is present in the rendered output.

