# Project Research Summary

**Project:** Tabelin.IA v2.0 Chat Unificado & Tabela Viva
**Domain:** Brazil-localized spreadsheet AI SaaS — unified intent-routing chat + interactive browser spreadsheet
**Researched:** 2026-06-08
**Confidence:** HIGH

---

## Key Decision #1 (MUST RESOLVE BEFORE DEVELOPMENT): Formula Engine Licensing

The four researchers **disagree** on the browser formula engine. This is the milestone's highest-priority open decision.

**STACK.md position:** Recommends HyperFormula v3.3.0 but requires purchasing a commercial license from Handsontable (GPL-3.0-only; closed-source SaaS cannot ship it under the open-source license).

**ARCHITECTURE.md and PITFALLS.md position:** Recommend AGAINST HyperFormula for v2.0. Shipping GPL-licensed JavaScript to the browser constitutes distribution under GPLv3 — the "SaaS loophole" (serving code over the network without distribution) does NOT apply to browser-delivered JS. These researchers recommend `@formulajs/formulajs` (MIT) with a custom pt-BR → EN function-name mapping table maintained in `packages/shared/src/table/formula-locale.ts`.

**Synthesized recommendation: Use `@formulajs/formulajs` (MIT) as the default.** The MIT path unblocks development immediately, carries zero legal risk, and is sufficient for the v2.0 use case (row-level formulas: SOMA, SE, SOMASE, MÉDIA, CONT.SE — no arbitrary cross-row A1:A100 references). HyperFormula remains a valid upgrade path for v2.1+ if a commercial license is purchased and demand for advanced cross-sheet formulas is validated. Do not add `hyperformula` to package.json without a signed contract.

**Limitation of the MIT path:** `@formulajs/formulajs` has no dependency graph and no A1-style cell reference resolution. The grid component must own argument extraction. This is acceptable for the LLM-generated table use case (LLM is instructed to generate only row-level formulas matching the mapping table). The architecture section documents exactly how this works.

---

## Secondary Open Questions

These must be resolved in requirements or early phase planning — not deferred to implementation:

**(a) History partition key.** FEATURES.md proposes migrating from `userId+toolKind` to `userId+sessionId`. ARCHITECTURE.md argues to keep `toolKind` as the partition key and add `"unified_table"` as a new kind — no Prisma migration required, context isolation preserved per tool, and existing `buildToolContextMessages` logic unchanged. **Recommended: Keep toolKind, add "unified_table" kind.** The unified route saves each exchange with the resolved toolKind ("formula", "sql", etc.) so tool-specific history continues to work. Only table-related turns use the new "unified_table" kind.

**(b) Classifier model and 2.5s latency constraint.** Using a dedicated LLM call for intent classification before generation adds 1–3.5s on the critical path, breaking the existing 2.5s streaming-start SLA. ARCHITECTURE.md and PITFALLS.md agree: classification must be embedded into the generation call via OpenAI Structured Outputs, not run as a sequential separate call. The intent field is placed first in the schema so streaming allows dispatch to begin before the full response is decoded.

**(c) SheetJS/xlsx commercial-use licensing.** xlsx 0.18.5 (the version already installed, Apache-2.0) is confirmed usable for export. Versions 0.20.x from the SheetJS CDN are not on npm and should not be used. No action required — the installed version is clean.

**(d) Tab removal vs. gradual cutover.** FEATURES.md flags hard removal of all tool tabs as an anti-feature. Per-tool pages must remain accessible (sidebar or deep links) so users with dedicated workflows (Carlos's daily SQL, Mariana's formula work) are not regressed. The unified chat becomes the default entry point; tabs become optional shortcuts, not removed.

---

## Executive Summary

Tabelin.IA v2.0 adds three capabilities to an already-shipped v1.2 foundation: a unified chat entry point with automatic intent routing (replacing the explicit tool-tab navigation), an interactive browser spreadsheet with live formula recalculation (the "Tabela Viva"), and a multi-turn clarification loop that collects a complete table specification before generating any grid. The existing stack (Next.js 16.2.6, React 19.2.6, OpenAI SDK 6.39.0, Prisma 7.8.0, xlsx 0.18.5, Zod 4.4.3) needs only two new npm dependencies: `react-datasheet-grid` (MIT, ~58 KB packed, Excel-like editing with keyboard navigation and copy-paste) and `@formulajs/formulajs` (MIT, ~100 Excel functions). No Prisma schema migration is required for the v2.0 MVP — the `ConversationExchange` model is extended by adding a new `toolKind` value ("unified_table") and a new `assistantPayload` discriminant ("table_spec"), both backward-compatible changes.

