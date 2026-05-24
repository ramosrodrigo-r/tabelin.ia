# Phase 1 - Pattern Map

**Generated:** 2026-05-23
**Scope:** Localized Formula Workspace
**Codebase state:** Greenfield; no application source files exist yet.

## Summary

There are no reusable app files or existing implementation analogs in this repository. Pattern guidance must therefore come from the planning artifacts and the chosen stack:

- `.planning/phases/01-localized-formula-workspace/01-CONTEXT.md`
- `.planning/phases/01-localized-formula-workspace/01-RESEARCH.md`
- `.planning/phases/01-localized-formula-workspace/01-UI-SPEC.md`
- `.planning/research/STACK.md`
- `.planning/research/ARCHITECTURE.md`
- `AGENTS.md`

## Intended Patterns

| Planned Area | Closest Existing Analog | Required Pattern |
|--------------|-------------------------|------------------|
| Next.js app shell | none | App Router under `apps/web/src/app`, with server/client boundaries explicit. |
| Auth | none | Better Auth config isolated in `apps/web/src/server/auth/*`; no auth secrets in client code. |
| Database | none | Prisma client isolated in `apps/web/src/server/db/*`; schema in `prisma/schema.prisma`. |
| Formula contracts | none | Shared Zod schemas and constants under `packages/shared/src/formula/*`. |
| AI calls | none | Server-only modules under `apps/web/src/server/ai/*`, called by route handlers. |
| Formula UI | none | Feature folder under `apps/web/src/features/formula/*`, compact operational UI from UI-SPEC. |
| Tests | none | Vitest for contracts/prompts; Playwright for auth/formula/copy user flows. |

## Cross-Cutting Constraints

- Keep provider keys and AI SDK imports out of client bundles.
- Keep platform/language/separator values as typed shared constants, not duplicated strings.
- Validate AI output before marking content copy-ready.
- Persist only request/output metadata needed for future quotas/history foundation.
- Use compact, accessible controls and icon buttons from `lucide-react`.

## PATTERN MAPPING COMPLETE
