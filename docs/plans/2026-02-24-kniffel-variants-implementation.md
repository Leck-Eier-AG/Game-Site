# Kniffel Variants (Phase 2–5) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Phase 2–5 Kniffel variants (Triple, Jokers, Draft, Duel, Risk Roll, Daily, Ladder, Scenario Constraints, Roguelite) while preserving classic behavior.

**Architecture:** Keep a single state machine and scoring core driven by a server-authoritative `KniffelRuleset`. Add match-specific state (`matchState`) and modifiers (`modifiersState`) that are deterministic and serializable. UI reflects state machine outputs without duplicating rules.

**Tech Stack:** Next.js, TypeScript, Jest, Prisma.

---

### Task 1: Extend core types for Phase 2–5

**Files:**
- Modify: `src/types/game.ts`
- Test: `src/lib/game/__tests__/kniffel-ruleset.test.ts`

**Step 1: Write the failing test**
```ts
import { resolveKniffelRuleset } from "../kniffel-ruleset";

test("resolveKniffelRuleset sets defaults for phase2-5 toggles", () => {
  const rules = resolveKniffelRuleset("classic", {});
  expect(rules.columnCount).toBe(1);
  expect(rules.jokerCount).toBe(0);
  expect(rules.jokerMaxPerTurn).toBe(0);
  expect(rules.draftEnabled).toBe(false);
  expect(rules.duelEnabled).toBe(false);
  expect(rules.riskRollEnabled).toBe(false);
  expect(rules.dailyEnabled).toBe(false);
  expect(rules.ladderEnabled).toBe(false);
  expect(rules.constraintsEnabled).toBe(false);
  expect(rules.rogueliteEnabled).toBe(false);
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/lib/game/__tests__/kniffel-ruleset.test.ts`
Expected: FAIL with missing properties.

**Step 3: Write minimal implementation**
```ts
// src/types/game.ts
export type KniffelRuleset = {
  // existing...
  columnCount: number;
  columnMultipliers: number[];
  columnSelection: "choose" | "round";
  jokerCount: number;
  jokerMaxPerTurn: number;
  draftEnabled: boolean;
  duelEnabled: boolean;
  riskRollEnabled: boolean;
  riskRollThreshold: number;
  dailyEnabled: boolean;
  ladderEnabled: boolean;
  constraintsEnabled: boolean;
  rogueliteEnabled: boolean;
};

export type MatchState = {
  mode?: "draft" | "duel" | "risk" | "daily" | "ladder" | "roguelite";
  roundIndex?: number;
  roundWinners?: string[];
  draftOrder?: string[];
  draftPool?: number[][];
  draftCurrentIndex?: number;
  duelCategoryPool?: ScoreCategory[];
  riskDebt?: boolean;
  dailySeed?: string;
  ladderRung?: number;
  constraints?: string[];
};

export type ModifiersState = {
  jokersByPlayerId?: Record<string, number>;
  effects?: Array<{ id: string; type: string; value: number; remainingTurns: number }>
};
```

```ts
// src/lib/game/kniffel-ruleset.ts
const baseRuleset: KniffelRuleset = {
  // existing defaults...
  columnCount: 1,
  columnMultipliers: [1],
  columnSelection: "choose",
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
};
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/lib/game/__tests__/kniffel-ruleset.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/types/game.ts src/lib/game/kniffel-ruleset.ts src/lib/game/__tests__/kniffel-ruleset.test.ts
git commit -m "feat(kniffel): extend ruleset for phase2-5"
```

---

### Task 2: Add Triple Kniffel columns to scoresheet model

**Files:**
- Modify: `src/types/game.ts`
- Test: `src/lib/game/__tests__/kniffel-rules.test.ts`

