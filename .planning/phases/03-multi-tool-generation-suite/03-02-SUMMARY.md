---
phase: "03"
plan: "02"
subsystem: ai-stream-services-and-api-routes
tags: [openai, ndjson, streaming, quota, pro-gate, destructive-classifier, scripts, sql, regex, template]
dependency_graph:
  requires:
    - 03-01 (shared Zod contracts, fixtures, destructive-classifier, tool-repository)
  provides:
    - apps/web/src/server/ai/scripts-stream.ts (resolveScriptPayload + createScriptEventStream)
    - apps/web/src/server/ai/sql-stream.ts (resolveSqlPayload + createSqlEventStream)
    - apps/web/src/server/ai/regex-stream.ts (resolveRegexPayload + createRegexEventStream)
    - apps/web/src/server/ai/template-stream.ts (resolveTemplatePayload + createTemplateEventStream)
    - POST /api/tools/scripts/generate
    - POST /api/tools/sql/generate
    - POST /api/tools/regex/generate
    - POST /api/tools/regex/explain
    - POST /api/tools/template/generate (Pro gate — 403 for Free users)
  affects:
    - 03-03-PLAN.md (UI components consume these endpoints via NDJSON stream client)
tech_stack:
  added: []
  patterns:
    - NDJSON streaming via ReadableStream with 5ms inter-event delay (matching formula-stream pattern)
    - fixture fallback when OPENAI_API_KEY absent — deterministic for dev/test
    - classifyDestructive OR'd with AI isDestructive field for defense-in-depth safety classification
    - Pro gate via getUserEntitlement before reserveToolUse (prevents quota reservation for ineligible users)
    - auth -> parse -> quota -> AI -> confirm -> record -> stream invariant across all routes
key_files:
  created:
    - apps/web/src/server/ai/scripts-stream.ts
    - apps/web/src/server/ai/sql-stream.ts
    - apps/web/src/server/ai/regex-stream.ts
    - apps/web/src/server/ai/template-stream.ts
    - apps/web/src/app/api/tools/scripts/generate/route.ts
    - apps/web/src/app/api/tools/sql/generate/route.ts
    - apps/web/src/app/api/tools/regex/generate/route.ts
    - apps/web/src/app/api/tools/regex/explain/route.ts
    - apps/web/src/app/api/tools/template/generate/route.ts
  modified: []
decisions:
  - template/generate Pro gate checks getUserEntitlement before reserveToolUse to avoid ghost reservations for ineligible users (per RESEARCH.md Pitfall 6)
  - classifyDestructive used as OR with AI isDestructive field — deterministic pattern wins on any positive match, compensating for AI false negatives
  - regex-stream handles both generate and explain modes in one file via discriminated union input (RegexModeInput type), consistent with regexCompletePayloadSchema discriminated union
  - fixture fallback uses scriptType/dialect matching to return the most relevant fixture rather than always returning index 0
metrics:
  duration: "2m"
  completed: "2026-05-26T02:25:40Z"
  tasks_completed: 2
  files_created: 9
  files_modified: 0
---

# Phase 03 Plan 02: AI Stream Services and API Route Handlers Summary

**One-liner:** 4 server-only AI stream services and 5 route handlers implementing auth-quota-AI-stream pipeline for scripts, SQL, regex (generate+explain), and template with Pro gate.

## What Was Built

### Task 1 — 4 server AI stream services (commit 1d16bd6)

Created 4 `server-only` AI stream modules in `apps/web/src/server/ai/`:

**scripts-stream.ts:**
- `resolveScriptPayload`: fixture fallback when `OPENAI_API_KEY` absent; with key, calls OpenAI with `response_format: json_object` and constructs script prompt per `scriptType`; `classifyDestructive` OR'd with AI `isDestructive` field
- `createScriptEventStream`: NDJSON ReadableStream with metadata, warnings, quota_warning, delta, complete events

