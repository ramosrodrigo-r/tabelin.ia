# Architecture Research

**Domain:** Unified Chat + Interactive Table — v2.0 additions to an existing per-tool streaming SaaS (Tabelin.IA)
**Researched:** 2026-06-08
**Confidence:** HIGH (based on direct codebase reading + verified library docs)

---

## Existing Architecture Snapshot

The current system has a rigid 1-to-1 mapping:

```
URL path           → Page              → Tool Component     → Streaming Hook    → API Route
/workspace         → Formula page      → FormulaTool        → useFormulaStream  → /api/tools/formula/generate
/workspace/sql     → SQL page          → SqlTool            → useSqlStream      → /api/tools/sql/generate
/workspace/regex   → Regex page        → RegexTool          → useRegexStream    → /api/tools/regex/generate
/workspace/scripts → Scripts page      → ScriptsTool        → useScriptsStream  → /api/tools/scripts/generate
/workspace/templates→ Templates page   → TemplateTool       → useTemplateStream → /api/tools/template/generate
/workspace/file-analysis → ephemeral (no history)
/workspace/ocr           → ephemeral (no history)
```

**ConversationExchange schema (Prisma):**
- Partitioned by `(userId, toolKind)` — `toolKind` is the string key ("formula", "sql", "regex", "script", "template")
- `findConversationExchanges(userId, toolKind)` and `saveConversationExchange(...)` are the two access functions
- "Nova conversa" calls `DELETE /api/conversations/[tool]` — `VALID_TOOL_KINDS` is a hardcoded allowlist in that route
- `Topbar` derives toolKind from `usePathname()` via `useWorkspaceToolKind()` — matches "/workspace" (→ "formula"), "/workspace/sql", etc.

**Streaming contract (NDJSON):**
Each tool has its own event schema in `@tabelin/shared`: `{ type: "metadata" | "delta" | "complete" | "error" | "quota_warning" | "attachment_grounded", ... }`. The `complete` event carries a typed `payload` discriminated by `kind` ("formula", "sql", "regex_generate", "script", "template").

**Quota system:**
`reserveToolUse(userId, toolKind, mode)` → `confirmToolUse` → `releaseToolUse`. The `toolKind` param is stored in `UsageLedger.toolKind` for analytics only; the quota gate operates on `meterKind="tool_use"` (a unified pool). The toolKind string does not affect whether quota is allowed.

**Attachment extraction:**
`extractContent(buffer, declaredName)` is a unified dispatcher in `server/extraction/dispatcher.ts` returning `ExtractionResult`. All five text tools call it identically. The extracted text goes into `ConversationExchange.attachmentContext`.

---

## System Overview After v2.0

```
┌────────────────────────────────────────────────────────────────────┐
│  Browser (Client)                                                   │
│                                                                     │
│  /workspace (single unified page)                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  UnifiedChatTool (client component)                          │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  ChatThread — renders exchanges as chat bubbles      │   │  │
│  │  │  • TextExchange (formula/sql/regex/script/template)  │   │  │
│  │  │  • ClarificationExchange (clarification turns)       │   │  │
│  │  │  • TableExchange (live grid + export)                │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  TableGridPanel (rendered inside TableExchange)       │   │  │
│  │  │  • react-datasheet-grid (editable cells, MIT)         │   │  │
│  │  │  • @formulajs/formulajs recalc engine (client-only)  │   │  │
│  │  │  • Export: CSV blob + SheetJS XLSX                   │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  │                                                               │  │
│  │  ChatInput (existing component — UNCHANGED)                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                              │  POST /api/chat/unified
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  Server (Next.js Route Handler)                                     │
│                                                                     │
│  /api/chat/unified (NEW route handler)                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  1. Auth check (getSessionFromCookieHeader — UNCHANGED)      │  │
│  │  2. Multipart/JSON parse (same pattern as formula/generate)  │  │
│  │  3. Pro-gate if attachment present (UNCHANGED pattern)       │  │
│  │  4. reserveToolUse(userId, "unified", "generate")            │  │
│  │  5. extractContent(buffer, name) if file present             │  │
│  │  6. Intent classifier → resolvedKind + confidence + hint     │  │
│  │  7. Dispatch to existing resolve*Payload OR table resolver   │  │
│  │  8. confirmToolUse / releaseToolUse on error                 │  │
│  │  9. saveConversationExchange(toolKind=resolvedKind, ...)     │  │
│  │  10. Return NDJSON stream                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Existing route handlers (/api/tools/formula, /sql, etc.)          │
│  → PRESERVED unchanged (backward-compat + deep-links)              │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  Database (PostgreSQL / Prisma — NO SCHEMA MIGRATION in v2.0 MVP)  │
│                                                                     │
│  ConversationExchange — existing model, new toolKind value added:  │
│  "unified_table" (for clarification + table generation turns)      │
│  Existing values preserved: "formula" | "sql" | "regex" |          │
│  "script" | "template"                                             │
└────────────────────────────────────────────────────────────────────┘
```

