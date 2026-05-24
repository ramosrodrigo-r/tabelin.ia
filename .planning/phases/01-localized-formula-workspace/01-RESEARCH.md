# Phase 1: Localized Formula Workspace - Research

**Researched:** 2026-05-23
**Domain:** Next.js SaaS workspace, auth, localized formula AI, streaming output
**Confidence:** HIGH

<user_constraints>

## User Constraints from CONTEXT.md

### Locked Decisions

- **D-01:** Use email/password authentication for Phase 1. Social login is deferred.
- **D-02:** Use Better Auth as the preferred TypeScript auth layer unless planning finds a hard blocker.
- **D-03:** Store sessions through the auth framework's recommended secure session mechanism; refresh must preserve signed-in state.
- **D-04:** Password reset must be planned in Phase 1; exact email provider is agent discretion.
- **D-05:** Build the first screen as the usable app workspace, not a marketing landing page.
- **D-06:** Use restrained sidebar navigation with Formula active in Phase 1.
- **D-07:** Keep the workspace dense, quiet, and task-focused for repeated office use.
- **D-08:** All tool states must share input, required selectors, streaming result area, assumptions/warnings, errors, and copy button.
- **D-09:** Formula generation must require platform selection: Microsoft Excel, Google Sheets, Airtable, or LibreOffice Calc.
- **D-10:** Formula generation must require formula language selection: Portuguese (Brazil) with `;` separators or English with `,` separators.
- **D-11:** Output must show platform, language, separator, and assumptions.
- **D-12:** Explanations must be clear Brazilian Portuguese and step-by-step for non-developers.
- **D-13:** Golden fixtures for `SE`, `PROCV`, `SOMASE`, and financial/operational examples should guide tests.
- **D-14:** AI calls are server-side only; provider keys never reach the browser.
- **D-15:** Validate AI responses against structured schemas before rendering copy-ready output.
- **D-16:** Stream simple formula responses as early as possible to meet the 2.5-second visible-output target.
- **D-17:** If context is missing, include assumptions or ask for a narrower request rather than inventing sheet structure.
- **D-18:** Persist metadata needed for future history, quotas, debugging, and quality analysis without overbuilding history in Phase 1.

### Agent Discretion

- Exact component composition and folder structure, as long as it follows Next.js App Router conventions.
- Initial API surface can be Next.js route handlers if server modules preserve a clean path to a separate Fastify service.
- Password-reset email transport can be a local/dev adapter first, with production provider configuration isolated behind an interface.

### Deferred Ideas

Billing, quotas, scripts, SQL, regex, upload/OCR, charts, Pro templates, team workspaces, SSO, Drive/OneDrive imports, and large-file async jobs remain out of Phase 1.

</user_constraints>

<architectural_responsibility_map>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Account creation, login, logout, reset | Frontend Server | Database | Better Auth owns secure session handling; Postgres stores users/sessions/reset state. |
| Workspace shell and navigation | Browser/Client | Frontend Server | The app shell is interactive UI, served through Next.js routes with auth-aware server rendering. |
| Platform and formula-language selectors | Browser/Client | Shared package | Selectors are UI state, but allowed values and separator rules must be shared with server validation. |
| Formula generation/explanation | Frontend Server | External AI Provider | Server route handlers keep provider keys secret, build prompts, validate outputs, and stream UI-visible data. |
| Request metadata persistence | Database | Frontend Server | Metadata supports future quota/history without persisting unnecessary raw spreadsheet content. |
| Output copy feedback | Browser/Client | - | Clipboard interaction and feedback are client-side UI concerns. |

</architectural_responsibility_map>

<research_summary>

## Summary

Phase 1 should be a single deployable Next.js workspace with server modules that can later move behind Fastify if workload pressure appears. This keeps the walking skeleton small while preserving the architectural direction from project research: type-safe contracts, server-only AI calls, Postgres-backed account/session data, and strict UI states.

The critical product risk is not the existence of an AI call; it is Brazilian spreadsheet correctness. The plan must force explicit platform and formula-language selection, validate outputs structurally, show the separator and assumptions, and test localized fixtures for common formulas.

**Primary recommendation:** implement Phase 1 as three sequential vertical slices: authenticated workspace skeleton, formula contract/API, then streaming formula UI and end-to-end verification.

</research_summary>

<standard_stack>

## Standard Stack

Use the project-level stack decisions from `.planning/research/STACK.md`:

