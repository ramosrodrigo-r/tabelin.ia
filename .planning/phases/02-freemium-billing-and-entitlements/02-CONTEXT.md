# Phase 2: Freemium Billing and Entitlements - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>

## Phase Boundary

Phase 2 delivers the monetization and entitlement slice for the existing authenticated formula workspace: strict free-tier usage enforcement, Pro checkout with Pix/card support through Mercado Pago, webhook-driven entitlement state, and visible Pro support/priority affordances.

This phase includes the reusable quota model needed for future chat and upload meters, but only the currently implemented formula generate/explain tool is actively metered now. This phase does not build scripts, SQL, regex, file analysis, OCR, charts, Pro table templates, team billing, or enterprise billing.

</domain>

<decisions>

## Implementation Decisions

### Usage Quota and Ledger

- **D-01:** A tool use counts only after a response is validated successfully. The server should reserve quota before the AI call to avoid race conditions, then confirm consumption only after structured validation passes.
- **D-02:** Provider failures, 5xx errors, invalid AI responses, or validation failures must release/refund the reservation and must not consume the user's free quota.
- **D-03:** Formula generation and formula explanation count equally. Every AI tool call in this phase consumes one use from the free limit of 4 tool uses per 12-hour window.
- **D-04:** Build a generic usage ledger now with a meter dimension such as `tool_use`, `chat_message`, and future upload-related meters. Chat quota is modeled now but not enforced until chat exists; in Phase 2 only formula usage is active.
- **D-05:** Pro is product-unlimited for normal use, subject to internal abuse safeguards. Pro users should not see tool/chat quota limits in normal workspace flows, but the server may keep technical rate limits or internal abuse/cost controls.

### Blocking and Upgrade UX

- **D-06:** When a Free user hits the 4-use limit, block inline inside the tool panel. Keep the user in the formula context, disable generate/explain actions, and show a Pro CTA in the same panel.
- **D-07:** The block message should be simple and should not show an exact reset time. It should say the free limit was reached and offer trying later or upgrading to Pro.
- **D-08:** The blocked-state CTA should start direct Pro checkout, not route through a separate pricing page first.
- **D-09:** Do not show a persistent quota counter during normal use. Show a warning only when the user has one free use remaining, so the workspace stays clean but the hard block does not feel surprising.

### Checkout and Billing

- **D-10:** The MVP should support both monthly and annual Pro from the start.
- **D-11:** Direct checkout from a blocked tool state should preselect monthly billing. The user explicitly corrected an earlier annual default back to monthly.
- **D-12:** Mercado Pago is the primary payment provider for Phase 2. Stripe is outside the MVP unless research finds a real technical blocker.
- **D-13:** Use hosted/redirected Mercado Pago checkout for the MVP. Do not build checkout transparente inside the app in this phase.
- **D-14:** Pro access is activated only after a confirmed webhook. The checkout return page may show a processing state until webhook reconciliation confirms payment.
- **D-15:** Webhooks must be idempotent and able to activate, update, expire, or revoke Pro entitlement state.

### Pro State, Support, and Priority

- **D-16:** Pro users should see a compact Pro badge in the topbar/account area. Quota warnings and blocked states disappear for Pro users.
- **D-17:** Pro support paths in the MVP should be simple links in the account/menu area: priority email and WhatsApp.
- **D-18:** Priority processing should be represented as an internal technical flag plus discreet Pro copy. Do not promise measurable faster responses until real queue/infrastructure priority exists.
- **D-19:** If a webhook revokes or expires the plan, the user is downgraded automatically to Free and sees an inline notice the next time a limited action is attempted.

### The Agent's Discretion

- Exact database model names, indexes, and transaction shape, as long as quota reservation/confirmation is atomic and safe under concurrent requests.
- Exact HTTP status codes and response payload names for quota-blocked requests, as long as the UI can distinguish blocked quota from validation/provider errors.
- Exact wording of Portuguese UI copy, as long as it is concise, native-sounding, and does not promise exact reset times or guaranteed faster processing.
- Exact monthly and annual prices are not locked by this discussion. Prefer configuration/provider price IDs instead of hardcoded business values unless another approved source defines prices.
- Exact Mercado Pago SDK/API shape should be researched during planning against current official docs.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope

- `PRD.md` - Original product requirements, monetization, Pix/card expectation, privacy constraints, and MVP module scope.
- `.planning/PROJECT.md` - Living project context, Brazil-first positioning, constraints, and key decisions.
- `.planning/REQUIREMENTS.md` - Checkable v1 requirements, especially QUOT-01, QUOT-02, QUOT-03, BILL-01, BILL-02, BILL-03, PRO-02, and PRO-03.
- `.planning/ROADMAP.md` - Phase 2 goal, success criteria, requirements, and plan outline.
- `.planning/research/STACK.md` - Recommended stack and Mercado Pago direction for Brazilian checkout.

### Prior Phase Decisions