The recommended approach integrates the intent classifier directly into the generation API call using OpenAI Structured Outputs, avoiding a sequential classify-then-generate flow that would blow the 2.5s streaming-start SLA. The server route `/api/chat/unified` classifies intent, saves each exchange using the resolved toolKind (preserving existing multi-turn history isolation), and dispatches to the existing per-tool resolvers or to the new `table-stream.ts` module. The live grid is entirely client-side: `react-datasheet-grid` renders cells, and `@formulajs/formulajs` evaluates formulas via a pt-BR → EN name mapping table. Grid edits are ephemeral (`useState`) — only the LLM-generated `TableSpecPayload` is persisted to `ConversationExchange.assistantPayload`, following the same privacy pattern as File Analysis.

The primary risks are: (1) the formula engine licensing decision (resolved — use MIT path); (2) classifier latency violating the 2.5s SLA (resolved — single structured-output call, intent field first in schema); (3) pt-BR locale not being built into any formula engine (resolved — build a mapping table for ~20 core functions); (4) the clarification loop running forever (resolved — hard cap of 2 turns, "Gerar mesmo assim" escape hatch, quota only debited on generation); (5) CSV injection in export (resolved — prefix `=`, `+`, `-`, `@` cells with `'` in CSV, use `t: "s"` in XLSX for user-edited cells).

---

## Key Findings

### Recommended Stack

The v2.0 stack adds only two net-new production dependencies to the existing production foundation. Everything else (intent classification, export, multi-turn history, streaming, attachment pipeline) reuses libraries already in production.

**New dependencies:**
- `react-datasheet-grid` v4.11.6 (MIT, ~58 KB packed): Excel-like inline editing, native keyboard navigation, copy-paste to/from spreadsheets, row+column virtualization via react-virtual, TypeScript types included. Requires `"use client"` and explicit CSS import in Next.js App Router. Chosen over AG Grid (2-3x larger bundle, BI-dashboard API) and Glide Data Grid (canvas rendering blocks DOM-based formula integration).
- `@formulajs/formulajs` (MIT): ~100 Excel functions as individual TypeScript functions; headless; no dependency graph. Sufficient for row-level formulas generated by the LLM. No A1-style reference resolution — the grid component owns argument extraction from the `{row}` placeholder substitution pattern.

**No HyperFormula without a signed commercial license.** GPL-3.0-only; browser delivery is distribution; SaaS loophole does not apply to client-delivered JS.

**No new dependencies needed for:** intent classification (OpenAI SDK + Zod + `zodResponseFormat` already in production), export (xlsx 0.18.5 already in production), multi-turn history (ConversationExchange already in production), streaming (existing NDJSON hooks reused).

### Expected Features

**Must have — Chat Unificado (table stakes):**
- Single input field that accepts any request, routes automatically — no tool pre-selection required
- Inline rendering of different output types (CodeBlock, TableGrid, TextResponse) in the same thread
- Intent pill showing the detected type with a one-click override for misclassification
- Preservation of tool-specific context between turns (resolved toolKind per exchange)
- No regression of the 7 existing capabilities (formula, SQL, regex, scripts, template, file analysis, OCR)

**Must have — Tabela Interativa (table stakes):**
- Editable grid (click to edit, Tab/Enter/arrow navigation)
- Live formula recalculation in the browser after each cell edit
- pt-BR localization: `;` argument separator, `,` decimal, `DD/MM/YYYY` dates, R$ currency formatting
- pt-BR function names in formulas (PROCV, SE, SOMASE, MÉDIA, CONT.SE — ~20 most common)
- Add/remove rows and columns, copy/paste (Ctrl+C/V), Undo/Redo (Ctrl+Z/Y), sort column
- Export CSV and XLSX (client-side, using existing xlsx library)

**Must have — Loop de Clarificação (table stakes):**
- One question per turn — hard constraint in system prompt
- Hard cap: maximum 2 clarification turns before forcing generation
- "Gerar mesmo assim" button visible from the first clarification turn
- ConfirmationCard summarizing collected slots before final generation
- Quota debited ONLY on generation, never on clarification turns