---

## (a) Intent Routing

### Decision: Server-Side Classifier with Structured Outputs, No Extra Round Trip

Use OpenAI Structured Outputs (`response_format: { type: "json_schema", json_schema: ..., strict: true }`) to classify intent AND generate in a single API call where possible.

**Why not a separate classify-then-generate flow:**
A separate classifier call before generation doubles latency for every request. With the existing 2.5 s streaming start constraint, two sequential LLM calls are prohibitive for non-trivial prompts. OpenAI Structured Outputs processes the schema on the first request (~10 s one-time penalty per schema, then cached). Subsequent calls carry no overhead. Streaming allows the route handler to begin dispatching as soon as the intent field is decoded, before the model finishes generating the full classification response.

**Classifier schema:**
```typescript
// packages/shared/src/unified-chat/schema.ts (NEW)
const intentClassificationSchema = z.object({
  intent: z.enum([
    "formula", "sql", "regex", "script", "template",
    "file_analysis", "ocr", "table", "unknown"
  ]),
  confidence: z.enum(["high", "low"]),
  // Only populated when intent === "table":
  tableHint: z.object({
    columns: z.array(z.string()),
    rowCount: z.number().optional(),
    purpose: z.string()
  }).optional()
});
```

When `confidence === "low"` OR `intent === "unknown"`: the route handler streams a clarification event instead of generating, asking the user to be more specific.

### toolKind Strategy: Preserve Existing toolKinds Through the Unified Entry Point

The unified route classifies the intent and saves each exchange using the **resolved toolKind** (e.g., "formula", "sql"), NOT a generic "unified" kind. This means:

1. Conversation history flows naturally: `findConversationExchanges(userId, "formula")` still returns all formula turns whether typed via the unified chat or the old formula page.
2. The per-tool conversation isolation (MULTI-03) is preserved without any changes to `buildToolContextMessages` or `context-messages.ts`.
3. The existing `serializeAssistant()` switch cases continue to work without modification for the five existing kinds.

For **table turns**, introduce the new string `"unified_table"` as the toolKind. This does not overlap existing kinds and gives the clarification/generation loop its own history partition.

**Changes required:**
- `VALID_TOOL_KINDS` in `app/api/conversations/[tool]/route.ts` must include `"unified_table"` to allow clearing table history.
- `useWorkspaceToolKind()` in `topbar.tsx` currently maps `/workspace` → `"formula"`. In v2.0, the `/workspace` root no longer owns formula history exclusively; the "Nova conversa" action on the unified page must clear all toolKinds for the user (or present a picker). The simplest approach: `useWorkspaceToolKind()` returns `"unified"` for `/workspace`, and the Topbar calls `DELETE /api/conversations/unified` which iterates all known toolKinds.

### Coexistence with Per-Tool Pages

All existing `/api/tools/*` route handlers and per-tool pages remain unchanged. Deep-linked per-tool pages (`/workspace/sql`, etc.) continue to work. ToolNav pills are removed from the `/workspace` root page but remain functional if the per-tool pages are kept for deep-linking. Progressive deprecation of per-tool pages can happen in a later milestone.

---

## (b) Table Data Model

### Decision: Ephemeral Grid State + TableSpecPayload in ConversationExchange

The **live grid state** (current cell values post-user-edits) is ephemeral client-side `useState` — never persisted. This matches the File Analysis pattern (D-07) and avoids LGPD complexity around user-entered data.

The **table spec** (column structure, formula definitions, initial seed data generated by the LLM) is persisted in `ConversationExchange.assistantPayload` as a new discriminated payload kind. No new Prisma model is required for v2.0.

**New assistantPayload kind: `"table_spec"`**

