# Repository Guidelines

## Project Structure & Module Organization
- `apps/web/` is the Next.js App Router frontend. UI lives in `apps/web/src/app`, and static assets are in `apps/web/public`.
- `apps/api/` is the Express + TypeScript backend. The current entrypoint is `apps/api/src/index.ts`, with folders reserved for `controllers/`, `routes/`, `services/`, and `middlewares/`.
- `prisma/prisma/` contains the Prisma schema and migrations (`prisma/prisma/schema.prisma`).
- `infra/` is present but currently empty, reserved for infrastructure definitions.

## Build, Test, and Development Commands
- `npm install` (repo root) installs workspace dependencies.
- `npm run dev --workspace web` starts the Next.js dev server (default `http://localhost:3000`).
- `npm run dev --workspace api` starts the API dev server (default `http://localhost:4000`).
- `npm run build --workspace web` builds the frontend for production.
- `npm run build --workspace api` compiles the API to `apps/api/dist`.
- `npm run start --workspace api` runs the compiled API build.
- `npm run lint --workspace web` runs ESLint for the frontend.

## Coding Style & Naming Conventions
- Use 2-space indentation, double quotes, and semicolons (match existing TypeScript files).
- Prefer descriptive component and module names (e.g., `MealPlanCard.tsx`, `userService.ts`).
- Keep API route handlers small; put logic in `services/` as the project grows.
- Frontend styling uses Tailwind CSS (see `apps/web/src/app/globals.css`).

## Testing Guidelines
- There is no test runner configured yet; `npm test` at the root exits with an error.
- If adding tests, introduce a workspace-level script and use standard naming like `*.test.ts` or `*.spec.ts` near the feature code.
- Note any new test setup steps in the PR description.

## Commit & Pull Request Guidelines
- This working copy has no Git history, so no convention is established. Use concise, imperative subjects (e.g., “Add health endpoint”) and optional scopes like `web:` or `api:`.
- PRs should include: a short summary, testing notes, and screenshots for UI changes.
- Link related issues or tasks when available.

## Configuration & Secrets
- Set `DATABASE_URL` before running Prisma commands or starting the API.
- Keep secrets in local `.env` files and avoid committing them.
