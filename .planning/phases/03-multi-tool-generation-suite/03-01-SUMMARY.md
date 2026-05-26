---
phase: "03"
plan: "01"
subsystem: shared-contracts-and-foundation
tags: [prisma, zod, shared-package, destructive-classifier, sidebar, multi-tool]
dependency_graph:
  requires: []
  provides:
    - packages/shared scripts/sql/regex/template Zod schemas and fixtures
    - apps/web tool-repository.ts generic request persistence
    - apps/web destructive-classifier.ts deterministic safety classification
    - apps/web sidebar.tsx active navigation with dynamic usePathname
  affects:
    - 03-02-PLAN.md (route handlers will import from @tabelin/shared)
    - 03-03-PLAN.md (UI components depend on shared schema types and sidebar)
tech_stack:
  added:
    - lucide-react LayoutTemplate icon activated in sidebar
  patterns:
    - Zod discriminatedUnion stream events (matching formula pattern)
    - server-only guard on destructive-classifier module
    - usePathname for dynamic active state in client sidebar
key_files:
  created:
    - prisma/schema.prisma (formulaLanguage String?, separator String?)
    - packages/shared/src/scripts/schema.ts
    - packages/shared/src/scripts/fixtures.ts
    - packages/shared/src/sql/schema.ts
    - packages/shared/src/sql/fixtures.ts
    - packages/shared/src/regex/schema.ts
    - packages/shared/src/regex/fixtures.ts
    - packages/shared/src/template/schema.ts
    - packages/shared/src/template/fixtures.ts
    - apps/web/src/server/tools/tool-repository.ts
    - apps/web/src/server/ai/destructive-classifier.ts
  modified:
    - packages/shared/src/index.ts (8 new exports added)
    - apps/web/src/components/app/sidebar.tsx (use client + usePathname + 4 active links)
decisions:
  - recordToolRequest sets formulaLanguage/separator to null for non-formula tools (backward-compat with nullable columns)
  - classifyDestructive uses per-statement split on semicolons for DELETE-without-WHERE detection (avoids false positives from multi-statement scripts)
  - Sidebar Formula active state uses exact pathname match (/workspace) while sub-routes use startsWith to prevent false activation
metrics:
  duration: "4m"
  completed: "2026-05-26T02:18:43Z"
  tasks_completed: 3
  files_created: 11
  files_modified: 2
---

# Phase 03 Plan 01: Foundation Contracts, Schema, and Sidebar Summary

**One-liner:** Zod contracts for scripts/SQL/regex/template tools, Prisma nullable migration, generic tool-repository, deterministic destructive-classifier, and sidebar activated with dynamic usePathname.

## What Was Built

### Task 1 — Prisma schema + tool-repository (commit de5831b)

Changed `formulaLanguage String` and `separator String` to nullable (`String?`) in the `ToolRequest` model and applied `npx prisma db push`. Created `apps/web/src/server/tools/tool-repository.ts` with the generic `recordToolRequest` function that accepts `null` for formula-specific fields — this allows all four new tools (scripts, SQL, regex, templates) to persist requests to the same `ToolRequest` table without breaking the existing formula flow.

### Task 2 — Shared Zod schemas and fixtures (commit 21477d4)

Created 4 schema modules and 4 fixture modules in `packages/shared/src/`:
- `scripts/schema.ts`: `ScriptType`, `ScriptGenerateRequest`, `ScriptMetadata`, `ScriptGenerateResponse`, `ScriptStreamEvent`
- `sql/schema.ts`: `SqlDialect` (postgresql/mysql/sqlserver/oracle/bigquery), `SqlGenerateRequest`, `SqlMetadata`, `SqlGenerateResponse`, `SqlStreamEvent`
- `regex/schema.ts`: `RegexGenerateRequest`, `RegexExplainRequest`, `regexCompletePayloadSchema` (discriminated union on kind), `RegexStreamEvent`
- `template/schema.ts`: `TemplateGenerateRequest`, `TemplateMetadata`, `TemplateGenerateResponse`, `TemplateStreamEvent`

All schemas follow the `formulaStreamEventSchema` pattern with discriminated unions for stream events. Updated `packages/shared/src/index.ts` to export all 8 new modules. TypeScript compiles without errors.

### Task 3 — destructive-classifier and sidebar (commit aa0262e)

Created `apps/web/src/server/ai/destructive-classifier.ts` with:
- `classifyDestructive(code, toolKind)`: deterministic fallback safety check (OR'd with AI's `isDestructive` field)
- `getDestructiveMessage(code, toolKind)`: specific warning copy per destructive pattern
- `import "server-only"` prevents accidental client-side bundling (T-03-01-04 mitigation)

Updated `apps/web/src/components/app/sidebar.tsx`:
- Added `"use client"` directive
- Dynamic `isActive` computed from `usePathname()` with exact match for Formula (`/workspace`) and startsWith for sub-routes
- Activated Scripts (`/workspace/scripts`), SQL (`/workspace/sql`), Regex (`/workspace/regex`), Templates (`/workspace/templates`)
- Added `LayoutTemplate` icon import for Templates
- File Analysis and OCR remain `disabled: true`

## Deviations from Plan

None — plan executed exactly as written.

The acceptance criterion for `grep "disabled: true" | wc -l` returning 2 was slightly off because the type definition line also contains `disabled: true`, yielding 3 matches. The actual disabled nav items are exactly 2 (File Analysis, OCR). No fix needed — implementation is correct.

## Known Stubs

None. All schemas are fully specified contracts. Fixtures contain realistic data. No components were wired here (sidebar links point to routes that will be created in plans 03-02 and 03-03).

## Threat Flags

No new threat surface beyond what was already in the plan's threat model. `destructive-classifier.ts` is guarded with `server-only`. No new network endpoints or auth paths were created in this plan.

## Self-Check

All files exist:
- prisma/schema.prisma: FOUND
- packages/shared/src/scripts/schema.ts: FOUND
- packages/shared/src/sql/schema.ts: FOUND
- packages/shared/src/regex/schema.ts: FOUND
- packages/shared/src/template/schema.ts: FOUND
- packages/shared/src/index.ts: FOUND (updated)
- apps/web/src/server/tools/tool-repository.ts: FOUND
- apps/web/src/server/ai/destructive-classifier.ts: FOUND
- apps/web/src/components/app/sidebar.tsx: FOUND (updated)

Commits verified:
- de5831b: feat(03-01): update Prisma schema with nullable fields and create tool-repository
- 21477d4: feat(03-01): add Zod schemas and fixtures for scripts, SQL, regex, and template tools
- aa0262e: feat(03-01): add destructive-classifier and update sidebar with dynamic active state

## Self-Check: PASSED