```typescript
// packages/shared/src/table/schema.ts (NEW)
type TableSpecPayload = {
  kind: "table_spec";
  columns: Array<{
    key: string;             // machine key, e.g. "total"
    header: string;          // display label, e.g. "Total (R$)"
    type: "text" | "number" | "formula";
    formula?: string;        // row-level template, e.g. "=SOMA(B{row};C{row})"
    width?: number;
  }>;
  rows: Array<Record<string, string | number>>;  // LLM-generated seed data
  purpose: string;                               // human-readable description
  formulaLanguage: "pt-BR" | "en";
  separator: ";" | ",";
};
```

**Why no new TableSpec Prisma model in v2.0:**
- Avoids a migration that is not strictly required.
- The existing `guardPayloadSize` limit (32 KB per row in `conversation-repository.ts`) accommodates reasonable table specs (50 rows × 20 columns is well within limit).
- If users need to "restore" a previously generated table, the `ConversationExchange` record already holds the full spec.
- A dedicated model becomes necessary only if v2.x requirements add named/saved tables, sharing between users, or server-side formula execution — all out of scope for v2.0.

**LLM Output → Client Grid Contract:**

The streaming contract uses a new NDJSON event schema for the unified-table endpoint:

```typescript
// packages/shared/src/table/schema.ts
const tableStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("clarification"), question: z.string() }),
  z.object({ type: z.literal("metadata"), providerModel: z.string() }),
  z.object({ type: z.literal("quota_warning"), lastFreeUse: z.boolean() }),
  z.object({ type: z.literal("complete"), payload: tableSpecPayloadSchema }),
  z.object({ type: z.literal("error"), message: z.string() })
]);
```

The `TableGridPanel` receives a `TableSpecPayload` and:
1. Renders column headers from `payload.columns`
2. Populates initial rows from `payload.rows`
3. For formula columns: evaluates formulas on every cell change using `@formulajs/formulajs` (see section d)
4. Supports inline editing on text/number cells
5. Provides CSV download (plain Blob + anchor click) and XLSX download (SheetJS `xlsx` community edition)

**Table ↔ conversation thread relationship:**
A single table generation occupies one `ConversationExchange` row with `mode = "generate"` and `toolKind = "unified_table"`. Clarification turns that precede it have `mode = "clarification"` and are stored in the same toolKind partition but are excluded from LLM context by the existing `mode === GENERATE_MODE` filter in `buildToolContextMessages`. The generated table spec appears in the chat thread as a `TableExchange` bubble (grid + export controls).

---

## (c) Clarification Loop

### Decision: Extra Turns in the Same ConversationExchange Partition, No Separate State Machine Model

The clarification loop is modeled as **regular ConversationExchange turns** with `toolKind = "unified_table"` and `mode = "clarification"`. No new Prisma model, no server-side state machine, no draft spec table.

**Why this is sufficient:**
The clarification "state" is implicit in the conversation thread. If the last `unified_table` exchange has `mode = "clarification"`, the system knows a table spec is in progress. The intent classifier prompt for subsequent turns includes the conversation context (passed by the client or loaded by the server), so the classifier sees the prior clarification exchange and correctly identifies that the user is answering a clarification question.

**Turn flow:**

```
Turn 1 — User: "cria uma planilha de controle de gastos"
  → Classifier: intent="table", confidence="low" (incomplete spec)
  → Route: does NOT call table generator
  → Streams: { type: "clarification", question: "Quantas categorias de gasto você usa? Quer fórmulas de total por categoria?" }
  → Persists: ConversationExchange { toolKind="unified_table", mode="clarification", userPrompt=..., assistantPayload={ kind:"clarification", question:... } }
  → Client: renders ClarificationBubble, input remains enabled

Turn 2 — User: "4 categorias: alimentação, transporte, moradia, lazer. Sim, quero totais"
  → Classifier: intent="table", confidence="high", tableHint has full spec
  → Route: calls table-stream.ts resolveTableSpec(text, tableHint, clarificationHistory)
  → Streams: { type: "complete", payload: TableSpecPayload }
  → Persists: ConversationExchange { toolKind="unified_table", mode="generate", assistantPayload: TableSpecPayload }
  → Client: renders TableExchange with live TableGridPanel
```

