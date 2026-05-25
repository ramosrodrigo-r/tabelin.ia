---
phase: 02-freemium-billing-and-entitlements
reviewed: 2026-05-25T00:00:00Z
depth: quick
files_reviewed: 18
files_reviewed_list:
  - apps/web/src/app/(billing)/billing/return/page.tsx
  - apps/web/src/app/(workspace)/workspace/page.tsx
  - apps/web/src/app/api/auth/[...all]/route.ts
  - apps/web/src/app/api/billing/checkout/route.ts
  - apps/web/src/app/api/billing/mercado-pago/webhook/route.ts
  - apps/web/src/app/api/tools/formula/explain/route.ts
  - apps/web/src/app/api/tools/formula/generate/route.ts
  - apps/web/src/components/app/topbar.tsx
  - apps/web/src/features/formula/components/formula-input-panel.tsx
  - apps/web/src/features/formula/formula-tool.tsx
  - apps/web/src/features/formula/hooks/use-formula-stream.ts
  - apps/web/src/server/billing/checkout-service.ts
  - apps/web/src/server/billing/entitlements.ts
  - apps/web/src/server/billing/mercado-pago-client.ts
  - apps/web/src/server/billing/webhook-service.ts
  - apps/web/src/server/usage/quota-service.ts
  - apps/web/src/server/usage/quota-types.ts
  - packages/shared/src/billing/schema.ts
findings:
  critical: 3
  warning: 4
  info: 0
  total: 7
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-25T00:00:00Z
**Depth:** quick
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Quick pattern-matching review of 18 source files in the freemium billing and entitlements phase identified **3 critical security/logic issues** and **4 warnings** related to data validation, error handling, and webhook verification.

Key concerns:
1. **Webhook signature validation can be bypassed** in development/test environments without proper safeguards
2. **Auth session secrets leak into fallback** when environment variable is missing
3. **Insufficient input validation** on sensitive billing operations and user ID parameters

## Critical Issues

### CR-01: Webhook Signature Validation Can Be Bypassed in Non-Production

**File:** `apps/web/src/server/billing/webhook-service.ts:37-46`

**Issue:** The webhook signature validation is completely skipped if `MERCADO_PAGO_WEBHOOK_SECRET` environment variable is missing. The code logs a warning and continues processing the webhook as if it were valid. This creates a critical security vulnerability in any non-production environment where the secret is not configured. An attacker can craft malicious webhook payloads to activate/revoke entitlements without cryptographic verification.

**Context:**
```typescript
if (config.mercadoPagoWebhookSecret) {
  const isValid = validateWebhookSignature(rawBody, signatureHeader, config.mercadoPagoWebhookSecret);
  if (!isValid) {
    console.warn("Invalid Mercado Pago webhook signature");
    return { processed: false, reason: "invalid_signature" };
  }
} else {
  console.warn("MERCADO_PAGO_WEBHOOK_SECRET not configured - webhook signature validation skipped (dev/test only)");
}
```

**Fix:**
1. Never skip signature validation. Make the secret required and fail the entire webhook processing if not configured:
```typescript
if (!config.mercadoPagoWebhookSecret) {
  return { processed: false, reason: "webhook_secret_not_configured" };
}

const isValid = validateWebhookSignature(rawBody, signatureHeader, config.mercadoPagoWebhookSecret);
if (!isValid) {
  console.warn("Invalid Mercado Pago webhook signature");
  return { processed: false, reason: "invalid_signature" };
}
```
2. Alternatively, enforce in `getBillingConfig()` that webhook secret must be present for any webhook processing to occur.

---

### CR-02: Hardcoded Fallback Secret in Session Authentication

**File:** `apps/web/src/server/auth/session.ts:18-19`

**Issue:** The `getSecret()` function returns a hardcoded fallback secret `"local-development-secret-change-me"` when `BETTER_AUTH_SECRET` environment variable is not set. This secret appears in production code and could be used to forge session tokens if the environment variable is accidentally missing in production. While the comment indicates this is for development, there's no runtime enforcement preventing this from executing in production.

**Context:**
```typescript
function getSecret() {
  return process.env.BETTER_AUTH_SECRET ?? "local-development-secret-change-me";
}
```

**Fix:**
Enforce the secret is configured and fail fast in production:
```typescript
function getSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("BETTER_AUTH_SECRET environment variable is required in production");
    }
    return "local-development-secret-change-me";
  }
  return secret;
}
```

---

### CR-03: User ID Not Validated in Entitlement Lookup and Quota Service

**File:** `apps/web/src/server/billing/entitlements.ts:5-6` and `apps/web/src/server/usage/quota-service.ts:30-40`

**Issue:** The `getUserEntitlement()` and `reserveToolUse()` functions accept user IDs directly from request context without validation. A malicious user could potentially craft requests with arbitrary user IDs to query or manipulate another user's entitlements or quotas. While the calling code in the API routes (`apps/web/src/app/api/tools/formula/generate/route.ts:11-14`) does retrieve the user from session, there's no documentation or assertion that the userId parameter must match the authenticated user's ID, creating an implicit trust boundary that could be violated by refactoring code that calls these functions.

**Context (entitlements.ts:5-6):**
```typescript
export async function getUserEntitlement(userId: string): Promise<UserEntitlement> {
  const entitlement = await prisma.entitlement.findFirst({
    where: {
      userId,
```