**Should have (competitive differentiators):**
- Intent type pill with manual override dropdown ("Fórmula / SQL / Tabela / …")
- Platform/dialect context persisted in session (Excel/Sheets, SQL dialect)
- Progress indicator during clarification ("Pergunta 1 de 2")
- R$ currency auto-formatting for numeric columns named "valor", "preço", "total"
- "Próximos passos" suggestion chips below each output

**Defer to v2.x / v3+:**
- Retroactive table editing via chat — requires robust state delta management
- AutoFilter (filter dropdown on columns) — validate demand first
- Multi-sheet tables — multiplies state management complexity
- Full pt-BR language pack (100+ functions) — start with 20, extend from usage data

**Anti-features (do not build):**
- Multiple clarification questions in a single turn — cognitive overload
- Table generated without confirmation — wrong structure causes more frustration than the click saves
- Server-side formula recalculation — latency on every edit breaks spreadsheet UX contract
- Hard removal of all tool tabs — regression for power users with dedicated workflows
- Multi-sheet in v2.0 — scope creep multiplier

### Architecture Approach

The v2.0 architecture adds a single new server route (`/api/chat/unified`), two new server AI modules (`intent-classifier.ts`, `table-stream.ts`), and four new client components (`UnifiedChatTool`, `TableExchange`, `TableGridPanel`, `ClarificationBubble`) while preserving every existing route handler, component, and Prisma model unchanged. The `ConversationExchange` model is extended without a migration: the new `toolKind` value `"unified_table"` partitions clarification and table-generation turns, and the new `assistantPayload` discriminant `"table_spec"` carries the `TableSpecPayload` struct.

**Major components (new):**
1. `/api/chat/unified` (route handler) — auth, pro-gate, quota reserve, extraction, classify, dispatch to existing resolvers or table generator, persist with resolved toolKind, stream NDJSON
2. `intent-classifier.ts` (server AI module) — single OpenAI Structured Outputs call returning `{ intent, confidence, tableHint }`; intent field first in schema for early streaming dispatch
3. `table-stream.ts` (server AI module) — clarification branch and generation branch; loads clarification history including `mode="clarification"` turns
4. `TableGridPanel` (client component) — react-datasheet-grid + @formulajs/formulajs + PT_BR_TO_EN mapping; `{row}` placeholder substitution; CSV + XLSX export
5. `packages/shared/src/table/formula-locale.ts` (shared util) — PT_BR_TO_EN mapping (SOMA→SUM, SE→IF, PROCV→VLOOKUP, SOMASE→SUMIF, MÉDIA→AVERAGE, etc.)

**Key architectural decisions:**
- Classifier embedded in single API call (not two sequential calls) — preserves 2.5s SLA
- Resolved toolKind per exchange (not generic "unified") — history isolation maintained
- Clarification turns as `mode="clarification"` in `unified_table` partition — excluded from all other tools by existing GENERATE_MODE filter; explicitly included only in table generator
- Ephemeral grid state; `TableSpecPayload` persisted in `ConversationExchange.assistantPayload`
- No Prisma schema migration required for v2.0 MVP

### Critical Pitfalls

1. **HyperFormula GPL contamination** — Do not add `hyperformula` to `package.json` without a signed commercial contract. Use `@formulajs/formulajs` (MIT). Recovery after shipping GPL code to the browser is a full engine rewrite.

2. **Classifier latency breaks 2.5s SLA** — Two sequential LLM calls add 1–3.5s before first token. Use a single Structured Outputs call with intent field first. Validate p50 latency in production before launch.

3. **pt-BR locale not built into any formula engine** — `@formulajs/formulajs` speaks English only. A PT_BR_TO_EN mapping table is required before the grid is usable. Build the mapping table as the first task of the table phase. Acceptance criterion: `=PROCV(A1;B1:C10;2;0)` evaluates without `#NAME?`.

4. **Clarification loop runs forever** — Hard cap of 2 turns and an escape-hatch button are non-negotiable. Quota must be reserved only at generation, not at each clarification turn.

5. **CSV injection on export** — Any cell value starting with `=`, `+`, `-`, `@`, `\t`, `\r` must be prefixed with `'` in CSV; user-edited cells must use `t: "s"` in XLSX. Failure turns exported files into attack vectors.

6. **Grid without virtualization crashes mid-range laptops** — react-datasheet-grid uses react-virtual internally. Do not replace with naive `array.map()`. Set table size ceiling of 200 rows × 26 columns for v2.0.

