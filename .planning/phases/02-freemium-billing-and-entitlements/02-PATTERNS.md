# Phase 2 - Pattern Map

**Generated:** 2026-05-25
**Scope:** Freemium Billing and Entitlements
**Inputs:** `02-CONTEXT.md`, `02-RESEARCH.md`, current app code

## Summary

Phase 2 is not greenfield. It extends the existing authenticated Formula workspace and existing server route/module patterns.

The closest existing analogs are:

- Formula API route handlers for authenticated server work.
- Formula repository module for Prisma persistence after validated tool output.
- Formula client hook and panels for streaming/error/UI state.
- Topbar/account area for compact Pro state.
- Prisma schema with `User`, auth models, and `ToolRequest`.

## Pattern Table

| Planned Area | Closest Existing Analog | Required Pattern |
|--------------|-------------------------|------------------|
| Quota service | `apps/web/src/server/tools/formula-repository.ts` | Keep DB persistence in `apps/web/src/server/*`; route handlers should call service functions, not inline quota queries. |
| Formula route gating | `apps/web/src/app/api/tools/formula/generate/route.ts`, `explain/route.ts` | Validate auth and request first, reserve quota before AI work, confirm/release after validated success/failure. |
| Billing routes | Existing App Router API routes | Add route handlers under `apps/web/src/app/api/billing/**/route.ts`; keep Mercado Pago credentials server-only. |
| Webhook route | Next.js route handler pattern | Use `request.text()` before parsing if signature validation needs raw body. Return 200/201 after idempotent event persistence/reconciliation. |
| Data model | `prisma/schema.prisma` | Extend Prisma schema with ledger, entitlement, checkout, and provider event models; add indexes/unique constraints for idempotency. |
| Workspace Pro state | `apps/web/src/app/(workspace)/workspace/page.tsx`, `Topbar` | Resolve entitlement server-side and pass compact state to topbar/tool UI. |
| Inline quota UX | `FormulaTool`, `FormulaInputPanel`, `useFormulaStream` | Model quota blocked/last-use warning as typed UI state, not a generic error string. |
| Copy/status display | `FormulaOutputPanel` | Preserve dense panel layout and metadata/status affordances; avoid modal-first blocking. |
| Tests | `apps/web/tests/formula-api.test.ts`, `formula-ui.test.tsx`, `tests/e2e/formula.spec.ts` | Add Vitest API/service/UI tests and a mocked E2E smoke path for quota -> checkout -> webhook -> Pro. |

## Concrete Existing Patterns

### Authenticated Route Handler

Read first:

- `apps/web/src/app/api/tools/formula/generate/route.ts`
- `apps/web/src/app/api/tools/formula/explain/route.ts`
- `apps/web/src/server/auth/session.ts`

Pattern to reuse:

- Get user from `getSessionFromCookieHeader(request.headers.get("cookie"))`.
- Return `401` JSON with Portuguese copy if unauthenticated.
- Parse JSON body and validate with shared Zod schema before server work.
- Keep provider/server modules behind route handlers.

Phase 2 adjustment:

- Add quota reservation after request validation and before `resolveFormulaPayload(...)`.
- Confirm usage only after validated payload exists.
- Release reservation on provider/validation errors.

### Prisma Persistence Module

Read first:

- `apps/web/src/server/tools/formula-repository.ts`
- `apps/web/src/server/db/client.ts`
- `prisma/schema.prisma`

Pattern to reuse:

- Keep Prisma calls inside server modules.
- Route handlers pass typed inputs to service/repository functions.
- Current `ToolRequest` is metadata, not a safe quota ledger.

Phase 2 adjustment:

- Add dedicated billing/usage modules such as `apps/web/src/server/billing/*` and `apps/web/src/server/usage/*`.
- Use interactive transactions for reservation/confirmation where concurrent calls can race.
- Add provider event idempotency constraints.

### Client Tool State

Read first:

- `apps/web/src/features/formula/hooks/use-formula-stream.ts`
- `apps/web/src/features/formula/formula-tool.tsx`
- `apps/web/src/features/formula/components/formula-input-panel.tsx`
- `apps/web/src/features/formula/components/formula-output-panel.tsx`

Pattern to reuse:

- Feature owns local tool state.
- Hook maps route response/stream events into typed status.
- Panels render concise validation, loading, error, metadata, and copy states.

Phase 2 adjustment:

- Extend client state with quota-specific outcomes such as `quotaBlocked` and `lastFreeUse`.
- Disable submit in inline blocked state.
- CTA calls billing checkout route and redirects to provider URL.

### Workspace Account Area

Read first:

- `apps/web/src/app/(workspace)/workspace/page.tsx`
- `apps/web/src/components/app/topbar.tsx`
- `apps/web/src/styles/globals.css`

Pattern to reuse:

- Workspace page is server-rendered and protected.
- `Topbar` receives the current user and handles account actions.
- Existing UI uses restrained panels, 6-8px radii, compact type, and no marketing composition.

Phase 2 adjustment:

- Pass entitlement state to `Topbar` and `FormulaTool`.
- Add compact Pro badge and support links without a persistent billing card.

## Files Likely Modified

- `prisma/schema.prisma`
- `.env.example`
- `apps/web/package.json`
- `apps/web/src/server/usage/*`
- `apps/web/src/server/billing/*`
- `apps/web/src/app/api/tools/formula/generate/route.ts`
- `apps/web/src/app/api/tools/formula/explain/route.ts`
- `apps/web/src/app/api/billing/checkout/route.ts`
- `apps/web/src/app/api/billing/mercado-pago/webhook/route.ts`
- `apps/web/src/app/(workspace)/workspace/page.tsx`
- `apps/web/src/components/app/topbar.tsx`
- `apps/web/src/features/formula/*`
- `packages/shared/src/billing/*` or `packages/shared/src/index.ts`
- `apps/web/tests/*billing*`
- `apps/web/tests/*quota*`
- `apps/web/tests/formula-api.test.ts`
- `apps/web/tests/formula-ui.test.tsx`
- `apps/web/tests/e2e/billing.spec.ts`

## Landmines

- Do not count `ToolRequest` rows as quota directly; reservations/releases need a separate lifecycle.
- Do not trust Mercado Pago return URL query params for entitlement activation.
- Do not hold a DB transaction open while calling Mercado Pago or OpenAI.
- Do not expose Mercado Pago access tokens or webhook secrets to client components.
- Do not promise faster Pro processing beyond a technical priority flag until actual queue infrastructure exists.
- Verify current session user IDs line up with persisted `User.id`; the existing session helper derives IDs from email HMAC while Prisma `User.id` is `cuid()`.

## PATTERN MAPPING COMPLETE
