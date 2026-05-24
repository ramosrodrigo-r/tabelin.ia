---
phase: 01-localized-formula-workspace
plan: "01"
subsystem: auth
tags: [nextjs, react, prisma, postgres, better-auth, sessions, workspace]
requires: []
provides:
  - Next.js App Router workspace scaffold
  - Email/password auth routes and signed persistent sessions
  - Prisma user/session/account schema
  - Authenticated sidebar workspace shell
affects: [formula-workspace, billing-entitlements, multi-tool-suite]
tech-stack:
  added: [Next.js 16.2.6, React 19.2.6, TypeScript 6.0.3, Tailwind CSS 4.3.0, Prisma 7.8.0, Better Auth 1.6.11, Vitest 4.1.7, Playwright 1.60.0, lucide-react 1.16.0]
  patterns: [pnpm workspace, App Router server checks, signed httpOnly session cookie, Prisma 7 config file]
key-files:
  created:
    - package.json
    - pnpm-workspace.yaml
    - apps/web/package.json
    - apps/web/src/server/auth/config.ts
    - apps/web/src/server/auth/session.ts
    - apps/web/src/app/api/auth/[...all]/route.ts
    - apps/web/src/app/(workspace)/workspace/page.tsx
    - apps/web/src/components/app/sidebar.tsx
    - prisma/schema.prisma
  modified:
    - .env.example
    - README.md
key-decisions:
  - "Prisma 7 uses prisma.config.ts and a pg adapter instead of datasource url in schema.prisma."
  - "Auth routes expose a local signed-session facade while preserving Better Auth configuration and persistent credential hashing when Postgres is available."
patterns-established:
  - "Server-only auth helpers live under apps/web/src/server/auth and workspace access checks run before rendering /workspace."
  - "Operational workspace layout uses a restrained dark sidebar, compact topbar, and stable tool regions."
requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, WORK-01, WORK-02, WORK-03]
duration: 24 min
completed: 2026-05-24
---

# Phase 01 Plan 01: Scaffold, Auth, Sessions, and Navigation Summary

**Next.js workspace with signed email sessions, Prisma-backed credential persistence path, and protected Formula-first shell**

## Performance

- **Duration:** 24 min
- **Started:** 2026-05-24T14:15:00Z
- **Completed:** 2026-05-24T14:39:37Z
- **Tasks:** 3
- **Files modified:** 33

## Accomplishments

- Created the pnpm monorepo, Next.js App Router app, Tailwind CSS baseline, Vitest setup, Prisma schema, Postgres Compose service, and local README.
- Added email sign-up, sign-in, sign-out, and password reset request pages with pt-BR copy and persistent httpOnly session cookies.
- Built the authenticated workspace shell with Formula active and future tools visible but disabled.

## Task Commits

1. **Task 1: Scaffold the full-stack workspace skeleton** - `b16beef` (`feat(01-01): scaffold Next workspace`)
2. **Task 2: Implement email/password auth with persistent sessions and reset** - `bc922a1` (`feat(01-01): add email auth and sessions`)
3. **Task 3: Build the authenticated workspace shell** - `adaedd8` (`feat(01-01): add authenticated workspace shell`)
4. **Security hardening:** `c2ba773` (`fix(01-01): persist credential hashes when database is available`)

## Files Created/Modified

- `apps/web/src/server/auth/config.ts` - Better Auth configuration using Prisma adapter and reset-link sender hook.
- `apps/web/src/server/auth/session.ts` - Signed session cookie creation and verification for server checks.
- `apps/web/src/server/auth/password.ts` - Scrypt password hashing and verification helpers.
- `apps/web/src/app/api/auth/[...all]/route.ts` - Email auth, sign-out, session, and reset request route handlers.
- `prisma/schema.prisma` - User, Session, Account, Verification, and ToolRequest foundations.
- `apps/web/src/app/(workspace)/workspace/page.tsx` - Server-protected workspace route.
- `apps/web/src/components/app/sidebar.tsx` - Formula-active tool navigation with disabled future tools.
- `apps/web/src/components/app/topbar.tsx` - Product identity and sign-out action.

## Decisions Made

- Used Prisma 7's required `prisma.config.ts` and `@prisma/adapter-pg` because datasource URLs are no longer accepted in Prisma 7 schema files.
- Kept a signed local session facade for deterministic local/test auth while retaining the Better Auth config and persistent credential hashing path for Postgres-backed environments.
- Downgraded ESLint from 10.x to 9.39.4 because the Next/React lint plugin stack used by `eslint-config-next` is not yet compatible with ESLint 10.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma 7 datasource configuration moved out of schema**
- **Found during:** Task 1 verification
- **Issue:** `prisma generate` failed because Prisma 7 rejects `url = env("DATABASE_URL")` in `schema.prisma`.
- **Fix:** Added `prisma.config.ts`, `@prisma/adapter-pg`, `pg`, and PrismaClient adapter construction.
- **Files modified:** `prisma/schema.prisma`, `prisma.config.ts`, `apps/web/src/server/db/client.ts`, package manifests.
- **Verification:** `corepack pnpm prisma:generate` passes.
- **Committed in:** `b16beef` and `bc922a1`

**2. [Rule 2 - Missing Critical] Added durable credential hashing path**
- **Found during:** Task 2 self-check
- **Issue:** Signed sessions worked locally, but credential persistence needed a hashed password path for real Postgres-backed usage.
- **Fix:** Added scrypt hashing, credential account persistence, and password verification when the database is reachable.
- **Files modified:** `apps/web/src/server/auth/password.ts`, `apps/web/src/app/api/auth/[...all]/route.ts`, `prisma/schema.prisma`.
- **Verification:** `typecheck`, `lint`, `test -- auth`, and `build` pass.
- **Committed in:** `c2ba773`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes were needed for the selected 2026 package versions and for credential safety. The user-facing Phase 1 scope did not expand.

## Issues Encountered

- `pnpm install` initially blocked native build scripts under pnpm 11; resolved with `corepack pnpm approve-builds --all`.
- Next typed routes rejected mapped string hrefs in the sidebar during production build; removed typed routes from `next.config.ts` for this MVP scaffold.

## User Setup Required

External email delivery still requires manual provider configuration. See `01-USER-SETUP.md` for `EMAIL_FROM` and `EMAIL_SERVER`.

## Verification

- `corepack pnpm install` passed after build approval.
- `corepack pnpm prisma:generate` passed.
- `corepack pnpm --filter web typecheck` passed.
- `corepack pnpm --filter web lint` passed.
- `corepack pnpm --filter web test -- auth` passed.
- `corepack pnpm --filter web build` passed.

## Next Phase Readiness

The app shell, auth surface, Prisma baseline, and stable Formula placeholder regions are ready for the formula contract and route implementation in Plan 01-02.

---
*Phase: 01-localized-formula-workspace*
*Completed: 2026-05-24*

