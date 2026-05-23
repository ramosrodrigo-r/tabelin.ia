# Architecture Research

**Domain:** Brazil-localized spreadsheet AI SaaS
**Researched:** 2026-05-23
**Confidence:** HIGH

## Standard Architecture

### System Overview

```text
Browser
  |
  v
Next.js 16 Web App
  - Auth pages
  - Tool workspace
  - Streaming output UI
  - Upload and chart UI
  |
  v
Fastify API / Next.js BFF
  - Tool request endpoints
  - Upload endpoints
  - Payment webhook endpoints
  - Usage/quota checks
  |
  +--> AI Orchestration
  |     - Prompt contracts
  |     - Structured outputs
  |     - Provider adapters
  |
  +--> File Pipeline
  |     - CSV/XLSX parsing
  |     - Image preprocessing
  |     - OCR/table reconstruction
  |     - TTL deletion
  |
  +--> Billing/Entitlements
        - Mercado Pago checkout
        - Webhook reconciliation
        - Plan state

PostgreSQL
  - users, sessions, plans
  - usage ledger
  - tool requests
  - file metadata
  - payment events

Temporary File Store
  - raw uploads
  - 1-hour cleanup
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Tool workspace | Navigation, inputs, selectors, streaming outputs, copy feedback | Next.js client/server components with shared tool configuration. |
| Tool API | Validate requests, enforce quota, call AI provider, persist result metadata | Fastify routes or Next.js route handlers using Zod schemas. |
| AI orchestration | Platform-specific prompts, output schemas, model selection, retries | Service modules with one adapter per provider and one contract per tool. |
| Formula locale adapter | Encode platform, language, separator, and known function-name behavior | Shared package used by prompts and tests. |
| Upload pipeline | Validate file type/size/count, parse schema/sample rows, delete raw files | `@fastify/multipart`, Papa Parse, ExcelJS, temp object store. |
| OCR pipeline | Normalize images, extract table, return rows/columns and TSV/CSV | `sharp` preprocessing plus vision model table reconstruction. |
| Usage ledger | Quota checks and plan usage history | PostgreSQL transactions with usage windows. |
| Billing | Checkout sessions, webhook handling, entitlement updates | Mercado Pago first; Stripe optional only after Pix/subscription fit is confirmed. |

## Recommended Project Structure

```text
apps/
  web/
    src/
      app/
      components/
      features/
        tools/
        billing/
        uploads/
      server/
        actions/
        auth/
  api/
    src/
      routes/
      services/
        ai/
        billing/
        quota/
        uploads/
      jobs/
      db/
packages/
  shared/
    src/
      schemas/
      tool-contracts/
      formula-locales/
      quota/
prisma/
  schema.prisma
  migrations/
```

### Structure Rationale

- **apps/web:** Keeps the first user experience focused and easy to run.
- **apps/api:** Gives file processing, streaming, payment webhooks, and AI calls clear server ownership.
- **packages/shared:** Prevents drift between frontend forms, backend validators, prompt contracts, and tests.
- **prisma:** Keeps schema, migrations, and seed data explicit.

## Architectural Patterns

### Pattern 1: Tool Contract Registry

**What:** Each tool declares input schema, supported platforms, quota unit, prompt builder, output schema, and renderer.

**When to use:** All formula/script/SQL/regex tools.

**Trade-offs:** Adds initial structure, but prevents each generator from becoming a one-off route.

```typescript
type ToolContract<Input, Output> = {
  id: string;
  inputSchema: z.ZodType<Input>;
  outputSchema: z.ZodType<Output>;
  quotaCost: number;
  buildPrompt(input: Input): AiPrompt;
};
```

### Pattern 2: Quota Before Provider Call

**What:** Reserve usage in a transaction before calling the LLM; finalize or release based on outcome.

**When to use:** Every AI request, including upload chat and OCR.

**Trade-offs:** Slightly more bookkeeping, but avoids free-tier abuse and webhook/payment inconsistencies.

### Pattern 3: Temporary Raw File, Persistent Metadata

**What:** Store raw uploads only temporarily; persist file metadata, detected schema, sample rows, user-visible outputs, and deletion timestamps.

**When to use:** CSV/XLSX/image uploads.

**Trade-offs:** Users may need to re-upload for future analysis, but the privacy promise stays enforceable.

### Pattern 4: Provider Adapter

**What:** Keep OpenAI, Anthropic, or future providers behind a common interface.

**When to use:** Any generation path where quality/cost/latency may need future tuning.

**Trade-offs:** Avoid over-abstracting model-specific features; expose capability flags for vision, structured output, and streaming.

## Data Flow

### Formula Generation Flow

```text
User prompt + platform + locale
  -> Frontend validates required fields
  -> API validates with Zod
  -> Quota reservation transaction
  -> Prompt contract builds provider request
  -> Stream response to UI
  -> Persist request/output metadata
  -> Finalize usage ledger
  -> User copies formula