**Context (quota-service.ts:30-34):**
```typescript
export async function reserveToolUse(
  userId: string,
  toolKind: string,
  mode: string
): Promise<QuotaCheckResult> {
```

**Fix:**
Add validation and documentation:
1. In each function, assert that the userId is valid (non-empty string):
```typescript
export async function getUserEntitlement(userId: string): Promise<UserEntitlement> {
  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid userId");
  }
  // ... rest of function
}
```
2. Add JSDoc comments clarifying that userId must be the authenticated user's ID:
```typescript
/**
 * Gets the entitlement for a user.
 * @param userId - Must be the authenticated user's ID from the current session
 */
export async function getUserEntitlement(userId: string): Promise<UserEntitlement> {
```

---

## Warnings

### WR-01: Unsafe JSON Parsing Without Schema Validation in Auth Route

**File:** `apps/web/src/app/api/auth/[...all]/route.ts:187`

**Issue:** The auth route body is parsed without schema validation before being used. Line 187 uses `.catch(() => null)` to silently suppress JSON parse errors, then accesses properties on a potentially null/malformed object. While there are subsequent checks for required fields, the lack of explicit schema validation at parse time could allow invalid payloads to pass through initial checks and cause unexpected behavior downstream.

**Context:**
```typescript
const body = (await request.json().catch(() => null)) as {
  email?: string;
  password?: string;
  name?: string;
  redirectTo?: string;
  token?: string;
} | null;

if (action === "forget-password") {
  const email = normalizeEmail(body?.email ?? "");
```

**Fix:**
Use a schema parser (like Zod) consistently across all API routes:
```typescript
const bodySchema = z.object({
  email: z.string().email().optional(),
  password: z.string().optional(),
  name: z.string().optional(),
  redirectTo: z.string().optional(),
  token: z.string().optional(),
});

let body: unknown;
try {
  body = await request.json();
} catch {
  return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
}

const parsed = bodySchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
}
```

---

### WR-02: Credential Account Lookup Creates Race Condition Risk

**File:** `apps/web/src/app/api/auth/[...all]/route.ts:37-55`

**Issue:** The sign-up flow performs separate queries to find existing accounts and then create/update them without transactional protection. Between the `findFirst` check at line 37 and the `create` at line 47, another concurrent request could insert the same account, causing an unhandled database constraint violation.

**Context:**
```typescript
const existingAccount = await prisma.account.findFirst({
  where: { providerId: "credential", accountId: email }
});

if (existingAccount) {
  await prisma.account.update({
    where: { id: existingAccount.id },
    data: { password: hashPassword(password), userId: user.id }
  });
} else {
  await prisma.account.create({
    data: {
      providerId: "credential",
      accountId: email,
      password: hashPassword(password),
      userId: user.id
    }
  });
}
```

**Fix:**
Use `upsert` with a transaction to atomically handle both create and update:
```typescript
await prisma.$transaction(async (tx) => {
  await tx.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: email
      }
    },
    update: {
      password: hashPassword(password),
      userId: user.id
    },
    create: {
      providerId: "credential",
      accountId: email,
      password: hashPassword(password),
      userId: user.id
    }
  });
});
```

---

### WR-03: Missing Origin Validation in Billing Checkout

**File:** `apps/web/src/app/api/billing/checkout/route.ts:1-44`

**Issue:** The checkout endpoint requires authentication but does not validate the request origin. Unlike the auth endpoint which explicitly validates origin headers (`apps/web/src/app/api/auth/[...all]/route.ts:119-127`), the checkout endpoint accepts POST requests from any origin. An attacker could craft a form on a malicious site that submits a checkout request in the victim's browser, potentially initiating unwanted billing operations.

**Fix:**
Apply the same origin validation used in the auth route:
```typescript
function validateRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!origin || !appUrl || new URL(origin).origin !== new URL(appUrl).origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  return null;
}

export async function POST(request: Request) {
  const originError = validateRequestOrigin(request);
  if (originError) return originError;

  // ... rest of handler
}
```

---

### WR-04: Entitlement Status Transitions Not Validated

**File:** `apps/web/src/server/billing/entitlements.ts:60-74`

**Issue:** When activating a Pro entitlement, the code marks any existing active entitlement as "expired" without checking if it's already in an expired or canceled state. While this works functionally, it creates unnecessary database writes and could mask logic errors if entitlements reach unexpected states. More critically, the status transition from "active" → "expired" is not validated; the code assumes the only valid transition is to manually expire old entitlements when new ones are created.

**Context:**
```typescript
const existingActive = await prisma.entitlement.findFirst({
  where: {
    userId,
    status: "active",
  },
});

if (existingActive) {
  await prisma.entitlement.update({
    where: { id: existingActive.id },
    data: {
      status: "expired",
    },
  });
}
```

**Fix:**
Validate state transitions and add explicit logging:
```typescript
const existingActive = await prisma.entitlement.findFirst({
  where: {
    userId,
    status: "active",
  },
});

if (existingActive) {
  // Only expire if it wasn't already canceled
  if (existingActive.status === "active") {
    await prisma.entitlement.update({
      where: { id: existingActive.id },
      data: {
        status: "expired",
        updatedAt: new Date(),
      },
    });
  }
}
```

---

## Info

No informational findings at this depth level.

---

_Reviewed: 2026-05-25T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
