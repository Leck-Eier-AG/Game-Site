# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router routes, layouts, and pages.
- `src/components`: shared UI components.
- `src/lib`: game logic, state machines, and utilities.
- `src/messages` and `src/i18n`: localization messages and configuration.
- `src/types`: shared TypeScript types.
- `prisma/`: Prisma schema, migrations, and seed script (`prisma/seed.ts`).
- `server.js`: custom server entry used by local dev and production start scripts.

## Build, Test, and Development Commands
- `npm run dev`: start the local server via `tsx server.js`.
- `npm run build`: build the Next.js application.
- `npm run start`: run the production server (`NODE_ENV=production`).
- `npm run lint`: run ESLint with Next.js rules.
- `npm test`: run Jest unit tests.

## Coding Style & Naming Conventions
- Follow existing TypeScript + Next.js patterns.
- Use `PascalCase` for React components and `camelCase` for helpers in `src/lib`.
- Keep route segments under `src/app` in `kebab-case` (e.g., `src/app/game-room/page.tsx`).
- Prefer co-locating component styles and helpers alongside their components.
- Run `npm run lint` before opening a PR.

## Testing Guidelines
- Jest + `ts-jest` with tests under `src/**/__tests__`.
- Name tests `*.test.ts` or `*.test.tsx`.
- Aim to cover game state transitions and edge cases (e.g., `src/lib/game/blackjack/__tests__/state-machine.test.ts`).

## Commit & Pull Request Guidelines
- Use Conventional Commit style where possible (examples in history: `feat: ...`, `fix(scope): ...`, `refactor(poker): ...`).
- Keep commits focused and describe behavior changes clearly.
- PRs should include a short summary, linked issues when applicable, and screenshots for UI changes.

## Configuration Notes
- Local environment files belong in `.env.local` or `.env.*.local` and are git-ignored.