7. **Scope creep: mini-Excel becomes Excel** — Hard boundary in requirements: no cell merge, no freeze panes, no multi-sheet, no conditional formatting. "Open in Excel via export" is the escape hatch.

---

## Implications for Roadmap

Based on combined research, the recommended build order front-loads the two riskiest technical unknowns (classifier reliability for Brazilian Portuguese; formula recalculation correctness with pt-BR names) before building the full UI surface.

### Phase A: Intent Classifier + Unified Route

**Rationale:** Classifier reliability determines whether the entire chat unification concept is viable. Validating it with 20 real Portuguese prompts costs one sprint and unblocks all downstream phases.

**Delivers:** `/api/chat/unified` route with classification and dispatch to existing text-tool resolvers. `/workspace` page renders `UnifiedChatTool`. Existing formula/SQL/regex/scripts output panels wired behind the unified input. Per-tool pages preserved.

**Addresses:** Single input, inline rendering, intent pill with override, context carry via resolved toolKind, no regression of 7 existing capabilities.

**Avoids:** Classifier latency pitfall (single Structured Outputs call); misrouting + tab removal regression (override pills, per-tool pages preserved); toolKind contamination (resolved toolKind per exchange).

**Research flag:** Standard Structured Outputs pattern — no research-phase needed. Validate empirically with 20 Portuguese test prompts.

---

### Phase B: Clarification Loop

**Rationale:** Clarification is a prerequisite for table generation — the table generator only fires after `confidence="high"`. Building it before the grid avoids complexity of rendering the grid during an incomplete clarification flow.

**Delivers:** `table-stream.ts` clarification branch, `ClarificationBubble`, `mode="clarification"` exchange persistence in `unified_table` partition, multi-turn context loading for table generator.

**Addresses:** One question per turn, 2-turn cap, "Gerar mesmo assim" button, ConfirmationCard, slot-filling state, progress indicator.

**Avoids:** Infinite loop (hard 2-turn cap), context truncation losing slots (serialized slot state injected directly into system prompt), quota debited on clarifications (reserve only fires on `action="generate"`), O(n²) token cost (gpt-4o-mini + slot compression).

**Research flag:** Standard pattern — no research-phase needed. Validate end-to-end clarification → generation loop before proceeding.

---

### Phase C: Table Grid + Formula Recalculation

**Rationale:** Formula recalculation correctness with pt-BR names is the second riskiest unknown. PT_BR_TO_EN mapping must be built and tested before the grid ships.

**Delivers:** `TableGridPanel` (react-datasheet-grid), PT_BR_TO_EN mapping (~20 core functions), @formulajs/formulajs integration via `{row}` placeholder resolution, `TableExchange` in chat thread, CSV export.

**Stack:** `pnpm add react-datasheet-grid --filter web`, `pnpm add @formulajs/formulajs --filter web`.

**Addresses:** Editable grid, live formula recalculation, pt-BR localization (`;` separator, `,` decimal, `DD/MM/YYYY`), add/remove rows/columns, copy/paste, undo/redo, sort.

**Avoids:** pt-BR locale gap (PT_BR_TO_EN mapping), separator mismatch (`;` splitter in arg extraction), performance without virtualization (react-datasheet-grid has built-in react-virtual), XSS in cell renderer (textContent only), CSV injection (prefix hazard chars with `'`).

**Research flag:** MIT formula engine path is well-documented — no research-phase needed. Acceptance criteria: `=PROCV(A1;B1:C10;2;0)` evaluates correctly; `=SOMA(B{row};C{row})` recalculates on cell edit.

---

### Phase D: Polish, XLSX Export, UX Migration

**Rationale:** Lowest-risk items. XLSX export reuses existing xlsx library. UX migration should come after the core loop is stable.

**Delivers:** XLSX export (SheetJS — already in production), ToolNav removal from `/workspace` root (preserved on per-tool pages), `useWorkspaceToolKind()` updated, `VALID_TOOL_KINDS` updated with `"unified_table"`, `serializeAssistant()` case for `"table_spec"`, fixture fallback for table generator, R$ currency formatter, `DD/MM/YYYY` date formatter.

**Avoids:** Hard tab removal regression (pills and deep-links preserved), scope creep (feature freeze after this phase), CSV injection in XLSX (user-edited cells use `t: "s"`).

**Research flag:** Standard patterns — no research-phase needed.

---

### Phase Ordering Rationale