**Clarification context injection:**
The table generator (`table-stream.ts`) must load the prior clarification turns for `unified_table` explicitly using `findConversationExchanges(userId, "unified_table")`. Unlike the five existing tools, which filter `mode === "generate"`, the table generator must include `mode === "clarification"` turns as additional context to understand what the user specified. This is a table-specific modification to how history is used — the existing `buildToolContextMessages` filter is bypassed for this purpose.

**Intent switch handling:**
The classifier prompt must explicitly handle the case where a user abandons a clarification mid-flow (e.g., after being asked about table structure, the user says "na verdade, gera uma fórmula SOMASE"). The classifier returns a different `intent` and the route handler abandons the table thread, leaving the clarification exchanges in the DB as orphans. This is acceptable for v2.0.

---

## (d) Live Formula Recalculation

### Decision: @formulajs/formulajs (MIT) with Custom pt-BR Name Mapping

**Rejected: HyperFormula (GPLv3)**
Sending GPL-licensed JavaScript to the browser constitutes distribution under GPLv3. The "SaaS loophole" does not exempt browser-delivered JS — GPL requires the entire application to be open-source OR a commercial license must be purchased. For a closed SaaS without validated demand for this feature, purchasing a commercial license from Handsontable is premature.

**Chosen: `@formulajs/formulajs` (MIT license)**
This is the actively maintained community fork of the original Handsontable formula.js. It implements Excel/Google Sheets functions as individual TypeScript functions, is headless (no grid dependency), and runs in the browser without any graph or dependency management.

**What it does:** Evaluates individual formula calls with resolved arguments. Example: `formulajs.SUM(10, 20)` → `30`.

**What it does NOT do:** It does not resolve `A1`-style cell references or build a dependency graph. The `TableGridPanel` component owns the dependency resolution.

**Client-side formula execution strategy:**

The LLM generates formulas with `{row}` placeholders at column level (e.g., `=SOMA(B{row};C{row})`). The grid component resolves these before calling the evaluator:

```
User edits cell B3 (rowIndex=2)
  → setRows(rows.map((r, i) => i === 2 ? {...r, B: newValue} : r))
  → useEffect([rows]): recalculateFormulas(rows, columns)
      for each row r at index i:
        for each column c where c.type === "formula":
          resolved = c.formula.replace("{row}", String(i + 1))
          fnName = extractFunctionName(resolved)          // "SOMA"
          enName = PT_BR_TO_EN[fnName] ?? fnName          // "SUM"
          args = extractArgs(resolved, r)                  // [r.B, r.C]
          result = formulajs[enName](...args)
          r[c.key] = result
      setRows(recalculated)
```

This is sufficient for the LLM-generated table use case because:
- Formulas operate row-by-row (aggregate and conditional: SOMA, SE, SOMASE, MÉDIA, etc.)
- No arbitrary `A1:A100` range references, INDIRECT, OFFSET, or cross-row lookups — these are out of scope for v2.0 table generation
- The LLM is instructed to generate only row-level formulas matching the mapping table

**Brazilian localization mapping:**

The LLM generates pt-BR function names because Brazilian Excel uses them. The evaluator speaks English. A mapping table in `packages/shared/src/table/formula-locale.ts` bridges them:

```typescript
export const PT_BR_TO_EN: Record<string, string> = {
  SOMA: "SUM", SE: "IF", SOMASE: "SUMIF", SOMASES: "SUMIFS",
  MÉDIA: "AVERAGE", MÉDIASE: "AVERAGEIF",
  CONT: "COUNT", CONTA: "COUNTA", CONT_SE: "COUNTIF",
  MÁXIMO: "MAX", MÍNIMO: "MIN", ABS: "ABS",
  ARRED: "ROUND", ARREDONDAR: "ROUND",
  CONCATENAR: "CONCATENATE", TEXTO: "TEXT",
  HOJE: "TODAY", AGORA: "NOW",
  // Extend as LLM output patterns are observed
};
```

**Fixture fallback:**
When `OPENAI_API_KEY` is absent, `table-stream.ts` returns a hardcoded `TableSpecPayload` with a pre-built 5-row expense-tracker table, following the same pattern as all five existing tools.

**Argument separator:**
The LLM generates formulas with semicolons for pt-BR (`=SOMA(B{row};C{row})`). The argument parser in `TableGridPanel` splits on `;` for pt-BR formulas and `,` for en, using `payload.separator`.

---

## Component Inventory: New vs Modified

