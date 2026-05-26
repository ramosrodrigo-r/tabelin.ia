---
phase: "03"
plan: "03"
subsystem: ui-features-scripts-sql-regex-template
tags: [react-shiki, shiki, syntax-highlighting, streaming, quota-ui, pro-gate, ndjson, scripts, sql, regex, template]
dependency_graph:
  requires:
    - 03-01 (shared Zod contracts, fixtures, sidebar)
    - 03-02 (API route handlers for all 4 tools)
  provides:
    - apps/web/src/features/scripts/* (ScriptsTool + hooks + panels)
    - apps/web/src/features/sql/* (SqlTool + hooks + panels)
    - apps/web/src/features/regex/* (RegexTool + hooks + panels, dual mode generate/explain)
    - apps/web/src/features/template/* (TemplateTool + hooks + panels, Pro gate)
    - apps/web/src/app/(workspace)/workspace/scripts/page.tsx
    - apps/web/src/app/(workspace)/workspace/sql/page.tsx
    - apps/web/src/app/(workspace)/workspace/regex/page.tsx
    - apps/web/src/app/(workspace)/workspace/templates/page.tsx
  affects:
    - Phase 03 completion — all 4 new tool UIs are now live
tech_stack:
  added:
    - react-shiki@0.10.0 (useShikiHighlighter hook for syntax highlighting)
    - shiki@4.1.0 (underlying highlighting engine)
  patterns:
    - NDJSON streaming hook pattern (matching use-formula-stream.ts exactly)
    - useShikiHighlighter with github-light theme and 150ms delay for all output panels
    - "vba" language falls back to "vb" (not in shiki BundledLanguage; "vb" is)
    - Pro gate: client-side isPro check + proBlocked state from 403 pro_required response
    - Safety warning: note-block.warning with AlertTriangle icon, placed between metadata-row and output-box
    - SQL warning: contextual message selection (DROP/TRUNCATE vs DELETE-no-WHERE vs UPDATE-no-WHERE vs generic)
key_files:
  created:
    - apps/web/src/features/scripts/hooks/use-scripts-stream.ts
    - apps/web/src/features/scripts/components/scripts-input-panel.tsx
    - apps/web/src/features/scripts/components/scripts-output-panel.tsx
    - apps/web/src/features/scripts/scripts-tool.tsx
    - apps/web/src/features/sql/hooks/use-sql-stream.ts
    - apps/web/src/features/sql/components/sql-input-panel.tsx
    - apps/web/src/features/sql/components/sql-output-panel.tsx
    - apps/web/src/features/sql/sql-tool.tsx
    - apps/web/src/features/regex/hooks/use-regex-stream.ts
    - apps/web/src/features/regex/components/regex-input-panel.tsx
    - apps/web/src/features/regex/components/regex-output-panel.tsx
    - apps/web/src/features/regex/regex-tool.tsx
    - apps/web/src/features/template/hooks/use-template-stream.ts
    - apps/web/src/features/template/components/template-input-panel.tsx
    - apps/web/src/features/template/components/template-output-panel.tsx
    - apps/web/src/features/template/template-tool.tsx
    - apps/web/src/app/(workspace)/workspace/scripts/page.tsx
    - apps/web/src/app/(workspace)/workspace/sql/page.tsx
    - apps/web/src/app/(workspace)/workspace/regex/page.tsx
    - apps/web/src/app/(workspace)/workspace/templates/page.tsx
  modified:
    - apps/web/package.json (react-shiki + shiki added)
    - pnpm-lock.yaml (lockfile updated)
decisions:
  - Use "vb" as shiki language for VBA (shiki BundledLanguage does not include "vba", but includes "vb")
  - SQL output panel derives contextual safety warning message from query text (regex-based) rather than relying solely on AI isDestructive field, providing more specific copy per operation type
  - Template Pro gate uses showProGate = (!isPro || proBlocked) to handle both client-side entitlement check and server-side bypass detection
metrics:
  duration: "9m"
  completed: "2026-05-26T02:39:04Z"
  tasks_completed: 2
  files_created: 20
  files_modified: 2
---

# Phase 03 Plan 03: UI Features — Scripts, SQL, Regex, Templates Summary

**One-liner:** 4 complete UI feature modules (hooks + input/output panels + tools + RSC pages) with react-shiki syntax highlighting, NDJSON streaming, safety warning banners, and Template Pro gate.

## What Was Built

### Task 1 — Install react-shiki + shiki; Scripts and SQL features (commit 2d40d0c)

**Package installation:**
- Installed `react-shiki@0.10.0` and `shiki@4.1.0` in `apps/web/package.json`
- Verified: `"vba"` is NOT in shiki `BundledLanguage` but `"vb"` is → used `"vb"` as VBA fallback

**Scripts feature:**
- `use-scripts-stream.ts`: NDJSON loop hook, fetches `/api/tools/scripts/generate`, handles 429 quota_exceeded → quotaBlocked state
- `scripts-input-panel.tsx`: segmented control for VBA/Apps Script/Airtable Script with `aria-pressed`, quota warning, quotaBlocked with checkout CTA
- `scripts-output-panel.tsx`: `useShikiHighlighter` with language mapping (vba→vb, apps_script→javascript, airtable_script→javascript), `.note-block.warning` + AlertTriangle for destructive ops, CopyButton, assumptions block
- `scripts-tool.tsx`: `ScriptsTool` composing input+output panels

**SQL feature:**
- `use-sql-stream.ts`: NDJSON loop hook, fetches `/api/tools/sql/generate`, same quota pattern
- `sql-input-panel.tsx`: `<select>` dropdown for SQL_DIALECTS, quota UI
- `sql-output-panel.tsx`: fixed `"sql"` language for shiki, contextual safety warning messages (DROP/TRUNCATE / DELETE-no-WHERE / UPDATE-no-WHERE / generic), CopyButton with raw query
- `sql-tool.tsx`: `SqlTool` composing input+output panels

**RSC pages:**
- `/workspace/scripts/page.tsx`: auth → entitlement → Sidebar + Topbar + ScriptsTool layout
- `/workspace/sql/page.tsx`: auth → entitlement → Sidebar + Topbar + SqlTool layout

### Task 2 — Regex and Template features (commit f932bb2)

**Regex feature:**
- `use-regex-stream.ts`: NDJSON loop hook, routes to `/api/tools/regex/generate` or `/api/tools/regex/explain` based on mode, same quota pattern
- `regex-input-panel.tsx`: mode-tabs with `role="tablist"` and `role="tab"` + `aria-selected` (matching Formula pattern), mode-aware labels/placeholders, quota UI
- `regex-output-panel.tsx`: `useShikiHighlighter` with `"regex"` language for generate mode, ordered list for explain mode (regex_explain payload kind), copy button copies pattern for generate and steps.join("\n") for explain
- `regex-tool.tsx`: `RegexTool` with mode state; mode change resets text and validationError

**Template feature:**
- `use-template-stream.ts`: NDJSON loop hook, fetches `/api/tools/template/generate`, handles 403 pro_required → `proBlocked = true` state (in addition to 429 quota check)
- `template-input-panel.tsx`: Pro gate shows `Recurso exclusivo Pro` heading + body + `Assinar Pro` button with `aria-label="Assinar o plano Pro"` when `!isPro || proBlocked`; textarea disabled in Pro gate state
- `template-output-panel.tsx`: `useShikiHighlighter` with `"markdown"` language, CopyButton, assumptions block
- `template-tool.tsx`: `TemplateTool` passes `proBlocked` to input panel

**RSC pages:**
- `/workspace/regex/page.tsx`: auth → entitlement → Sidebar + Topbar + RegexTool layout
- `/workspace/templates/page.tsx`: auth → entitlement → Sidebar + Topbar + TemplateTool layout

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Files initially written to main repo instead of worktree**
- **Found during:** Task 1, after writing scripts and SQL files
- **Issue:** Files for Task 1 were created in `/home/rodrigo/tabelin.ia/apps/web/...` (main git repo) instead of the worktree at `/home/rodrigo/tabelin.ia/.claude/worktrees/agent-aa35b6ef1c0fc1b53/apps/web/...`
- **Fix:** Copied files from main repo to worktree, removed from main repo, then installed packages in worktree with `pnpm --filter web add react-shiki shiki`
- **Files affected:** All 10 files from Task 1 scripts/sql features + package.json/pnpm-lock.yaml

**2. [Rule 1 - Bug] VBA language fallback for shiki**
- **Found during:** Task 1 pre-flight
- **Issue:** Plan suggested `"vba"` as shiki language but verification shows `"vba"` is not in `BundledLanguage`; `"vb"` is
- **Fix:** Used `SCRIPT_HIGHLIGHT_LANG` mapping with `vba: "vb"` instead of the plan's `vba: "vba"`
- **Files modified:** `scripts-output-panel.tsx` (SCRIPT_HIGHLIGHT_LANG constant)
- **Comment:** Plan already mentioned this check as a step; fix was anticipated and correct

**3. [Rule 2 - Missing] Contextual SQL warning messages**
- **Found during:** Task 1, implementing sql-output-panel.tsx
- **Issue:** Plan specified per-trigger SQL warning messages (DROP/TRUNCATE, DELETE without WHERE, UPDATE without WHERE, generic) but only provided a single generic message pattern in the plan code
- **Fix:** Implemented `getSqlWarningMessage()` function in `sql-output-panel.tsx` with regex-based detection to select the correct contextual copy per the UI-SPEC Safety Warning Contract
- **Files modified:** `sql-output-panel.tsx`

## Known Stubs

None. All 4 tool features are fully wired:
- Hooks call real API endpoints created in plan 03-02
- Output panels render actual streaming data
- Pro gate in Templates is backed by server-side 403 check
- Copy buttons copy raw generated content

## Threat Flags

No new threat surface beyond the plan's threat model.

- T-03-03-01 (accept): Template Pro gate is client-side UI complementing the 403 from route handler (03-02)
- T-03-03-02 (accept): `useShikiHighlighter` with React outputFormat returns ReactElement, not `dangerouslySetInnerHTML`
- T-03-03-03 (mitigate — implemented): `use-template-stream.ts` handles 403 `pro_required` → `proBlocked=true`; `TemplateInputPanel` checks `!isPro || proBlocked` before enabling submit

## Self-Check

**Files exist:**
- apps/web/src/features/scripts/scripts-tool.tsx: FOUND
- apps/web/src/features/sql/sql-tool.tsx: FOUND
- apps/web/src/features/regex/regex-tool.tsx: FOUND
- apps/web/src/features/template/template-tool.tsx: FOUND
- apps/web/src/app/(workspace)/workspace/scripts/page.tsx: FOUND
- apps/web/src/app/(workspace)/workspace/sql/page.tsx: FOUND
- apps/web/src/app/(workspace)/workspace/regex/page.tsx: FOUND
- apps/web/src/app/(workspace)/workspace/templates/page.tsx: FOUND

**Commits verified:**
- 2d40d0c: feat(03-03): install react-shiki/shiki and implement Scripts and SQL features
- f932bb2: feat(03-03): implement Regex and Template features with final TypeScript verification

**Acceptance criteria:**
- react-shiki + shiki installed: PASS (package.json verified)
- scripts fetch /api/tools/scripts/generate: PASS
- scripts useShikiHighlighter: PASS
- scripts note-block warning: PASS
- sql fetch /api/tools/sql/generate: PASS
- sql useShikiHighlighter: PASS
- sql note-block warning: PASS
- /workspace/scripts page with ScriptsTool: PASS
- /workspace/sql page with SqlTool: PASS
- RegexTool with mode-tabs: PASS
- regex hooks for generate + explain: PASS
- TemplateTool: PASS
- pro_required + proBlocked: PASS
- Recurso exclusivo Pro: PASS
- aria-label="Assinar o plano Pro": PASS
- /workspace/regex page with RegexTool: PASS
- /workspace/templates page with TemplateTool: PASS
- useShikiHighlighter count >= 3: PASS (8 found)
- note-block warning count >= 2: PASS (3 found — formula, sql, scripts)
- TypeScript: 0 errors in new files: PASS (3 pre-existing Prisma/reset-password errors unrelated to this plan)

## Self-Check: PASSED