```

### Upload Analysis Flow

```text
User uploads CSV/XLSX
  -> File type/size/count validation
  -> Temporary storage with TTL
  -> Parser extracts schema and sample rows
  -> Raw file scheduled for deletion
  -> User asks chat question
  -> AI receives schema/sample, not unbounded raw file
  -> Output saved as request metadata
```

### Pix Checkout Flow

```text
User starts upgrade
  -> Create Mercado Pago order/preference
  -> User pays with Pix/card
  -> Payment provider sends webhook
  -> Verify webhook authenticity
  -> Store payment event idempotently
  -> Activate or update Pro entitlement
  -> UI polls or receives status update
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Single web/API deployment, PostgreSQL, synchronous 5 MB file parsing, scheduled cleanup. |
| 1k-100k users | Add Redis/BullMQ for OCR and file analysis jobs, object storage lifecycle policies, provider fallback, observability. |
| 100k+ users | Split AI/file workers, separate billing service, per-tenant rate limits, queue isolation, regional storage policy review. |

### Scaling Priorities

1. **First bottleneck:** LLM latency/cost on generation. Fix with model routing, streaming, prompt caching where supported, and response-quality evals.
2. **Second bottleneck:** File/OCR processing under concurrent uploads. Fix with queue workers and object storage lifecycle rules.
3. **Third bottleneck:** Quota and payment consistency. Fix with idempotent webhooks and transactional usage reservations.

## Anti-Patterns

### Anti-Pattern 1: One Generic Prompt for Every Spreadsheet

**What people do:** Send "generate a formula" with no platform/locale contract.

**Why it is wrong:** Brazilian Excel, English Excel, Google Sheets, Airtable, and LibreOffice differ enough to create wrong-paste output.

**Do this instead:** Require platform, formula language, separator, and assumptions in the prompt and output schema.

### Anti-Pattern 2: Webhook Updates Without Idempotency

**What people do:** Flip a user to Pro every time a webhook arrives.

**Why it is wrong:** Payment providers retry events and can send state changes out of order.

**Do this instead:** Store provider event IDs, verify signatures, and update entitlement from canonical payment/order state.

### Anti-Pattern 3: Raw File History

**What people do:** Save uploaded spreadsheets indefinitely for user convenience.

**Why it is wrong:** It contradicts the privacy promise and increases breach impact.

**Do this instead:** Delete raw files aggressively and persist only metadata/output needed for history.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenAI API | Server-side Responses API calls | Use streaming for simple generation; use file/image inputs only behind privacy controls. |
| Mercado Pago | Checkout/order API plus webhooks | Preferred first payment integration for Brazil-native Pix/card flows. |
| Stripe Pix | Optional secondary provider | Confirm account location, subscription, Pix Automatic, and settlement constraints before committing. |
| Email provider | Transactional email | Needed for auth, billing receipts, and Pro support workflows. |
| Temporary object storage | Server-side upload storage | Use TTL lifecycle rules in hosted environments; local tmp is only acceptable for a single-instance MVP. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Web to API | HTTP/SSE streaming | Keep AI provider keys server-side. |
| API to DB | Prisma transactions | Use transactions for quota and entitlement changes. |
| API to AI provider | Adapter interface | Must support structured output validation and retry policy. |
| API to file store | Signed server-side access | Never expose raw file object paths publicly. |

## Sources

- .planning/PROJECT.md - Product goals, constraints, and active requirements.
- .planning/research/STACK.md - Stack recommendations and source list.
- https://nextjs.org/docs/app/getting-started/installation - Next.js app and runtime baseline.
- https://fastify.dev/docs/latest/Reference/LTS/ - Fastify v5 support.
- https://platform.openai.com/docs/api-reference/files/create - File expiration and upload constraints.
- https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/payment-integration/pix - Pix checkout flow.

---
*Architecture research for: Tabelin.IA*
*Researched: 2026-05-23*