### NEW Components

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| `UnifiedChatTool` | Client component | `features/unified-chat/unified-chat-tool.tsx` | Replaces per-tool components on `/workspace`; orchestrates intent dispatch and thread rendering |
| `TableExchange` | Client component | `features/unified-chat/components/table-exchange.tsx` | Renders a single table turn: clarification question OR live grid |
| `TableGridPanel` | Client component | `features/unified-chat/components/table-grid-panel.tsx` | Editable grid via react-datasheet-grid; formula recalc; CSV/XLSX export |
| `ClarificationBubble` | Client component | `features/unified-chat/components/clarification-bubble.tsx` | Renders a clarification question as an assistant bubble |
| `useUnifiedChatStream` | Hook | `features/unified-chat/hooks/use-unified-chat-stream.ts` | Unified stream hook: decodes NDJSON from `/api/chat/unified`; dispatches to sub-renderers |
| `/api/chat/unified` | Route handler | `app/api/chat/unified/route.ts` | Auth, pro-gate, quota, intent classify, dispatch, persist, stream |
| `intent-classifier.ts` | Server AI module | `server/ai/intent-classifier.ts` | Structured Outputs classifier returning `{ intent, confidence, tableHint }` |
| `table-stream.ts` | Server AI module | `server/ai/table-stream.ts` | Table spec generator; clarification branch; returns `TableStreamEvent` NDJSON |
| `packages/shared/src/table/schema.ts` | Shared types | — | `TableSpecPayload`, `tableStreamEventSchema`, Zod validators |
| `packages/shared/src/table/formula-locale.ts` | Shared util | — | pt-BR → English formula name mapping |
| `packages/shared/src/unified-chat/schema.ts` | Shared types | — | `IntentClassification`, `intentClassificationSchema` |

### MODIFIED Components

| Component | Change | Risk |
|-----------|--------|------|
| `packages/shared/src/index.ts` | Export new `./table/*` and `./unified-chat/*` schemas | Low |
| `server/ai/context-messages.ts` `serializeAssistant()` | Add `"table_spec"` case: serialize `purpose` + column headers as prosa for LLM context | Low |
| `app/api/conversations/[tool]/route.ts` `VALID_TOOL_KINDS` | Add `"unified_table"` to the allowlist | Low |
| `components/app/topbar.tsx` `useWorkspaceToolKind()` | Map `/workspace` root to `"unified"` (currently maps to `"formula"`); update "Nova conversa" handler | Medium — behavior change |
| `app/(workspace)/workspace/page.tsx` | Replace `FormulaTool` with `UnifiedChatTool`; server-prefetch exchanges for all toolKinds or defer to client | Medium |
| `components/app/tool-nav.tsx` | Remove from unified workspace page; retain for deep-linked per-tool pages | Medium — UX change |

### NOT MODIFIED (Preserved)

- All `features/formula`, `features/sql`, `features/regex`, `features/scripts`, `features/template` components and hooks
- All `/api/tools/*` route handlers
- `server/extraction/dispatcher.ts` and all extractors (unified route reuses unchanged)
- `server/usage/quota-service.ts` (unified route calls `reserveToolUse` with the same signature)
- `prisma/schema.prisma` — no schema migration required for v2.0 MVP

---

## Data Flow: Unified Chat Request (Table Intent)

```
User: "cria planilha de controle de gastos mensais com fórmulas de total"

[Client] useUnifiedChatStream.submit(text, file?)
  → POST /api/chat/unified

[Server] /api/chat/unified:
  1. getSessionFromCookieHeader → userId (401 if missing)
  2. Parse body (JSON or multipart)
  3. If file present: getUserEntitlement → 403 if free
  4. reserveToolUse(userId, "unified", "generate") → reservationKey (429 if quota exceeded)
  5. If file present: extractContent(buffer, name) → attachmentContext
  6. intent-classifier.ts: classifyIntent(text, unifiedHistory)
     → { intent: "table", confidence: "low", tableHint: { purpose: "controle de gastos" } }
  7. intent = "table", confidence = "low":
     → stream { type: "clarification", question: "Quantas categorias..." }
     → saveConversationExchange(userId, "unified_table", "clarification", ...)
     → confirmToolUse(reservationKey)
  8. Return 200 with NDJSON stream containing clarification event

[Client] receives "clarification" event:
  → renders ClarificationBubble
  → input remains enabled for follow-up

[User] answers: "4 categorias: alimentação, transporte, moradia, lazer. Quero totais"

[Server] second request:
  6b. classifyIntent(text, unifiedHistory including clarification turn)
      → { intent: "table", confidence: "high", tableHint: { columns: [...], purpose: "..." } }
  7b. intent = "table", confidence = "high":
      → table-stream.ts: resolveTableSpec(text, tableHint, clarificationHistory)
      → returns TableSpecPayload
      → stream { type: "complete", payload: TableSpecPayload }
      → saveConversationExchange(userId, "unified_table", "generate", TableSpecPayload)
      → confirmToolUse(reservationKey)

[Client] receives "complete" event with payload.kind === "table_spec":
  → renders TableExchange containing TableGridPanel (live editable grid)
```

