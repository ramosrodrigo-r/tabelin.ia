---
phase: 01-localized-formula-workspace
status: clean
reviewed: 2026-05-24
depth: standard
files_reviewed:
  - apps/web/src/app/api/auth/[...all]/route.ts
  - apps/web/src/app/api/tools/formula/generate/route.ts
  - apps/web/src/app/api/tools/formula/explain/route.ts
  - apps/web/src/features/formula/formula-tool.tsx
  - apps/web/src/features/formula/hooks/use-formula-stream.ts
  - apps/web/src/features/formula/components/formula-input-panel.tsx
  - apps/web/src/features/formula/components/formula-output-panel.tsx
  - apps/web/src/features/formula/components/copy-button.tsx
  - apps/web/src/server/auth/session.ts
  - apps/web/src/server/auth/password.ts
  - apps/web/src/server/tools/formula-repository.ts
  - packages/shared/src/formula/schema.ts
---

# Phase 01 Code Review

## Status

Clean after one fix.

## Findings

### Fixed During Review

**Warning: Dev auth fallback could become a production auth bypass if the database were unavailable.**

- **File:** `apps/web/src/app/api/auth/[...all]/route.ts`
- **Issue:** The local signed-session fallback was useful for development and E2E without Postgres, but the same catch branch would also have allowed sign-in/sign-up during a production database outage.
- **Fix:** Production now returns `503` when credential persistence fails. The signed local facade remains available only outside production.
- **Commit:** `dead181` (`fix(01): block auth fallback in production`)
- **Verification:** `test -- auth formula-api formula-ui`, `typecheck`, and `lint` pass.

## Residual Risk

- Metadata persistence intentionally degrades when local Postgres is unavailable. Phase 2 quota enforcement must replace this with transactional reservation semantics before usage limits can be trusted.
- Real provider calls are not exercised without `OPENAI_API_KEY`; current tests use deterministic route-level fixtures.

## Verification

- `corepack pnpm --filter web test -- auth formula-api formula-ui` passed.
- `corepack pnpm --filter web typecheck` passed.
- `corepack pnpm --filter web lint` passed.