**sql-stream.ts:**
- `resolveSqlPayload`: same fixture-or-OpenAI pattern; `classifyDestructive` OR'd with AI `isDestructive` for SQL safety
- `createSqlEventStream`: same NDJSON pattern

**regex-stream.ts:**
- `resolveRegexPayload`: handles both `generate` and `explain` modes via `RegexModeInput` discriminated union; fixture fallback returns mode-appropriate fixture; OpenAI path sends different prompts per mode
- `createRegexEventStream`: same NDJSON pattern, works for both `regex_generate` and `regex_explain` payloads

**template-stream.ts:**
- `resolveTemplatePayload`: fixture fallback; OpenAI path requests Markdown-formatted Excel pt-BR template
- `createTemplateEventStream`: same NDJSON pattern

### Task 2 — 5 API route handlers (commit 0e8afd7)

Created route handlers following the invariant `auth -> parse -> quota -> AI -> confirm -> record -> stream` pattern:

**scripts/generate/route.ts:** `reserveToolUse(user.id, "script", "generate")` with `dialect: parsed.data.scriptType` in `recordToolRequest`

**sql/generate/route.ts:** `reserveToolUse(user.id, "sql", "generate")` with `dialect: parsed.data.dialect`

**regex/generate/route.ts:** passes `{ mode: "generate", request: parsed.data }` to `resolveRegexPayload`

**regex/explain/route.ts:** passes `{ mode: "explain", request: parsed.data }` to `resolveRegexPayload`; same `createRegexEventStream` used for both

**template/generate/route.ts (Pro gate):**
1. Auth check (401 if no session)
2. `getUserEntitlement(user.id)` — returns 403 `{ code: "pro_required" }` if not Pro+active
3. Parse request body (400 on invalid input)
4. `reserveToolUse` (429 on quota exceeded)
5. `resolveTemplatePayload` -> confirm -> record -> stream

The Pro gate is checked **before** `reserveToolUse` to prevent quota reservation for ineligible users (T-03-02-03 mitigation).

## Deviations from Plan

None — plan executed exactly as written.

The plan showed `import { getDestructiveMessage }` in the scripts-stream code sample but `getDestructiveMessage` is not needed in stream files (it is a UI-layer concern for displaying warning copy). Only `classifyDestructive` is used to determine `isDestructive: boolean`. This was an unused import in the plan's code sample; the implementation correctly omits it.

## Known Stubs

None. All endpoints are fully wired:
- Fixture path returns deterministic data matching the Zod schema
- OpenAI path calls real API with structured JSON prompts
- Both paths produce valid payloads for the NDJSON stream

## Threat Flags

No new threat surface beyond the plan's threat model. All mitigations implemented:
- T-03-02-01: Zod `safeParse` on all inputs before any processing
- T-03-02-02: User prompt passed as `role: "user"` content, separated from `role: "system"` instructions
- T-03-02-03: `getUserEntitlement` called server-side before `reserveToolUse` in template route
- T-03-02-05: `import "server-only"` in all 4 stream files
- T-03-02-06: `classifyDestructive` OR'd with AI `isDestructive` field in scripts and SQL streams

## Self-Check

**Files exist:**
- apps/web/src/server/ai/scripts-stream.ts: FOUND
- apps/web/src/server/ai/sql-stream.ts: FOUND
- apps/web/src/server/ai/regex-stream.ts: FOUND
- apps/web/src/server/ai/template-stream.ts: FOUND
- apps/web/src/app/api/tools/scripts/generate/route.ts: FOUND
- apps/web/src/app/api/tools/sql/generate/route.ts: FOUND
- apps/web/src/app/api/tools/regex/generate/route.ts: FOUND
- apps/web/src/app/api/tools/regex/explain/route.ts: FOUND
- apps/web/src/app/api/tools/template/generate/route.ts: FOUND

**Commits verified:**
- 1d16bd6: feat(03-02): create AI stream services for scripts, SQL, regex, and template
- 0e8afd7: feat(03-02): create API route handlers for scripts, SQL, regex, and template

## Self-Check: PASSED
