# Stack Research

**Domain:** Brazil-localized spreadsheet AI SaaS
**Researched:** 2026-05-23
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js App Router | 16.2.6 | Web app, BFF routes, streaming UI | Current framework baseline, strong route handlers, server components, and streaming support for AI outputs. |
| React | 19.2.6 | UI runtime | Matches current Next.js ecosystem expectations and supports modern concurrent rendering patterns. |
| TypeScript | 6.0.3 | Full-stack type safety | Required to keep prompt contracts, quota logic, file parsers, and payment webhooks coherent. |
| Tailwind CSS | 4.3.0 | Utility CSS | Fast implementation of a dense SaaS workspace without custom CSS sprawl. |
| Fastify | 5.8.5 | Backend API service | Low overhead Node API layer for AI streaming, file upload handling, payments, and usage accounting. |
| PostgreSQL | 18.4 | System of record | Strong fit for users, plans, usage ledgers, files, tool requests, and audit trails. |
| Prisma ORM | 7.8.0 | DB schema and typed queries | Productive migrations and type-safe data access for PostgreSQL-backed SaaS data. |
| Better Auth | 1.6.11 | Authentication | TypeScript-first auth that supports Next.js 16 patterns and can stay inside the app codebase. |
| OpenAI SDK | 6.39.0 | LLM and vision integration | Responses API supports text, image, and file inputs for generation, explanation, OCR, and structured outputs. |
| Mercado Pago SDK | 3.0.0 | Brazilian checkout | Native Brazil payment flow with Pix support through Checkout Transparente. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 4.4.3 | Runtime validation | Validate request bodies, AI structured outputs, webhook payloads, and parser results. |
| @fastify/multipart | 10.0.0 | Upload handling | Accept `.csv`, `.xlsx`, `.png`, and `.jpeg` files in the API. |
| Papa Parse | 5.5.3 | CSV parsing | Parse CSV uploads, including Brazilian delimiter and encoding edge cases. |
| ExcelJS | 4.4.0 | XLSX parsing | Inspect workbook sheets, headers, sample rows, and cell formats. |
| Chart.js | 4.5.1 | Chart rendering | Render suggested bar, line, and pie charts in the frontend. |
| BullMQ | 5.77.1 | Background jobs | Add when OCR/file analysis needs async retries or the app runs multiple API instances. |
| ioredis | 5.10.1 | Queue backing store | Use with BullMQ; not needed for the first synchronous MVP slice. |
| sharp | 0.34.5 | Image preprocessing | Normalize image dimensions/format before OCR or vision requests. |
| lucide-react | 1.16.0 | Icons | Consistent icon buttons and tool navigation. |
| Vitest | 4.1.7 | Unit/integration tests | Test prompt builders, quota gates, parsers, formula localization, and webhooks. |
| Playwright | 1.60.0 | E2E tests | Verify key user flows: auth, generation, copy, upload, checkout, quota. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm workspaces | Monorepo package management | Use `apps/web`, `apps/api`, and `packages/shared` if Fastify is separate from Next.js. |
| ESLint or Biome | Linting/formatting | Next.js 16 runs linting through package scripts rather than `next lint`. |
| Docker Compose | Local services | PostgreSQL and optional Redis for local development. |
| OpenAPI/typed client | API contract | Generate frontend API types if Fastify is a separate service. |

## Installation

