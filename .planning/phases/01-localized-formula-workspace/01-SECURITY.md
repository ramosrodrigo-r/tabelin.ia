---
phase: 01
slug: localized-formula-workspace
status: blocked
threats_open: 2
asvs_level: 1
created: 2026-05-24
updated: 2026-05-24
---

# Phase 01 - Security

Per-phase security contract for the localized formula workspace. This audit verifies mitigations declared in `01-01-PLAN.md`, `01-02-PLAN.md`, and `01-03-PLAN.md` against implemented code.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser to Next.js auth routes | Sign-up, sign-in, sign-out, and reset requests enter server route handlers. | Email, password, session cookies, reset request email |
| Browser to formula API routes | Authenticated formula generation and explanation requests enter same-origin server APIs. | User prompts, pasted formulas, platform/language selectors, session cookies |
| Next.js server to Postgres | Auth and tool metadata are persisted through Prisma. | User records, credential hashes, sessions schema, tool request metadata |
| Next.js server to OpenAI SDK | Provider integration is isolated to server-only code. | Provider API key, prompt payloads, generated responses |
| Formula stream to browser UI | NDJSON events drive draft output and validated completion state. | Metadata, deltas, warnings, validated formula/explanation payloads |
| Browser UI to clipboard | User-triggered copy writes only completed output. | Final formula or explanation steps |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-01-01 | Spoofing | Session cookies | mitigate | Session cookie is signed, expires, uses `httpOnly`, `sameSite: "lax"`, production `secure`, and is verified server-side. Evidence: `apps/web/src/server/auth/session.ts:35`, `apps/web/src/app/api/auth/[...all]/route.ts:135`. | closed |
| T-01-02 | Tampering / CSRF | Auth mutation routes | mitigate | Plan required CSRF protection per Better Auth guidance. Implemented custom auth routes do not show an explicit origin/CSRF token check; only `sameSite: "lax"` is present. Evidence searched: `apps/web/src/app/api/auth/[...all]/route.ts:105`, repo grep for `csrf`, `origin`, `referer`, `sec-fetch`. | open |
| T-01-03 | Information Disclosure | Password storage | mitigate | Passwords are hashed with random salt using scrypt and compared with `timingSafeEqual`. Evidence: `apps/web/src/server/auth/password.ts:1`. | closed |
| T-01-04 | Elevation of Privilege | Password reset | mitigate | Plan required reset tokens that expire and cannot be reused. Current custom reset route logs a URL containing the email and does not create or consume a token. Evidence: `apps/web/src/app/api/auth/[...all]/route.ts:111`; `prisma/schema.prisma:57` has a `Verification` model but the custom route does not use it. | open |
| T-01-05 | Spoofing | Workspace access | mitigate | `/workspace` performs a server-side session check and redirects signed-out users. Evidence: `apps/web/src/app/(workspace)/workspace/page.tsx:8`. | closed |
| T-01-06 | Information Disclosure | Client bundles | mitigate | Provider secrets are isolated from app UI/component paths. Evidence: `apps/web/src/server/ai/openai-client.ts:1`; `rg "OPENAI_API_KEY" apps/web/src/app apps/web/src/features apps/web/src/components --glob '!**/*.test.ts'` returned no matches. | closed |
| T-01-07 | Information Disclosure | OpenAI provider key | mitigate | OpenAI client is server-only and reads `OPENAI_API_KEY` only server-side. Evidence: `apps/web/src/server/ai/openai-client.ts:1`. | closed |
| T-01-08 | Spoofing | Formula API routes | mitigate | Generate/explain routes require a valid session cookie before request processing. Evidence: `apps/web/src/app/api/tools/formula/generate/route.ts:9`, `apps/web/src/app/api/tools/formula/explain/route.ts:9`. | closed |
| T-01-09 | Tampering | Formula request validation | mitigate | Formula routes parse request bodies with shared Zod schemas before provider work. Evidence: `apps/web/src/app/api/tools/formula/generate/route.ts:17`, `packages/shared/src/formula/schema.ts:9`. | closed |
| T-01-10 | Tampering | Formula completion payloads | mitigate | Copy-ready provider payloads are parsed through `formulaCompletePayloadSchema` before stream completion. Evidence: `apps/web/src/server/ai/formula-stream.ts:31`, `apps/web/src/server/ai/formula-stream.ts:55`, `packages/shared/src/formula/schema.ts:42`. | closed |
| T-01-11 | Information Disclosure | Formula metadata persistence | mitigate | Tool metadata stores user id, mode, platform, language, separator, status, latency, and provider model, without raw prompt/formula content. Evidence: `apps/web/src/server/tools/formula-repository.ts:7`. | closed |
| T-01-12 | Tampering | Client formula selectors/input | mitigate | UI validates required text input, keeps platform/language typed from shared constants, and server schemas remain authoritative. Evidence: `apps/web/src/features/formula/formula-tool.tsx:19`, `apps/web/tests/formula-ui.test.tsx:45`. | closed |
| T-01-13 | Information Disclosure | Clipboard copy | mitigate | Copy button is disabled until validated complete state and copies only final formula/explanation text. Evidence: `apps/web/src/features/formula/components/formula-output-panel.tsx:46`, `apps/web/src/features/formula/components/copy-button.tsx:19`. | closed |
| T-01-14 | Tampering | Partial stream output | mitigate | Stream draft is tracked separately from validated result; completion sets `result` only on a schema-validated `complete` event. Evidence: `apps/web/src/features/formula/hooks/use-formula-stream.ts:63`, `apps/web/src/features/formula/hooks/use-formula-stream.ts:99`. | closed |
| T-01-15 | Information Disclosure | UI error handling | mitigate | Client error state shows a generic message and preserves local input state for retry. Evidence: `apps/web/src/features/formula/hooks/use-formula-stream.ts:57`, `apps/web/src/features/formula/formula-tool.tsx:14`. | closed |
| T-01-16 | Spoofing / Information Disclosure | Formula route origin | mitigate | Browser client calls same-origin `/api/tools/formula/*` routes, not provider URLs. Evidence: `apps/web/src/features/formula/hooks/use-formula-stream.ts:38`. | closed |

## Accepted Risks Log

No accepted risks.

## Unregistered Flags

No explicit `## Threat Flags` sections were present in the phase summaries. The 01-01 summary records an auth hardening fix for durable credential hashing; this maps to T-01-03 and is closed.

## Open Threats

| Threat ID | Severity | Reason | Required Follow-Up |
|-----------|----------|--------|--------------------|
| T-01-02 | high | Auth mutation endpoints use cookies and do not show explicit CSRF/origin validation in the custom route facade. | Add CSRF/origin protection around sign-in, sign-up, sign-out, and reset POST routes, or route those actions through Better Auth's verified handlers and tests. |
| T-01-04 | high | Password reset flow does not create an expiring single-use token before logging/sending a reset URL. | Implement token creation, expiry, consumption, and reuse rejection using the auth framework or `Verification` model, then test expiry/reuse behavior. |

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-24 | 16 | 14 | 2 | Codex gsd-secure-phase |

## Security Audit 2026-05-24

| Metric | Count |
|--------|-------|
| Threats found | 16 |
| Closed | 14 |
| Open | 2 |

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [ ] `threats_open: 0` confirmed
- [ ] `status: verified` set in frontmatter

**Approval:** blocked 2026-05-24