---

## Data Flow: Live Formula Recalculation

```
[TableGridPanel initial render]
  rows = [...payload.rows]   (useState, local)
  columns = payload.columns  (immutable from payload)
  formulaLanguage = payload.formulaLanguage
  separator = payload.separator

User edits cell at [rowIndex=2, colKey="alimentacao"]
  → onChange → setRows(rows.map(r, i) => i === 2 ? {...r, alimentacao: 450} : r)
  → useEffect([rows]):
      recalculate = rows.map((row, i) => {
        const updated = { ...row };
        for (const col of columns) {
          if (col.type !== "formula") continue;
          const formula = col.formula.replace("{row}", String(i + 1));
          // formula: "=SOMA(B{row};C{row};D{row};E{row})" → "=SOMA(B3;C3;D3;E3)"
          const args = extractArgValues(formula, row, separator);
          // args: [row.alimentacao, row.transporte, row.moradia, row.lazer]
          const fnName = extractFunctionName(formula); // "SOMA"
          const enFn = PT_BR_TO_EN[fnName] ?? fnName;  // "SUM"
          updated[col.key] = formulajs[enFn](...args);
        }
        return updated;
      });
      setRows(recalculate);

User clicks "Exportar CSV":
  → const csv = rows.map(r => columns.map(c => r[c.key]).join(";")).join("\n");
  → const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  → anchor.href = URL.createObjectURL(blob); anchor.download = "tabela.csv"; anchor.click();

User clicks "Exportar XLSX":
  → SheetJS: ws = XLSX.utils.json_to_sheet(rows); wb = XLSX.utils.book_new();
  → XLSX.utils.book_append_sheet(wb, ws, "Tabela");
  → XLSX.writeFile(wb, "tabela.xlsx");
```

---

## Architectural Patterns

### Pattern 1: Classifier-Then-Dispatch (Server-Side, Single API Call)

**What:** A single OpenAI Structured Outputs call returns `{ intent, confidence, tableHint }`. The route handler then calls the appropriate existing resolver. No additional LLM call for the classifier itself.
**When to use:** Any unified input that must route to multiple downstream generators.
**Trade-offs:** First-request schema preprocessing latency (~10 s one-time per schema, cached by OpenAI). Streaming allows dispatching to begin as the intent field is decoded. P50 latency for subsequent requests is equivalent to a direct tool call.

### Pattern 2: Resolved toolKind Preserved Through Unified Entry Point

**What:** The unified route classifies intent and writes `ConversationExchange` records using the resolved toolKind ("formula", "sql", etc.), not a generic "unified" kind. History isolation is preserved per tool.
**When to use:** Adding a unified entry point over existing per-tool logic without breaking multi-turn context injection.
**Trade-offs:** History is partitioned by tool; a "unified history view" would require a multi-kind query. Acceptable for v2.0.

### Pattern 3: Clarification as Regular Turns with mode=clarification

**What:** Clarification turns are `ConversationExchange` records with `mode = "clarification"`. The existing `mode === GENERATE_MODE` filter in `buildToolContextMessages` automatically excludes them from general LLM context injection.
**When to use:** Multi-turn slot-filling that must not pollute the generation context of other tools.
**Trade-offs:** The table generator must explicitly load clarification turns for context, bypassing the GENERATE_MODE filter. This is a deliberate exception rather than a system-wide change.

### Pattern 4: Ephemeral Grid, Persisted Spec