**Step 1: Write the failing test**
```ts
import { calculateTotalScoreWithRuleset } from "../kniffel-rules";

const baseScoresheet = {
  ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18,
  threeOfAKind: 20, fourOfAKind: 0, fullHouse: 25, smallStraight: 30,
  largeStraight: 40, kniffel: 50, chance: 24,
  twoPairs: null, allEven: null, sumAtLeast24: null,
};

test("calculateTotalScoreWithRuleset sums column totals by multipliers", () => {
  const rules = { columnCount: 3, columnMultipliers: [1, 2, 3] } as any;
  const scoresheet = { columns: [baseScoresheet, baseScoresheet, baseScoresheet] };
  const total = calculateTotalScoreWithRuleset(scoresheet as any, rules);
  expect(total).toBe( (1+2+3) * 282 );
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/lib/game/__tests__/kniffel-rules.test.ts`
Expected: FAIL with missing function/logic.

**Step 3: Write minimal implementation**
```ts
// src/lib/game/kniffel-rules.ts
export function calculateTotalScoreWithRuleset(
  scoresheet: KniffelScoresheet | { columns: KniffelScoresheet[] },
  ruleset: KniffelRuleset
) {
  if ("columns" in scoresheet) {
    return scoresheet.columns.reduce((sum, column, index) => {
      const multiplier = ruleset.columnMultipliers?.[index] ?? 1;
      return sum + calculateTotalScore(column) * multiplier;
    }, 0);
  }
  return calculateTotalScore(scoresheet);
}
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/lib/game/__tests__/kniffel-rules.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/lib/game/kniffel-rules.ts src/lib/game/__tests__/kniffel-rules.test.ts

git commit -m "feat(kniffel): total scoring for columns"
```

---

### Task 3: Initialize triple columns in game state

**Files:**
- Modify: `src/lib/game/state-machine.ts`
- Modify: `src/types/game.ts`
- Test: `src/lib/game/__tests__/state-machine.test.ts`

**Step 1: Write the failing test**
```ts
import { createInitialState } from "../state-machine";

it("creates scoresheet columns for triple preset", () => {
  const state = createInitialState(
    [{ id: "p1", name: "P1" }],
    { gameType: "kniffel", kniffelPreset: "triple" } as any
  );
  expect(state.players[0].scoresheet.columns).toHaveLength(3);
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/lib/game/__tests__/state-machine.test.ts`
Expected: FAIL with missing columns.

**Step 3: Write minimal implementation**
```ts
// src/types/game.ts
export type KniffelScoresheet = {
  // existing categories...
  sumAtLeast24?: number | null;
};

export type PlayerState = {
  // existing...
  scoresheet: KniffelScoresheet | { columns: KniffelScoresheet[] };
};
```

```ts
// src/lib/game/state-machine.ts
const baseScoresheet = () => ({
  ones: null, twos: null, threes: null, fours: null, fives: null, sixes: null,
  threeOfAKind: null, fourOfAKind: null, fullHouse: null, smallStraight: null,
  largeStraight: null, kniffel: null, chance: null,
  twoPairs: null, allEven: null, sumAtLeast24: null,
});

const makeScoresheet = (ruleset: KniffelRuleset) => {
  if (ruleset.columnCount > 1) {
    return { columns: Array.from({ length: ruleset.columnCount }, baseScoresheet) };
  }
  return baseScoresheet();
};
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/lib/game/__tests__/state-machine.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/types/game.ts src/lib/game/state-machine.ts src/lib/game/__tests__/state-machine.test.ts

git commit -m "feat(kniffel): initialize triple scoresheets"
```

---

### Task 4: Allow scoring into a chosen column

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/lib/game/state-machine.ts`
- Modify: `src/lib/game/kniffel-rules.ts`
- Test: `src/lib/game/__tests__/state-machine.test.ts`

**Step 1: Write the failing test**
```ts
import { applyAction, createInitialState } from "../state-machine";