```bash
# Frontend
pnpm create next-app@latest apps/web --yes

# API and shared dependencies
pnpm add fastify @fastify/multipart zod prisma @prisma/client openai mercadopago
pnpm add papaparse exceljs chart.js better-auth lucide-react

# Optional async jobs
pnpm add bullmq ioredis sharp

# Dev dependencies
pnpm add -D typescript vitest playwright
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Fastify API service | Next.js route handlers only | Use route handlers only if the MVP must be a single deployable app and file/AI workloads stay simple. |
| Prisma | Drizzle ORM | Use Drizzle if the team wants lighter SQL-first migrations and less ORM abstraction. |
| Mercado Pago | Stripe Pix | Stripe is viable for global account setups, but Mercado Pago is more native for Brazilian Pix/card expectations. |
| OpenAI Responses API | Anthropic Messages API | Use Anthropic as a fallback/evaluation provider if formula/script quality is better for specific tasks. |
| OpenAI vision for image tables | Tesseract.js only | Use Tesseract only as a local fallback; image-to-table quality usually needs AI reconstruction, not OCR text alone. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Brand-identical clone of GPTExcel | Legal, trust, and differentiation risk | Functional parity with Brazil-specific product positioning. |
| Local-only usage counters | Race conditions allow quota bypass | Atomic PostgreSQL usage ledger and transactional quota checks. |
| Permanent upload storage by default | Violates the privacy promise | Temporary object/session storage with lifecycle deletion and cleanup jobs. |
| Blind formula translation tables only | Excel and Sheets syntax diverge by platform and locale | Platform-aware prompt contracts plus verified locale adapters. |
| Client-side parsing for sensitive files | Exposes logic, hurts privacy controls, complicates quota enforcement | Server-side upload processing with deletion policy. |

## Stack Patterns by Variant

**If launching fastest with one deployable app:**
- Use Next.js 16 route handlers for generation, auth, payments, and uploads.
- Keep service modules under `src/server`.
- Add Fastify only when API concurrency/file processing pressure appears.

**If building for clean service boundaries from day one:**
- Use `apps/web` for Next.js and `apps/api` for Fastify.
- Share Zod schemas and tool contracts from `packages/shared`.
- Prefer this if streaming, uploads, and payments are being built in parallel.

**If strict corporate privacy becomes a sales requirement:**
- Request Zero Data Retention eligibility from LLM providers.
- Avoid provider-hosted file persistence except with explicit short expiration.
- Store only derived schema metadata and user-visible outputs unless the user saves a history item.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16.2.6 | Node.js 20.9+ | Official docs list Node 20.9 as the minimum runtime. |
| Fastify 5.8.x | Node.js 20/22 | Fastify v5 docs list Node 20/22 in the v5 support table. |
| Better Auth 1.6.x | Next.js 16 | Better Auth docs include Next.js 16 `proxy.ts` guidance. |
| Prisma 7.8.0 | PostgreSQL 18 | Prisma docs list PostgreSQL 18 as supported. |
| OpenAI File API | `expires_after` 3600-2592000 seconds | Use 3600 seconds to align with the PRD's 1-hour server-side file lifetime where provider file upload is used. |

## Sources

- https://nextjs.org/docs/app/getting-started/installation - Next.js 16.2.2 docs, Node 20.9 minimum, default App Router/Tailwind/Turbopack setup.
- https://nextjs.org/docs/app/guides/upgrading/version-16 - Next.js 16 migration and Turbopack configuration notes.
- https://tailwindcss.com/docs/installation - Tailwind CSS installation and zero-runtime positioning.
- https://fastify.dev/docs/latest/Reference/LTS/ - Fastify latest v5.8.x and LTS policy.
- https://www.postgresql.org/docs/current/index.htm - PostgreSQL 18.4 current documentation.
- https://www.prisma.io/docs/orm - Prisma ORM overview and PostgreSQL support.
- https://better-auth.com/docs/integrations/next - Better Auth Next.js 16 integration guidance.
- https://platform.openai.com/docs/api-reference/responses/create - OpenAI Responses API text/image/file inputs.
- https://platform.openai.com/docs/guides/images-vision - OpenAI vision input support and image requirements.
- https://platform.openai.com/docs/api-reference/files/create - OpenAI file upload limits and `expires_after` controls.
- https://openai.com/enterprise-privacy/ - OpenAI business data and API privacy commitments.
- https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/payment-integration/pix - Mercado Pago Pix integration.
- https://docs.stripe.com/payments/pix?locale=pt-BR - Stripe Pix support and product constraints.
- npm registry metadata checked 2026-05-23 for package versions listed above.

---
*Stack research for: Tabelin.IA*
*Researched: 2026-05-23*