- `.planning/phases/01-localized-formula-workspace/01-CONTEXT.md` - Workspace, formula contract, server-side AI, validation, copy-ready output, and deferred Phase 2 decisions.

### Existing Data and Server Integration

- `prisma/schema.prisma` - Current `User`, auth models, and `ToolRequest` persistence model that Phase 2 must extend or replace with a quota ledger.
- `apps/web/src/server/auth/session.ts` - Session cookie parsing and current `SessionUser` shape used by protected routes and workspace UI.
- `apps/web/src/server/tools/formula-repository.ts` - Existing formula metadata persistence after successful tool requests.
- `apps/web/src/app/api/tools/formula/generate/route.ts` - Formula generation route where quota reservation/checking must be inserted before AI work and confirmed after validation.
- `apps/web/src/app/api/tools/formula/explain/route.ts` - Formula explanation route with the same metering requirements as generation.

### Existing Workspace and UI Integration

- `apps/web/src/app/(workspace)/workspace/page.tsx` - Protected workspace shell and formula tool entry point.
- `apps/web/src/components/app/sidebar.tsx` - Existing workspace navigation and app brand area.
- `apps/web/src/components/app/topbar.tsx` - Existing topbar/account area where Pro badge and support links can attach.
- `apps/web/src/features/formula/formula-tool.tsx` - Formula feature state owner where blocked/remaining-use UI should integrate.
- `apps/web/src/features/formula/hooks/use-formula-stream.ts` - Client streaming hook that needs quota-blocked error handling.
- `apps/web/src/features/formula/components/formula-input-panel.tsx` - Input panel where generate/explain actions can be disabled and inline upgrade CTA shown.
- `apps/web/src/features/formula/components/formula-output-panel.tsx` - Output panel pattern for status, metadata, errors, and copy-ready results.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `ToolRequest` currently records successful formula requests with `toolKind`, `mode`, platform, language, separator, status, latency, and provider model. Phase 2 can either extend this or introduce a separate transactional usage ledger.
- Formula API routes already require an authenticated session and record metadata only after validated payload resolution. This aligns with the decision to consume quota only after successful validation.
- `FormulaTool`, `FormulaInputPanel`, `FormulaOutputPanel`, and `useFormulaStream` already centralize the formula interaction flow. Inline blocking, one-use-left warning, and quota error rendering should plug into this pattern.
- `Topbar` already receives the current user and is the natural place for a compact Pro badge and account/support entry.

### Established Patterns

- App code uses Next.js App Router route handlers under `apps/web/src/app/api`.
- Server-only behavior lives under `apps/web/src/server`.
- Shared Zod contracts live under `packages/shared` and should be used for quota/billing/webhook payload validation where appropriate.
- The current formula path streams NDJSON and renders copy-ready output only after structured payload validation.
- UI style is a quiet, dense workspace with sidebar/topbar/tool panels, not a marketing page.

### Integration Points

- Insert quota reservation before `resolveFormulaPayload(...)` in formula generate/explain routes, then confirm/release after validation outcome.
- Return a quota-blocked response that `useFormulaStream` can map to inline blocked UI instead of a generic provider failure.
- Add checkout creation route(s) for monthly/annual Pro, with blocked-state CTA creating monthly checkout by default.
- Add Mercado Pago webhook route with idempotent event reconciliation and entitlement updates.
- Add entitlement lookup to workspace rendering so topbar, tool panels, and server routes agree on Free vs Pro state.
- Add upload limit model hooks now only as schema/ledger foundation; actual file upload enforcement happens when upload features exist.

</code_context>

<specifics>

## Specific Ideas

- The most important blocked-state UX is contextual: the user should stay in the formula panel and see a direct path to Pro.
- The product should avoid exact reset-time promises in the limit message.
- The user should get a warning only on the final remaining free use.
- Monthly and annual Pro both exist, but blocked checkout starts monthly by default.
- Hosted Mercado Pago checkout is preferred over embedded payment UI for MVP speed and risk control.
- Pro activation waits for webhook confirmation; the return screen can show "processando" rather than granting access immediately.
- Priority should be truthful: show a discreet Pro priority state, but do not claim faster processing until infrastructure supports it.

</specifics>

<deferred>

## Deferred Ideas

- Stripe fallback or provider comparison - defer unless Mercado Pago has a real blocker during research/planning.
- Checkout transparente inside the app - possible future improvement after hosted checkout is working.
- Credits avulsos - rejected for this MVP because the requirement is Pro entitlement, not pay-as-you-go credits.
- Always-visible support buttons and internal support form - defer to avoid adding a separate support product surface.
- Promising measurable faster processing - defer until there is real queue or infrastructure priority.
- Actual chat message enforcement and upload processing enforcement - model the meters now, but enforce when those features exist.

</deferred>

---

*Phase: 02-freemium-billing-and-entitlements*
*Context gathered: 2026-05-25*
