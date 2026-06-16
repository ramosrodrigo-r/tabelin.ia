# SECURITY AUDIT — 260615-ns8 / 260616-dw3 / 260616-o50

**Scope:** auth/session surface modified by the last three quick tasks  
**Date:** 2026-06-16  
**Auditor:** automated static analysis (Claude Sonnet 4.6)  
**Verdict: PASS WITH NOTES** — no critical or high findings; two medium/low observations documented below.

---

## Executive Summary

The three quick tasks correctly migrated the authentication stack from a manual cookie+hash implementation to Better Auth 1.6.11. Every protected API route verified enforces server-side session checks before touching user data. The auth gate on the workspace is explicitly layered (UX overlay on top of server-side session enforcement), and sensitive environment variables are never exposed to the client bundle. Two low-severity observations are documented.

---

## STRIDE Threat Assessment

| # | Threat (STRIDE) | Question Asked | Finding | Severity |
|---|-----------------|----------------|---------|----------|
| S-01 | **Spoofing — Session token validation** | Does every protected API route call `getSessionFromCookieHeader` or `getCachedUser` before returning any user data? | MITIGATED | — |
| S-02 | **Spoofing — Auth gate bypass via direct navigation** | Can an unauthenticated user navigate to `/workspace` and access real data without a session? | MITIGATED | — |
| T-01 | **Tampering — Auth gate is UX-only** | Is client-side `AuthGate` the only protection, or is there a server-side guard? | MITIGATED | — |
| T-02 | **Tampering — Auto-save fires for unauthenticated users** | Does `WorkspaceStateProvider` fire POST `/api/workspace/state` even when the overlay is shown? | FINDING (LOW) | Low |
| I-01 | **Information Disclosure — Preview leaks user data** | Does the "locked preview" shown to unauthenticated users contain real user data? | MITIGATED | — |
| I-02 | **Information Disclosure — `BETTER_AUTH_SECRET` in client bundle** | Does `next.config.ts` or any source file expose the secret via `NEXT_PUBLIC_` or `env:` export? | MITIGATED | — |
| E-01 | **Elevation of Privilege — Workspace page fetches conversation history without auth guard** | Is `findUnifiedConversationExchanges` called for unauthenticated users? | MITIGATED | — |
| C-01 | **CSRF — Auth routes protected by Better Auth origin check** | Does `toNextJsHandler(auth.handler)` enforce origin validation on POST requests to `/api/auth/*`? | MITIGATED | — |
| C-02 | **CSRF — App API routes (chat, conversations, workspace) protected** | Do app routes under `/api/(chat|conversations|workspace)` need CSRF tokens? | NOTE (LOW) | Low |
| D-01 | **Denial of Service — Brute-force on sign-in/sign-up** | Is there rate limiting on auth endpoints? | CONDITIONAL | — |

---

## Closed Threats (MITIGATED)

### S-01 — Session validation on every protected route

All five API route files were read. The auth catch-all at `apps/web/src/app/api/auth/[...all]/route.ts` (line 5) requires no session check — it IS the Better Auth handler. Every other route validates before processing:

| Route | Check | Position |
|-------|-------|----------|
| `api/chat/unified/route.ts` | `getSessionFromCookieHeader(request.headers.get("cookie"))` | line 275 — first statement in `POST` |
| `api/conversations/unified/route.ts` | `getSessionFromCookieHeader(...)` | line 13 — first statement in `DELETE` |
| `api/workspace/import/route.ts` | `getSessionFromCookieHeader(...)` | line 66 — first statement in `POST` |
| `api/workspace/state/route.ts` | `getSessionFromCookieHeader(...)` | line 15 — first statement in `POST` |

All four return HTTP 401 immediately if `user` is null. No route processes payload before the session check.

`getSessionFromCookieHeader` in `apps/web/src/server/auth/session.ts` delegates unconditionally to `auth.api.getSession` (line 27), which validates the session token in the database via the Prisma adapter — no JWT-only validation, no client-trust shortcut.

### S-02 / E-01 — Workspace page and layout do not serve real data to unauthenticated users

`apps/web/src/app/(workspace)/workspace/layout.tsx` (lines 24-26):

```ts
const initialSpec = user
  ? ((await getActiveSpreadsheetSpec(user.id)) ?? undefined)
  : SAMPLE_SPEC;
```

`apps/web/src/app/(workspace)/workspace/page.tsx` (lines 11-13):

```ts
if (!user) {
  return <UnifiedChatTool initialExchanges={[]} />;
}
```

Both branches guard with `user` (result of `getCachedUser()`, which wraps `getCurrentUser()` → `auth.api.getSession`). Unauthenticated visitors receive only the static `SAMPLE_SPEC` (a hardcoded demo table: "Controle de Gastos" with five dummy rows) and an empty conversation list. No real user data reaches the rendered HTML.

### T-01 — Auth gate layering (UX vs server-side)

The `AuthGate` component (`auth-gate.tsx`) is explicitly marked as a UX-only layer in its own JSDoc: "T-dw3-02: o gate é UX; a proteção real é server-side." The actual data isolation happens at the server components (S-02 above) and API route guards (S-01 above). The overlay is defense-in-depth for UX, not the sole protection.

### I-01 — Preview shows only SAMPLE_SPEC, never user data

