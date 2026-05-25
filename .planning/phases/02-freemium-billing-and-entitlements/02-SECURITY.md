---
phase: 02
slug: freemium-billing-and-entitlements
status: blocked
threats_open: 2
asvs_level: 1
created: 2026-05-25
register_authored_at_plan_time: true
---

# Phase 02 - Security

Per-phase security contract for freemium billing, quota enforcement, Mercado Pago checkout, webhook reconciliation, Pro UX, and entitlement downgrade behavior.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser to formula API | Authenticated users submit formula generate/explain requests. | Session cookie, localized formula input, quota outcome. |
| Formula API to quota ledger | Server reserves, confirms, or releases Free tool-use quota. | User id, meter kind, tool kind, reservation key, usage status. |
| Browser to billing checkout API | Authenticated users request hosted Pro checkout. | Session cookie, billing cycle. |
| App server to Mercado Pago | Server creates hosted checkout preference and fetches payment resources. | Mercado Pago access token, external reference, payment id, checkout URL. |
| Mercado Pago to webhook route | Provider sends payment notifications to local reconciliation endpoint. | Raw webhook body, signature headers, provider event id, payment resource id. |
| Billing services to entitlement state | Server activates, expires, or cancels local Pro entitlements. | User id, plan, cycle, provider payment id, period dates. |
| Server entitlement to workspace UI | Workspace renders Free/Pro state and support affordances from server state. | User entitlement, priority flag, recently revoked flag, support links. |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-01-01 | Elevation of privilege | Entitlement lookup and quota service | mitigate | Pro state resolved server-side through `getUserEntitlement`; quota bypass occurs only when server sees active Pro entitlement. Evidence: `apps/web/src/server/billing/entitlements.ts:5`, `apps/web/src/server/usage/quota-service.ts:35`. | closed |
| T-02-01-02 | Tampering | Usage ledger | mitigate | Reservation keys are server-generated and unique; active reservations count against capacity. Evidence: `prisma/schema.prisma:109`, `prisma/schema.prisma:116`, `apps/web/src/server/usage/quota-service.ts:58`, `apps/web/src/server/usage/quota-service.ts:73`. | closed |
| T-02-01-03 | Denial of service / race bypass | Quota transaction | mitigate | Quota reservation uses Prisma interactive transaction with serializable isolation and retries write conflicts. Evidence: `apps/web/src/server/usage/quota-service.ts:12`, `apps/web/src/server/usage/quota-service.ts:21`, `apps/web/src/server/usage/quota-service.ts:46`, `apps/web/src/server/usage/quota-service.ts:92`. | closed |
| T-02-01-04 | Repudiation | Usage lifecycle | mitigate | Usage lifecycle has explicit `reserved`, `confirmed`, and `released` states; confirm/release update only reserved rows. Evidence: `packages/shared/src/billing/schema.ts:8`, `apps/web/src/server/usage/quota-service.ts:97`, `apps/web/src/server/usage/quota-service.ts:114`. | closed |
| T-02-01-05 | Elevation of privilege | Formula generate/explain routes | mitigate | Formula routes reserve quota after auth/request validation and before AI work; clients cannot bypass by editing UI quota state. Evidence: `apps/web/src/app/api/tools/formula/generate/route.ts:25`, `apps/web/src/app/api/tools/formula/generate/route.ts:39`, `apps/web/src/app/api/tools/formula/explain/route.ts:25`, `apps/web/src/app/api/tools/formula/explain/route.ts:39`. | closed |
| T-02-01-06 | Tampering / denial of service | Failed formula requests | mitigate | Provider/validation failures release reservations instead of consuming quota; invalid requests fail before reservation. Evidence: `apps/web/src/app/api/tools/formula/generate/route.ts:19`, `apps/web/src/app/api/tools/formula/generate/route.ts:55`, `apps/web/src/app/api/tools/formula/explain/route.ts:19`, `apps/web/src/app/api/tools/formula/explain/route.ts:55`. | closed |
| T-02-02-01 | Elevation of privilege | Checkout API | mitigate | Checkout route requires authenticated current user before creating a provider preference. Evidence: `apps/web/src/app/api/billing/checkout/route.ts:7`, `apps/web/src/app/api/billing/checkout/route.ts:10`. | closed |
| T-02-02-02 | Tampering | Checkout correlation | mitigate | `externalReference` is generated server-side and stored with a unique database constraint. Evidence: `apps/web/src/server/billing/checkout-service.ts:20`, `apps/web/src/server/billing/checkout-service.ts:43`, `prisma/schema.prisma:129`, `prisma/schema.prisma:136`. | closed |
| T-02-02-03 | Information disclosure | Mercado Pago credentials | mitigate | Mercado Pago client and billing services import `server-only`; client-facing source search found no `MERCADO_PAGO_ACCESS_TOKEN` reference. Evidence: `apps/web/src/server/billing/mercado-pago-client.ts:1`, `apps/web/src/server/billing/checkout-service.ts:1`, `apps/web/src/server/billing/webhook-service.ts:1`. | closed |
| T-02-02-04 | Spoofing / tampering | Mercado Pago webhook signature | mitigate | Webhook route reads raw body, but signature validation does not follow Mercado Pago's current `x-signature` `ts/v1` manifest format and unsigned webhooks are accepted whenever `MERCADO_PAGO_WEBHOOK_SECRET` is unset. Evidence gap: `apps/web/src/app/api/billing/mercado-pago/webhook/route.ts:5`, `apps/web/src/server/billing/webhook-service.ts:21`, `apps/web/src/server/billing/webhook-service.ts:26`, `apps/web/src/server/billing/webhook-service.ts:44`. Required format source: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/payment-notifications | open |
| T-02-02-05 | Repudiation / replay | Payment event idempotency | mitigate | Provider events are keyed by unique `(provider, providerEventId)` and duplicates return without reprocessing. Evidence: `prisma/schema.prisma:146`, `prisma/schema.prisma:159`, `apps/web/src/server/billing/webhook-service.ts:63`, `apps/web/src/server/billing/webhook-service.ts:72`. | closed |
| T-02-02-06 | Tampering | Entitlement activation/revocation | mitigate | Webhook service fetches the provider payment resource and verifies checkout correlation before local entitlement mutation. Evidence: `apps/web/src/server/billing/webhook-service.ts:107`, `apps/web/src/server/billing/webhook-service.ts:129`, `apps/web/src/server/billing/webhook-service.ts:147`, `apps/web/src/server/billing/webhook-service.ts:175`. | closed |
| T-02-02-07 | Elevation of privilege | Billing return page | mitigate | Return page displays success only from server entitlement lookup, not provider query params; provider status is display-only. Evidence: `apps/web/src/app/(billing)/billing/return/page.tsx:18`, `apps/web/src/app/(billing)/billing/return/page.tsx:19`, `apps/web/src/app/(billing)/billing/return/page.tsx:21`, `apps/web/src/app/(billing)/billing/return/page.tsx:58`. | closed |
| T-02-03-01 | Elevation of privilege | Workspace Pro UI state | mitigate | Workspace resolves entitlement server-side and passes it to Topbar and FormulaTool. Evidence: `apps/web/src/app/(workspace)/workspace/page.tsx:10`, `apps/web/src/app/(workspace)/workspace/page.tsx:16`, `apps/web/src/app/(workspace)/workspace/page.tsx:22`, `apps/web/src/app/(workspace)/workspace/page.tsx:30`. | closed |
| T-02-03-02 | Elevation of privilege | Stale or forged client UI | mitigate | Server quota APIs still enforce limits regardless of UI; 429 quota responses are typed and cannot be suppressed into a successful API result. Evidence: `apps/web/src/app/api/tools/formula/generate/route.ts:27`, `apps/web/src/app/api/tools/formula/explain/route.ts:27`, `apps/web/src/features/formula/hooks/use-formula-stream.ts:61`, `apps/web/src/features/formula/hooks/use-formula-stream.ts:64`. | closed |
| T-02-03-03 | Tampering / open redirect style link risk | Pro support links | mitigate | Support email and WhatsApp URLs are read directly from public env in a client component and rendered into `href` without scheme/host validation or server-side allowlisting. Evidence gap: `apps/web/src/components/app/topbar.tsx:20`, `apps/web/src/components/app/topbar.tsx:21`, `apps/web/src/components/app/topbar.tsx:52`, `apps/web/src/components/app/topbar.tsx:57`. | open |
| T-02-03-04 | Information disclosure / stale state | Checkout return and workspace reload | mitigate | Checkout return and workspace load re-resolve entitlement from server state instead of trusting stored browser state. Evidence: `apps/web/src/app/(billing)/billing/return/page.tsx:19`, `apps/web/src/app/(workspace)/workspace/page.tsx:16`. | closed |
| T-02-03-05 | Spoofing / misleading claim | Priority copy | mitigate | Source search found no measurable speed claims such as `mais rapido`, `2x`, or guaranteed response time; only generic priority/support copy is present. Evidence: `apps/web/src/components/app/topbar.tsx:54`. | closed |
| T-02-03-06 | Tampering | Blocked-state checkout CTA | mitigate | Inline Pro CTA posts a server-validated monthly checkout request. Evidence: `apps/web/src/features/formula/components/formula-input-panel.tsx:127`, `apps/web/src/features/formula/components/formula-input-panel.tsx:130`, `packages/shared/src/billing/schema.ts:50`, `packages/shared/src/billing/schema.ts:52`. | closed |