**What:** `TableSpecPayload` is persisted in `ConversationExchange.assistantPayload`. The live grid state (user edits after generation) is ephemeral `useState`.
**When to use:** Privacy-constrained products where user-entered data must not persist.
**Trade-offs:** Users lose manual edits on page reload. The LLM-generated seed data is recoverable from history; user edits are not. The primary workflow is "generate → review → export," not "generate → edit over days."

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Two-Step Classify-Then-Generate with Separate Sequential API Calls

**What people do:** Call the LLM once to classify intent (returns a string), then call it again to generate. Two sequential `await client.chat.completions.create()` in the route handler.
**Why it's wrong:** Doubles latency before the first streaming byte reaches the client. With the 2.5 s streaming start constraint, two sequential LLM calls exceed the budget for any non-trivial prompt.
**Do this instead:** Structured Outputs classification combined with immediate dispatch. The classification call is small (fixed output schema) and cached after first use.

### Anti-Pattern 2: Generic "unified" toolKind for All Exchanges

**What people do:** Save every unified chat exchange with `toolKind = "unified"` regardless of resolved intent.
**Why it's wrong:** Destroys history isolation by tool (MULTI-03). Formula follow-up context would include SQL and regex exchanges. `buildToolContextMessages` would serialize all "unified" exchanges as context for every tool call, producing incoherent LLM context.
**Do this instead:** Save with the resolved toolKind. The classifier's job is to determine which kind applies to each turn.

### Anti-Pattern 3: HyperFormula Under GPLv3 in a Closed SaaS

**What people do:** `npm install hyperformula`, use `licenseKey: 'gpl-v3'`, ship to browser.
**Why it's wrong:** Sending GPL-licensed JavaScript to the browser is distribution under GPLv3, requiring the entire application to be open-source or a commercial license to be purchased. The "SaaS loophole" does not apply to browser-delivered code.
**Do this instead:** Use `@formulajs/formulajs` (MIT) with a custom pt-BR→en function name mapping covering the ~20 functions the LLM generates.

### Anti-Pattern 4: Client-Side Intent Hint Routing

**What people do:** Detect intent on the client (keyword matching, regex, or a small local model) and set an `intentHint` field before sending to the server. Route based on the hint.
**Why it's wrong:** The hint is unreliable for ambiguous Brazilian Portuguese prompts ("cria uma tabela" could mean formula table, SQL table, or the new interactive table). A wrong hint wastes a quota unit. Client-side logic is also bypassed by direct API callers.
**Do this instead:** Server-side classification with the same LLM model. The quota reserve occurs before classification; release is called in the catch block on error.

### Anti-Pattern 5: Persisting Live Grid Edits

**What people do:** Send cell edit events from the client to a server-side endpoint to persist user edits to the table in real time.
**Why it's wrong:** Creates a running write workload for every keystroke, LGPD complexity for user-entered financial/personal data, and a new data model that requires cleanup policies.
**Do this instead:** Keep grid edits ephemeral in client `useState`. The export step (CSV/XLSX) captures the final state. If the user needs to restore, they regenerate from the original prompt.

---

## Recommended Build Order (Front-loads Riskiest Unknowns)

Riskiest unknowns: (1) intent classifier reliability for Brazilian Portuguese prompts; (2) formula recalculation correctness with pt-BR names. Validate these before building the full unified UI.

```
Phase A — Intent Classifier (Risk: LLM classification reliability)
  1. New shared types: unified-chat/schema.ts, table/schema.ts, table/formula-locale.ts
  2. intent-classifier.ts with Structured Outputs
  3. /api/chat/unified route — classification + dispatch to existing resolvers only (no table yet)
  4. useUnifiedChatStream hook — existing output panels wired up
  5. UnifiedChatTool replacing /workspace page, renders existing TextExchange output panels
  VALIDATE: Intent classification accuracy across 20 test prompts in Portuguese
  VALIDATE: Formula/SQL/Regex turns use the correct per-tool history partition

Phase B — Clarification Loop (Risk: state management correctness)
  6. table-stream.ts — clarification branch (streams clarification events)
  7. ClarificationBubble component
  8. Table clarification turn persistence (toolKind="unified_table", mode="clarification")
  9. Multi-turn context loading for table generator (includes clarification turns)
  VALIDATE: Full clarification → generation loop end-to-end

Phase C — Table Grid (Risk: formula recalc + pt-BR mapping)
  10. TableGridPanel with react-datasheet-grid (display only, no formulas yet)
  11. Formula recalc integration with @formulajs/formulajs
  12. pt-BR→en mapping for 20 most common functions
  13. CSV export (Blob + anchor)
  VALIDATE: Formula recalculation correctness for SOMA, SE, SOMASE, MÉDIA, CONT_SE

Phase D — Polish and Migration
  14. XLSX export (SheetJS)
  15. ToolNav removal from unified workspace page
  16. Topbar "Nova conversa" updated for unified toolKind clearing
  17. serializeAssistant() case for "table_spec" in context-messages.ts
  18. Fixture fallback for table generator (no OPENAI_API_KEY)
  19. VALID_TOOL_KINDS updated in conversations/[tool]/route.ts
```