it("scores category into chosen column", () => {
  const state = createInitialState(
    [{ id: "p1", name: "P1" }],
    { gameType: "kniffel", kniffelPreset: "triple" } as any
  );
  state.currentDice = [1,1,1,1,1];
  const next = applyAction(state, { type: "CHOOSE_CATEGORY", category: "ones", columnIndex: 1 } as any);
  expect((next.players[0].scoresheet as any).columns[1].ones).toBe(5);
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/lib/game/__tests__/state-machine.test.ts`
Expected: FAIL with missing columnIndex handling.

**Step 3: Write minimal implementation**
```ts
// src/types/game.ts
export type GameAction =
  | { type: "CHOOSE_CATEGORY"; category: ScoreCategory; columnIndex?: number }
  | { type: "ROLL_DICE" }
  | { type: "HOLD_DIE"; dieIndex: number }
  | { type: "END_TURN" }
  | { type: "USE_JOKER"; dieIndex: number; delta: 1 | -1 };
```

```ts
// src/lib/game/state-machine.ts
const selectScoresheet = (player: PlayerState, columnIndex: number | undefined) => {
  if (!("columns" in player.scoresheet)) return player.scoresheet;
  const index = columnIndex ?? 0;
  return player.scoresheet.columns[index];
};

// In CHOOSE_CATEGORY handling
const target = selectScoresheet(currentPlayer, action.columnIndex);
const score = calculateScoreWithRuleset(action.category, state.currentDice, state.ruleset);
(target as any)[action.category] = score;
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/lib/game/__tests__/state-machine.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/types/game.ts src/lib/game/state-machine.ts src/lib/game/__tests__/state-machine.test.ts

git commit -m "feat(kniffel): choose column when scoring"
```

---

### Task 5: Render multi-column scoresheet UI

**Files:**
- Modify: `src/components/game/kniffel/scoresheet.tsx`
- Test: `src/components/game/kniffel/__tests__/scoresheet.test.tsx`

**Step 1: Write the failing test**
```tsx
import { render, screen } from "@testing-library/react";
import Scoresheet from "../scoresheet";

test("renders columns headers when triple", () => {
  render(<Scoresheet scoresheet={{ columns: [{}, {}, {}] } as any} ruleset={{ columnCount: 3, columnMultipliers: [1,2,3] } as any} />);
  expect(screen.getByText("x1")).toBeInTheDocument();
  expect(screen.getByText("x2")).toBeInTheDocument();
  expect(screen.getByText("x3")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/components/game/kniffel/__tests__/scoresheet.test.tsx`
Expected: FAIL with missing headers.

**Step 3: Write minimal implementation**
```tsx
// src/components/game/kniffel/scoresheet.tsx
const columns = "columns" in scoresheet ? scoresheet.columns : [scoresheet];

return (
  <div className="scoresheet">
    {columns.length > 1 && (
      <div className="columns-header">
        {columns.map((_, idx) => (
          <span key={idx}>x{ruleset.columnMultipliers?.[idx] ?? 1}</span>
        ))}
      </div>
    )}
    {/* render per-column cells */}
  </div>
);
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/components/game/kniffel/__tests__/scoresheet.test.tsx`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/components/game/kniffel/scoresheet.tsx src/components/game/kniffel/__tests__/scoresheet.test.tsx

git commit -m "feat(ui): render multi-column scoresheet"
```

---

### Task 6: Add Joker action validation and usage

**Files:**
- Modify: `src/lib/game/state-machine.ts`
- Modify: `src/types/game.ts`
- Test: `src/lib/game/__tests__/state-machine.test.ts`

**Step 1: Write the failing test**
```ts
import { applyAction, createInitialState } from "../state-machine";

it("consumes joker and adjusts die", () => {
  const state = createInitialState([{ id: "p1", name: "P1" }], {
    gameType: "kniffel",
    kniffelRuleset: { jokerCount: 1, jokerMaxPerTurn: 1 }
  } as any);
  state.currentDice = [1,2,3,4,5];
  const next = applyAction(state, { type: "USE_JOKER", dieIndex: 0, delta: 1 } as any);
  expect(next.currentDice[0]).toBe(2);
  expect(next.modifiersState.jokersByPlayerId?.p1).toBe(0);
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/lib/game/__tests__/state-machine.test.ts`
Expected: FAIL with missing action/logic.

**Step 3: Write minimal implementation**
```ts
// src/lib/game/state-machine.ts
if (action.type === "USE_JOKER") {
  const jokers = state.modifiersState?.jokersByPlayerId?.[currentPlayer.id] ?? 0;
  if (jokers <= 0) return state;
  const die = state.currentDice[action.dieIndex];
  const nextValue = Math.min(6, Math.max(1, die + action.delta));
  const newDice = state.currentDice.slice();
  newDice[action.dieIndex] = nextValue;
  return {
    ...state,
    currentDice: newDice,
    modifiersState: {
      ...state.modifiersState,
      jokersByPlayerId: {
        ...state.modifiersState?.jokersByPlayerId,
        [currentPlayer.id]: jokers - 1,
      },
    },
  };
}
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/lib/game/__tests__/state-machine.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/lib/game/state-machine.ts src/lib/game/__tests__/state-machine.test.ts src/types/game.ts

git commit -m "feat(kniffel): add joker usage"
```

---

### Task 7: Draft mode core flow

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/lib/game/state-machine.ts`
- Test: `src/lib/game/__tests__/state-machine.test.ts`

**Step 1: Write the failing test**
```ts
it("transitions to draft_claim after rolling_pool", () => {
  const state = createInitialState([{ id: "p1", name: "P1" }, { id: "p2", name: "P2" }], {
    gameType: "kniffel",
    kniffelRuleset: { draftEnabled: true }
  } as any);
  const next = applyAction(state, { type: "ROLL_DICE" } as any);
  expect(next.phase).toBe("draft_claim");
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/lib/game/__tests__/state-machine.test.ts`
Expected: FAIL with missing draft phase.

**Step 3: Write minimal implementation**
```ts
// src/types/game.ts
export type GamePhase =
  | "rolling"
  | "draft_claim"
  | "scoring";

// src/lib/game/state-machine.ts
if (state.ruleset.draftEnabled) {
  // after rolling pool
  return { ...state, phase: "draft_claim" };
}
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/lib/game/__tests__/state-machine.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/types/game.ts src/lib/game/state-machine.ts src/lib/game/__tests__/state-machine.test.ts

git commit -m "feat(kniffel): add draft phase"
```

---

### Task 8: Duel match state and win condition

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/lib/game/state-machine.ts`
- Test: `src/lib/game/__tests__/state-machine.test.ts`

**Step 1: Write the failing test**
```ts
it("tracks duel round winners", () => {
  const state = createInitialState([{ id: "p1", name: "P1" }, { id: "p2", name: "P2" }], {
    gameType: "kniffel",
    kniffelRuleset: { duelEnabled: true }
  } as any);
  const next = { ...state, matchState: { roundWinners: ["p1"] } } as any;
  expect(next.matchState.roundWinners).toEqual(["p1"]);
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/lib/game/__tests__/state-machine.test.ts`
Expected: FAIL with missing type support.

**Step 3: Write minimal implementation**
```ts
// src/types/game.ts
export type MatchState = {
  // existing...
  roundWinners?: string[];
  roundIndex?: number;
  duelCategoryPool?: ScoreCategory[];
};
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/lib/game/__tests__/state-machine.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/types/game.ts src/lib/game/__tests__/state-machine.test.ts

git commit -m "feat(kniffel): duel match state"
```

---

### Task 9: Risk roll action

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/lib/game/state-machine.ts`
- Test: `src/lib/game/__tests__/state-machine.test.ts`

**Step 1: Write the failing test**
```ts
it("allows risk roll after rolls exhausted", () => {
  const state = createInitialState([{ id: "p1", name: "P1" }], {
    gameType: "kniffel",
    kniffelRuleset: { riskRollEnabled: true, riskRollThreshold: 24 }
  } as any);
  state.rollsRemaining = 0;
  const next = applyAction(state, { type: "TAKE_RISK_ROLL" } as any);
  expect(next.rollsRemaining).toBe(0);
  expect(next.matchState.riskDebt).toBeDefined();
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/lib/game/__tests__/state-machine.test.ts`
Expected: FAIL with missing action.

**Step 3: Write minimal implementation**
```ts
// src/types/game.ts
export type GameAction =
  | { type: "TAKE_RISK_ROLL" }
  | /* existing */ any;

// src/lib/game/state-machine.ts
if (action.type === "TAKE_RISK_ROLL") {
  const sum = state.currentDice.reduce((a, b) => a + b, 0);
  return {
    ...state,
    currentDice: rollDice(),
    matchState: {
      ...state.matchState,
      riskDebt: sum < state.ruleset.riskRollThreshold,
    },
  };
}
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/lib/game/__tests__/state-machine.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/types/game.ts src/lib/game/state-machine.ts src/lib/game/__tests__/state-machine.test.ts

git commit -m "feat(kniffel): add risk roll"
```

---

### Task 10: Daily challenge seed wiring

**Files:**
- Modify: `src/lib/game/state-machine.ts`
- Create: `src/lib/game/daily-seed.ts`
- Test: `src/lib/game/__tests__/daily-seed.test.ts`

**Step 1: Write the failing test**
```ts
import { seedFromUtcDate } from "../daily-seed";

test("seedFromUtcDate is deterministic", () => {
  const seed = seedFromUtcDate("2026-02-24");
  expect(seed).toBe(seedFromUtcDate("2026-02-24"));
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/lib/game/__tests__/daily-seed.test.ts`
Expected: FAIL with missing file.

**Step 3: Write minimal implementation**
```ts
// src/lib/game/daily-seed.ts
export function seedFromUtcDate(date: string) {
  let hash = 0;
  for (let i = 0; i < date.length; i++) hash = (hash * 31 + date.charCodeAt(i)) | 0;
  return `seed-${Math.abs(hash)}`;
}
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/lib/game/__tests__/daily-seed.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/lib/game/daily-seed.ts src/lib/game/__tests__/daily-seed.test.ts

git commit -m "feat(kniffel): add daily seed helper"
```

---

### Task 11: Add DailyChallenge persistence

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/db/daily-challenge.ts`
- Test: `src/lib/db/__tests__/daily-challenge.test.ts`

**Step 1: Write the failing test**
```ts
import { upsertDailyScore } from "../daily-challenge";

test("upsertDailyScore stores best score", async () => {
  const score = await upsertDailyScore("u1", "2026-02-24", 200);
  expect(score.value).toBe(200);
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/lib/db/__tests__/daily-challenge.test.ts`
Expected: FAIL with missing model.

**Step 3: Write minimal implementation**
```prisma
model DailyChallengeScore {
  id        String   @id @default(cuid())
  userId    String
  date      String
  value     Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, date])
}
```

```ts
// src/lib/db/daily-challenge.ts
export async function upsertDailyScore(userId: string, date: string, value: number) {
  return prisma.dailyChallengeScore.upsert({
    where: { userId_date: { userId, date } },
    update: { value: Math.max(value, 0) },
    create: { userId, date, value },
  });
}
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/lib/db/__tests__/daily-challenge.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add prisma/schema.prisma src/lib/db/daily-challenge.ts src/lib/db/__tests__/daily-challenge.test.ts

git commit -m "feat(kniffel): persist daily challenge scores"
```

---

### Task 12: Add Ladder persistence

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/db/kniffel-ladder.ts`
- Test: `src/lib/db/__tests__/kniffel-ladder.test.ts`

**Step 1: Write the failing test**
```ts
import { advanceLadderRung } from "../kniffel-ladder";

test("advanceLadderRung increments rung", async () => {
  const progress = await advanceLadderRung("u1");
  expect(progress.rung).toBe(1);
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/lib/db/__tests__/kniffel-ladder.test.ts`
Expected: FAIL with missing model.

**Step 3: Write minimal implementation**
```prisma
model KniffelLadderProgress {
  id        String   @id @default(cuid())
  userId    String   @unique
  rung      Int      @default(0)
  bestScore Int?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

```ts
// src/lib/db/kniffel-ladder.ts
export async function advanceLadderRung(userId: string) {
  return prisma.kniffelLadderProgress.upsert({
    where: { userId },
    update: { rung: { increment: 1 } },
    create: { userId, rung: 1 },
  });
}
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/lib/db/__tests__/kniffel-ladder.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add prisma/schema.prisma src/lib/db/kniffel-ladder.ts src/lib/db/__tests__/kniffel-ladder.test.ts

git commit -m "feat(kniffel): add ladder persistence"
```

---

### Task 13: Scenario constraint pipeline

**Files:**
- Create: `src/lib/game/constraints.ts`
- Modify: `src/lib/game/state-machine.ts`
- Test: `src/lib/game/__tests__/constraints.test.ts`

**Step 1: Write the failing test**
```ts
import { isCategoryAllowedByConstraints } from "../constraints";

test("noChance constraint blocks chance", () => {
  expect(isCategoryAllowedByConstraints(["noChance"], "chance")).toBe(false);
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/lib/game/__tests__/constraints.test.ts`
Expected: FAIL with missing file.

**Step 3: Write minimal implementation**
```ts
// src/lib/game/constraints.ts
import { ScoreCategory } from "../../types/game";

export function isCategoryAllowedByConstraints(constraints: string[], category: ScoreCategory) {
  if (constraints.includes("noChance") && category === "chance") return false;
  return true;
}
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/lib/game/__tests__/constraints.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/lib/game/constraints.ts src/lib/game/__tests__/constraints.test.ts src/lib/game/state-machine.ts

git commit -m "feat(kniffel): add constraint pipeline"
```

---

### Task 14: Roguelite effect engine skeleton

**Files:**
- Create: `src/lib/game/kniffel-effects.ts`
- Test: `src/lib/game/__tests__/kniffel-effects.test.ts`

**Step 1: Write the failing test**
```ts
import { applyEffects } from "../kniffel-effects";

test("applyEffects returns unchanged state with no effects", () => {
  const state = { currentDice: [1,2,3,4,5] } as any;
  expect(applyEffects(state, "onBeforeRoll")).toEqual(state);
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/lib/game/__tests__/kniffel-effects.test.ts`
Expected: FAIL with missing file.

**Step 3: Write minimal implementation**
```ts
// src/lib/game/kniffel-effects.ts
export type EffectHook = "onTurnStart" | "onBeforeRoll" | "onAfterRoll" | "onScore" | "onRoundEnd";

export function applyEffects(state: any, hook: EffectHook) {
  const effects = state.modifiersState?.effects ?? [];
  return effects.reduce((next: any, effect: any) => {
    if (effect.hook !== hook) return next;
    return effect.apply(next);
  }, state);
}
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/lib/game/__tests__/kniffel-effects.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/lib/game/kniffel-effects.ts src/lib/game/__tests__/kniffel-effects.test.ts

git commit -m "feat(kniffel): add effect engine skeleton"
```

---

### Task 15: Integrate effect hooks into state machine

**Files:**
- Modify: `src/lib/game/state-machine.ts`
- Test: `src/lib/game/__tests__/state-machine.test.ts`

**Step 1: Write the failing test**
```ts
import { applyAction, createInitialState } from "../state-machine";

it("runs onBeforeRoll effects", () => {
  const state = createInitialState([{ id: "p1", name: "P1" }], { gameType: "kniffel" } as any);
  state.modifiersState = { effects: [{ hook: "onBeforeRoll", apply: (s: any) => ({ ...s, effectApplied: true }) }] } as any;
  const next = applyAction(state, { type: "ROLL_DICE" } as any);
  expect((next as any).effectApplied).toBe(true);
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/lib/game/__tests__/state-machine.test.ts`
Expected: FAIL with missing hook.

**Step 3: Write minimal implementation**
```ts
// src/lib/game/state-machine.ts
import { applyEffects } from "./kniffel-effects";

if (action.type === "ROLL_DICE") {
  const withEffects = applyEffects(state, "onBeforeRoll");
  // proceed with roll using withEffects
}
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/lib/game/__tests__/state-machine.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/lib/game/state-machine.ts src/lib/game/__tests__/state-machine.test.ts

git commit -m "feat(kniffel): run effects in state machine"
```

---

### Task 16: UI hooks for new modes

**Files:**
- Modify: `src/components/lobby/create-room-dialog.tsx`
- Modify: `src/components/game/kniffel/game-board.tsx`
- Test: `src/components/lobby/__tests__/create-room-dialog.test.tsx`

**Step 1: Write the failing test**
```tsx
import { render, screen } from "@testing-library/react";
import CreateRoomDialog from "../create-room-dialog";

test("renders draft and duel toggles", () => {
  render(<CreateRoomDialog />);
  expect(screen.getByText("Draft Mode")).toBeInTheDocument();
  expect(screen.getByText("Duel Mode")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/components/lobby/__tests__/create-room-dialog.test.tsx`
Expected: FAIL with missing controls.

**Step 3: Write minimal implementation**
```tsx
// src/components/lobby/create-room-dialog.tsx
<label>
  <input type="checkbox" checked={draftEnabled} onChange={...} /> Draft Mode
</label>
<label>
  <input type="checkbox" checked={duelEnabled} onChange={...} /> Duel Mode
</label>
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/components/lobby/__tests__/create-room-dialog.test.tsx`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/components/lobby/create-room-dialog.tsx src/components/lobby/__tests__/create-room-dialog.test.tsx

git commit -m "feat(ui): add draft/duel controls"
```

---

### Task 17: End-to-end wiring per mode

**Files:**
- Modify: `src/lib/game/server/kniffel.ts`
- Modify: `src/lib/game/state-machine.ts`
- Test: `src/lib/game/__tests__/server-kniffel.test.ts`

**Step 1: Write the failing test**
```ts
import { autoPlayKniffel } from "../server/kniffel";

test("autoPlay respects draft mode", () => {
  const state = autoPlayKniffel({ kniffelRuleset: { draftEnabled: true } } as any);
  expect(state.phase).toBe("draft_claim");
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/lib/game/__tests__/server-kniffel.test.ts`
Expected: FAIL with missing behavior.

**Step 3: Write minimal implementation**
```ts
// src/lib/game/server/kniffel.ts
const ruleset = resolveKniffelRuleset(settings.kniffelPreset, settings.kniffelRuleset);
// ensure state machine uses ruleset for draft/duel/risk
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/lib/game/__tests__/server-kniffel.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/lib/game/server/kniffel.ts src/lib/game/__tests__/server-kniffel.test.ts

git commit -m "feat(kniffel): wire modes into server"
```

---

### Task 18: Documentation updates

**Files:**
- Modify: `docs/kniffel-variants-implementation-plan.md`
- Create: `docs/kniffel-variants.md`

**Step 1: Write the failing test**
```md
<!-- no tests required for docs -->
```

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: NO CHANGE (skip).

**Step 3: Write minimal implementation**
```md
# Kniffel Variants
- Triple Kniffel: 3 columns, multipliers, choose column per score.
- Jokers: +1/-1 dice adjustment, 1 per turn by default.
- Draft: roll pool, snake-order claims.
- Duel: best-of-N rounds with 5-category subsets.
- Risk Roll: optional 4th roll with debt if below threshold.
- Daily: seeded RNG by UTC date.
- Ladder: per-user rung progression.
- Roguelite: effects engine (perks/curses/bosses).
```

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: NO CHANGE (skip).

**Step 5: Commit**
```bash
git add docs/kniffel-variants-implementation-plan.md docs/kniffel-variants.md

git commit -m "docs: add kniffel variants overview"
```

---

## Execution Handoff
Plan complete and saved to `docs/plans/2026-02-24-kniffel-variants-implementation.md`. Two execution options:

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration
2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