Confirmed by reading `apps/web/src/features/unified-chat/lib/sample-spec.ts`: the data is a static hardcoded object with fictional entries (Aluguel, Supermercado, etc.). It is not loaded from the database. The database access path (`getActiveSpreadsheetSpec(user.id)`) is only reached when `user` is non-null.

### I-02 — BETTER_AUTH_SECRET not exposed to client bundle

`next.config.ts` uses `loadEnv` from the `dotenv` package to populate `process.env` server-side. It does not use Next.js's `env:` key in `nextConfig`, which would expose variables to the browser. No file in the audited set references `NEXT_PUBLIC_BETTER_AUTH_SECRET`, `NEXT_PUBLIC_DATABASE_URL`, or any similar pattern. The secret is consumed only in `apps/web/src/server/auth/config.ts` (a server-only module with no client import chain reachable from the audited files).

### C-01 — CSRF on Better Auth routes

`toNextJsHandler(auth.handler)` wires the full Better Auth request pipeline. The `originCheckMiddleware` is registered at the router level (`dist/api/index.mjs`, line 158) and is invoked for every non-GET/OPTIONS/HEAD request. The `validateOrigin` function (verified in `dist/api/middlewares/origin-check.mjs`, lines 91-108) checks the `Origin` or `Referer` header against `trustedOrigins`. The config (`apps/web/src/server/auth/config.ts`, line 18) sets `trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"]`, so cross-origin requests to `/api/auth/*` from any other origin are rejected with HTTP 403.

---

## Findings

### FINDING-01 (Low) — Auto-save fires for unauthenticated users, generating noisy 401s

**File:** `apps/web/src/components/app/workspace-state-context.tsx`, line 218  
**Severity:** Low

**Description:**  
`WorkspaceStateProvider` is rendered unconditionally for all visitors (both authenticated and unauthenticated) by `WorkspaceShell`, which wraps the entire layout including the locked preview. The `useEffect` at line 214 fires whenever `specJson` changes. For an unauthenticated visitor, the initial state is `SAMPLE_SPEC`. If the user types in the grid (which is not blocked at the DOM level — only the overlay captures clicks, but keyboard navigation might reach the grid in some browsers/AT), `specJson` will change and a POST will be sent to `/api/workspace/state`.

The server correctly returns HTTP 401, and the client silently ignores the error (line 228: `catch(() => {})`). No data is written and no user session is created. However:

1. The 401 responses will appear in server logs, which could mask real auth errors.
2. The behavior relies on the overlay's `pointer-events: auto` covering the grid. If CSS fails to load (CDN outage, CSP misconfiguration), a visitor could interact with the grid and trigger repeated unauthenticated POST attempts.

**Remediation:**  
Pass `isAuthenticated` as a prop to `WorkspaceStateProvider` (or `WorkspaceShell`) and gate the `useEffect` that fires the auto-save:

```ts
useEffect(() => {
  if (!isAuthenticated) return;  // add this guard
  if (specJson === lastSavedRef.current) return;
  // ... existing debounce logic
}, [specJson, isAuthenticated]);
```

This is a defense-in-depth improvement, not a security blocker — the API route rejects unauthenticated requests correctly.

---

### FINDING-02 (Low) — Rate limiting on auth routes is disabled in development/non-production

**File:** `apps/web/src/server/auth/config.ts` (no `rateLimit` key set)  
**Evidence:** `dist/context/create-context.mjs`, line 168: `enabled: options.rateLimit?.enabled ?? isProduction`  
**Severity:** Low

**Description:**  
Better Auth's built-in rate limiter defaults to **disabled in development** (`isProduction === false`). In production it uses in-memory storage with a default window of 10 seconds and max 100 requests. In-memory storage is reset on every process restart/deployment, and is not shared across multiple instances (Vercel/Railway horizontal scaling).

For the `/api/auth/sign-in/email` and `/api/auth/sign-up/email` endpoints, this means:

- In development: unlimited brute-force is possible — acceptable for local dev.
- In production (single instance): 100 requests / 10 seconds per IP — provides basic protection.
- In production (multi-instance): rate limit state is not shared across replicas; effective limit is multiplied by instance count.

**Remediation:**  
For a multi-instance production deployment, configure `rateLimit.storage` to use a shared secondary storage (Redis). For the current single-instance deployment, the default is adequate. Document the assumption explicitly in `config.ts`:

```ts
// Rate limiting: Better Auth defaults to 100 req/10s in production (in-memory).
// If the deployment scales horizontally, switch to:
//   rateLimit: { storage: "secondary-storage" }
// and configure a Redis secondaryStorage adapter.
```

---

## Conditional Finding (informational)

### D-01 — Rate limiting conditional on `NODE_ENV`

As documented in FINDING-02, the rate limiter is `enabled: isProduction`. This is the Better Auth default. No custom `rateLimit` config is present in `config.ts`. In the current deployment model (single instance, production), this is sufficient. No action required unless the app scales horizontally.

---

## Out of Scope

The following were not modified by the audited tasks and were not examined:

- Prisma schema and database-level access controls
- Email delivery for password reset (currently `console.info` — acceptable per the config comment)
- Session expiry and token rotation configuration (Better Auth defaults: 30-day session, 1-day token refresh — not overridden in `config.ts`)
- OAuth / social login (not enabled in current config)