---

## Integration Points Summary

| Integration Point | Existing Contract | Change Required |
|-------------------|-------------------|-----------------|
| `reserveToolUse` | `(userId, toolKind, mode)` | Call with `"unified"` as toolKind for analytics; no function signature change |
| `saveConversationExchange` | `(userId, toolKind, mode, ...)` | Call with resolved toolKind; `"unified_table"` is a new valid value |
| `findConversationExchanges` | `(userId, toolKind)` | Unified route loads history per resolved toolKind after classification; table route loads `"unified_table"` history including clarification turns |
| `extractContent` dispatcher | `(Buffer, string) → ExtractionResult` | No change; unified route calls identically |
| `buildToolContextMessages` | `(toolKind, history, systemPrompt, userPrompt, attachmentContext?)` | No change for text tools; table generator builds its own context array including clarification turns |
| `serializeAssistant` in context-messages.ts | Switch on payload.kind | Add `"table_spec"` case returning `purpose` + column list as prosa |
| `VALID_TOOL_KINDS` in conversations/[tool]/route.ts | `["formula","sql","regex","script","template"]` | Add `"unified_table"` |
| `useWorkspaceToolKind()` in topbar.tsx | Maps `/workspace` → `"formula"` | Map `/workspace` → `"unified"`; update "Nova conversa" to clear all tool histories |
| `@tabelin/shared` index.ts | Exports existing tool schemas | Add `./table/schema`, `./table/formula-locale`, `./unified-chat/schema` |

---

## Scaling Considerations

| Scale | Concern | Approach |
|-------|---------|---------|
| 0-5k users | Classifier adds one extra LLM call per unified chat request | Acceptable; schema is cached by OpenAI after first request |
| 5k-50k users | Unified route is single entry point; classifier latency accumulates | Same serverless/edge pattern as existing routes; horizontal scale is built-in |
| 50k+ users | Intent classification accuracy at scale; ambiguous prompts misroute | A/B test classifier prompt variations; add escape hatch (user-selectable intent pills) |

The table grid is entirely client-side. Formula recalculation scales with grid row count only, not user count.

---

## Sources

- Codebase: `/home/rodrigo/tabelin.ia` — direct inspection of `prisma/schema.prisma`, route handlers, `context-messages.ts`, `conversation-repository.ts`, `formula-stream.ts`, `topbar.tsx`, `tool-nav.tsx`, `workspace-shell.tsx`, `formula-tool.tsx`, `quota-service.ts`
- [OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs) — schema preprocessing latency, caching, no extra round trip, streaming partial JSON
- [OpenAI Latency Optimization guide](https://platform.openai.com/docs/guides/latency-optimization) — placing intent field first in schema enables early routing
- [HyperFormula licensing](https://hyperformula.handsontable.com/docs/guide/licensing.html) — GPLv3 for non-commercial; commercial license required for SaaS; JS-in-browser is distribution
- [HyperFormula i18n features](https://hyperformula.handsontable.com/guide/i18n-features.html) — `functionArgSeparator`, `decimalSeparator` configurable; no built-in pt-BR locale confirmed
- [formulajs/formulajs on GitHub](https://github.com/formulajs/formulajs) — MIT license, active community fork
- [react-datasheet-grid on GitHub](https://github.com/nick-keller/react-datasheet-grid) — MIT license, Excel-like inline editing, actively maintained
- [SheetJS Community Edition](https://docs.sheetjs.com/docs/solutions/output/) — browser XLSX export, widely used
- GPL SaaS loophole: GPL-licensed JavaScript sent to the browser is distribution; GPLv3 applies regardless of server-side SaaS model

---

*Architecture research for: Tabelin.IA v2.0 Chat Unificado & Tabela Viva*
*Researched: 2026-06-08*
