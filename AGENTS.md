# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js routes and layouts.
- `src/components`: UI components.
- `src/lib`: game logic, state machines, utilities.
- `src/messages` and `src/i18n`: localization messages and configuration.
- `prisma/`: Prisma schema, migrations, and seeds.

## Build, Test, and Development Commands
- `npm run dev`: start the local dev server via `tsx server.js`.
- `npm run build`: build the Next.js app.
- `npm run start`: run the production server.
- `npm run lint`: run Next.js lint rules.
- `npm test`: run Jest unit tests.

## Coding Style & Naming Conventions
- Use 2-space indentation in JSON/JS/TS as shown in config files.
- Follow TypeScript + Next.js conventions; keep React components in `PascalCase`.
- Prefer `kebab-case` for file names under `src/app` routes and `camelCase` for utilities in `src/lib`.
- Run `npm run lint` before opening a PR.

## Testing Guidelines
- Jest + `ts-jest` with tests under `src/**/__tests__`.
- Name tests `*.test.ts` or `*.test.tsx`.
- Run `npm test` for the full suite.

## Commit & Pull Request Guidelines
- Recent commits use Conventional Commits (e.g., `feat: ...`, `fix(scope): ...`).
- Write a clear description of behavior changes and include screenshots for UI changes.
- Link related issues if applicable.

## Configuration Notes
- Local environment files live in `.env.local` or `.env.*.local` and are ignored by git.
