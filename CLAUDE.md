# Operon Pulse — working rules

## What this is

- Operon Pulse is **Operon's internal team execution tool**. It is **not** the school product.
- Single workspace. Business timezone **Africa/Lagos** (`lib/utils/date.ts`).
- Stack: Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 3 · Supabase (Postgres + Auth).
- Reference for architecture, data model and known issues: `docs/PROJECT_OVERVIEW.md`.

## How to work

- **Before any change:** state the plan in 3–6 bullets, then implement.
- **Stay in scope:** keep changes to the current phase. No drive-by refactors.
- **Database changes:**
  - Every DB change is a **new numbered migration** in `supabase/migrations/`.
  - **Never edit an applied migration.**
  - Migrations are run **manually** in the Supabase SQL editor, so flag every new one in the task report.

## Before every commit

Run all four, and **don't commit if any fail**:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Git

- **Conventional commits:** `feat` / `fix` / `chore` / `refactor` / `test` / `docs`.
- **Push to `main`** after each completed task. Pushing requires the GitHub account `operonhub-hub`.

## End of every task

Report:

1. What changed
2. Files touched
3. Test results
4. Commit hash
5. Anything the owner must do manually (e.g. run a migration, set an env var)