Status: open = implementation evidence absent or insufficient; closed = mitigation found in code or verification artifact.

## Open Threats

| Threat ID | Severity | Mitigation Expected | Files Searched |
|-----------|----------|---------------------|----------------|
| T-02-02-04 | high | Parse `x-signature` into `ts` and `v1`, include `x-request-id` and `data.id` in the Mercado Pago manifest, compare generated HMAC with `v1`, add timestamp tolerance, and fail closed in production when `MERCADO_PAGO_WEBHOOK_SECRET` is absent. | `apps/web/src/app/api/billing/mercado-pago/webhook/route.ts`, `apps/web/src/server/billing/webhook-service.ts`, `apps/web/tests/mercado-pago-webhook.test.ts` |
| T-02-03-03 | medium | Build a server-side support config helper that validates `mailto:` email and WhatsApp HTTPS allowlisted host/path before rendering support links; reject or omit unsafe values. | `apps/web/src/components/app/topbar.tsx`, `.env.example`, `apps/web/tests/formula-ui.test.tsx` |

## Accepted Risks Log

No accepted risks.

## Threat Flags From Summaries

| Source | Flag | Mapping |
|--------|------|---------|
| 02-01-SUMMARY.md | No new threat surface beyond plan threat model. | Informational |
| 02-02-SUMMARY.md | Webhook signature validation implemented as optional; current audit found implementation gap against Mercado Pago format. | T-02-02-04 |
| 02-03-SUMMARY.md | Support URLs configured through env vars; current audit found missing URL validation/allowlisting. | T-02-03-03 |

## Verification Notes

- Automated verification from phase summaries: `auth-routes`, `quota-service`, `formula-api`, `billing-checkout`, `mercado-pago-webhook`, `formula-ui`, typecheck, and lint passed during phase execution.
- `pnpm exec prisma db push` was deferred in phase summaries because local PostgreSQL was not running.
- Playwright billing smoke was created but not run in the phase summary because it requires a dev server.
- `pnpm --filter web build` was not run in the phase summary because billing env vars must be configured.
- Additional security check run during this audit: client-facing search for `MERCADO_PAGO_ACCESS_TOKEN` and `MERCADO_PAGO_WEBHOOK_SECRET` returned no matches.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-25 | 19 | 17 | 2 | Codex gsd-secure-phase |

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [ ] `threats_open: 0` confirmed
- [ ] `status: verified` set in frontmatter

Approval: blocked 2026-05-25

## Gate Result

GSD > PHASE 02 SECURITY BLOCKED

2 threats open - phase advancement blocked until `threats_open: 0`.

Fix mitigations then re-run: `$gsd-secure-phase 2`.