| Area | Choice | Phase 1 Use |
|------|--------|-------------|
| Web app | Next.js App Router + React + TypeScript | Single `apps/web` app, route handlers, server/client boundaries. |
| Styling | Tailwind CSS + lucide-react | Dense SaaS workspace, icon buttons, compact controls. |
| Auth | Better Auth | Email/password, session persistence, password reset. |
| Database | PostgreSQL + Prisma | Users, sessions, reset tokens if needed, tool request metadata. |
| Validation | Zod | Request schemas, tool contracts, AI output schemas. |
| AI | OpenAI SDK / Responses API | Server-side formula generation and explanation. |
| Tests | Vitest + Playwright | Prompt builders, schema validation, auth/formula E2E, performance budget. |

**Implementation stance:** keep provider SDK access in `apps/web/src/server/ai/*`, never in client components.

</standard_stack>

<architecture_patterns>

## Architecture Patterns

### Data Flow

```text
Signed-in user
  -> Workspace shell
  -> Formula form with platform + language selectors
  -> POST /api/tools/formula/generate or /explain
  -> Server validates request
  -> Prompt builder creates locale/platform-specific instructions
  -> AI provider returns streamed structured chunks
  -> Server validates final payload and stores metadata
  -> UI renders formula/explanation, assumptions, warnings, and copy feedback
```

### Recommended Project Structure

```text
apps/web/
  src/app/                         # App Router pages, layouts, route handlers
  src/components/app/              # Sidebar, topbar, shell primitives
  src/features/formula/            # Formula UI, hooks, client helpers
  src/server/auth/                 # Better Auth config and helpers
  src/server/ai/                   # Provider client, prompts, streaming helpers
  src/server/db/                   # Prisma client and data access helpers
  tests/                           # Vitest and Playwright tests
packages/shared/
  src/formula/                     # Platform/language constants and Zod schemas
prisma/
  schema.prisma
```

### Pattern 1: Shared Tool Contract

**What:** platform/language selectors, request schemas, and response schemas live in shared TypeScript/Zod modules.

**Why:** the UI cannot drift from server validation, and future tools can reuse the same contract pattern.

### Pattern 2: Server-Only AI Boundary

**What:** route handlers call server modules, server modules call the AI provider, and client code only receives validated stream events.

**Why:** this protects provider keys, enables structured validation, and creates a single point for future quota enforcement.

### Pattern 3: Metadata-First Persistence

**What:** persist user id, tool type, selected platform/language, duration, provider model, status, and output hash/summary. Avoid raw spreadsheet data unless explicitly needed.

**Why:** Phase 2 quotas and quality analysis need accounting data, but Phase 1 should not overbuild a full history product.

</architecture_patterns>

<common_pitfalls>

## Common Pitfalls

### Pitfall 1: Locale Drift

**What goes wrong:** UI says Portuguese/semicolon but prompt or output returns English/comma formulas.
**Avoidance:** make platform/language/separator explicit fields in request and response schemas, then assert them in fixtures.

### Pitfall 2: Streaming Before Validation

**What goes wrong:** the UI exposes copy-ready output that fails final schema validation.
**Avoidance:** stream user-visible progress and draft text, but only mark output copy-ready once the final structured payload validates.

### Pitfall 3: Horizontal Foundation Work

**What goes wrong:** Phase 1 spends time on infrastructure without a user-visible formula flow.
**Avoidance:** each plan must complete a vertical user path: signed-in shell, server-side formula call, then interactive streaming UI.

### Pitfall 4: Hidden Auth Reset Dependency

**What goes wrong:** password reset is coded against an undefined email service.
**Avoidance:** isolate mail delivery behind an adapter; local/dev can expose reset links safely in logs/tests while production env vars remain configurable.

</common_pitfalls>

<plan_implications>

## Plan Implications

- Plan 01 must prove the walking skeleton: Next.js app, auth, session persistence, workspace shell, Prisma/Postgres read/write, and reset flow.
- Plan 02 must implement server-side formula/explainer contracts, prompt builders, structured validation, route handlers, and metadata persistence.
- Plan 03 must implement the client formula workspace, streaming state, copy feedback, assumptions/warnings, and end-to-end tests including the 2.5-second visible-output budget.

</plan_implications>

<sources>

## Sources

- `PRD.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/phases/01-localized-formula-workspace/01-CONTEXT.md`
- `.planning/research/STACK.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/FEATURES.md`
- `.planning/research/PITFALLS.md`

</sources>

## RESEARCH COMPLETE
