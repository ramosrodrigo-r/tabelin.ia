# Walking Skeleton - Tabelin.IA

**Phase:** 1
**Generated:** 2026-05-23

## Capability Proven End-to-End

A signed-in user can open the workspace, see Formula as the active tool, submit a localized formula request through a server route, receive a validated streamed result, and copy it.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js App Router in `apps/web` | Fastest deployable full-stack path with route handlers and streaming UI. |
| Data layer | PostgreSQL + Prisma | Supports users, sessions, password reset, and future usage ledger/history metadata. |
| Auth | Better Auth email/password | Matches Phase 1 requirements and keeps auth TypeScript-first inside the project. |
| AI boundary | Server-only route handlers and `src/server/ai/*` modules | Prevents provider key exposure and centralizes validation/quota hooks. |
| Directory layout | `apps/web`, `packages/shared`, `prisma` | Preserves a clean path to shared contracts and later Fastify extraction. |
| Deployment target | Local full-stack run first | Phase 1 proves the stack locally before external deployment decisions. |

## Stack Touched in Phase 1

- [ ] Project scaffold: pnpm workspace, Next.js app, TypeScript, lint, test runner.
- [ ] Routing: auth routes, workspace route, formula API route handlers.
- [ ] Database: real user/session persistence and tool request metadata write.
- [ ] UI: auth forms, sidebar workspace, formula input/output interaction.
- [ ] Dev run: documented local command for web app plus Postgres.

## Out of Scope

- Billing, quota enforcement, and Pro plan state.
- Scripts, SQL, regex, upload, OCR, chart, and report tools.
- Saved history UI beyond metadata persistence needed for future phases.
- Production email provider selection beyond an adapter and env contract.
- Separate Fastify app unless route handlers reveal a hard blocker during execution.

## Subsequent Slice Plan

- Phase 2: Add quota ledger, Pro plan state, Pix/card checkout, and entitlement UI.
- Phase 3: Reuse the tool contract for scripts, SQL, regex, and Pro templates.
- Phase 4: Add file upload, schema extraction, file chat, reports, and privacy lifecycle.
- Phase 5: Add OCR table reconstruction, chart rendering, and launch hardening.