- Classifier before grid: validates routing concept cheaply before committing to heavy UI build.
- Clarification before grid: clarification is a prerequisite for table generation; building them in reverse order means the grid never has a confirmed spec to render.
- Grid before polish: XLSX export and UX migration depend on a working grid but carry no independent technical risk.
- Per-tool pages and route handlers preserved throughout: no regressions at any intermediate state.

### Research Flags

No phase needs a dedicated research-phase. All four phases use patterns already in production (Structured Outputs, NDJSON streaming, ConversationExchange, quota reserve/confirm/release) and libraries with high-confidence documentation.

**Empirical validation required (not research-phase):**
- Phase A: 20 Portuguese test prompts through classifier, measure accuracy before proceeding.
- Phase C: formula acceptance tests (`=PROCV()`, `=SOMASE()`, `=SE()`) before connecting grid to table generator.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All new dependencies verified via npm, official docs, Context7. Existing stack confirmed in production. |
| Features | HIGH | Competitor analysis (Julius AI, Sourcetable, GPTExcel) plus academic references for clarification patterns. |
| Architecture | HIGH | Based on direct codebase inspection of all relevant files — no inference, all integration points confirmed. |
| Pitfalls | HIGH | License risk via official HyperFormula docs; latency via published LLM benchmarks; security via OWASP. |

**Overall confidence: HIGH**

### Gaps to Address During Planning

- **PT_BR_TO_EN function name mapping completeness:** Research confirms ~20 core functions are sufficient for v2.0. The exact mapping must be built and tested empirically — use the Microsoft Excel Online (pt-BR) function list, not generated content.

- **Classifier prompt engineering:** The prompt must handle Portuguese informal language, hybrid intents, and follow-up turns. This is an implementation concern — design and test with real prompts from the existing user base.

- **`buildToolContextMessages` for `unified_table` clarification turns:** Existing function filters `mode === GENERATE_MODE`. The table generator must explicitly load `mode="clarification"` turns — this deliberate exception must be in the acceptance criteria, not left implicit.

- **SheetJS XLSX export: formula cells vs. user-edited cells:** The distinction between `t: "f"` (AI-generated formula columns) and `t: "s"` (user-edited data cells) must be explicitly specified in requirements and acceptance criteria.

---

## Sources

### Primary (HIGH confidence)

- Codebase direct inspection — `prisma/schema.prisma`, `conversation-repository.ts`, `context-messages.ts`, `quota-service.ts`, `topbar.tsx`, `formula-stream.ts`, `apps/web/package.json` — all integration points confirmed
- Context7 `/nick-keller/react-datasheet-grid` — copy-paste, virtualization, keyColumn pattern, v4 CSS import, Next.js App Router compat
- Context7 `/handsontable/hyperformula` — GPL-3.0 licence, commercial licence requirement, separators, language pack API
- https://hyperformula.handsontable.com/docs/guide/licensing.html — GPL-3.0 for open-source; commercial licence required for closed-source SaaS
- https://github.com/handsontable/hyperformula/tree/master/src/i18n/languages — definitive list of 17 built-in languages; `ptBR` absent, `ptPT` present
- https://github.com/formulajs/formulajs — MIT licence confirmed; active community fork
- https://openai.com/index/introducing-structured-outputs-in-the-api/ — `zodResponseFormat`, strict schema adherence, schema caching after first request
- https://owasp.org/www-community/attacks/CSV_Injection — CSV injection vectors and `'` prefix prevention
- https://docs.sheetjs.com/docs/solutions/output/ — XLSX browser export, `t: "s"` vs `t: "f"` cell types

### Secondary (MEDIUM confidence)

- https://arxiv.org/pdf/2512.21120 — ClarifyMT-Bench: one-question-at-a-time reduces error rate 27%, retries from 4.1 to 1.3
- https://docs.bswen.com/blog/2026-03-04-formualizer-vs-hyperformula-comparison/ — Formualizer as MIT alternative; HyperFormula GPL risk summary
- https://medium.com/@kollaikalrupesh/the-llm-latency-problem-nobody-is-solving-right-and-5-fixes-d0305b15d486 — LLM classification p50 latency ~3.4s (basis for sequential-call rejection)
- https://www.shapeof.ai/patterns/follow-up — follow-up suggestion chips pattern after AI output

### Tertiary (LOW confidence)

- https://julius.ai/ and https://sourcetable.com/ — competitor feature analysis via public documentation and third-party reviews; used for feature expectations only

---

*Research completed: 2026-06-08*
*Ready for roadmap: yes*
