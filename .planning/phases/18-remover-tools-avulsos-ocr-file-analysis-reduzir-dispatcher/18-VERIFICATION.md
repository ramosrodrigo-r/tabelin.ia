---
phase: 18-remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher
verified: 2026-06-15T00:30:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 18: Remover Tools Avulsos, OCR, File Analysis & Reduzir Dispatcher — Verification Report

**Phase Goal:** Geradores de texto avulsos, OCR, Análise de Arquivos e geração de tabela do zero saem; classificador de intent e render-dispatcher reduzidos a planilha + Q&A.
**Verified:** 2026-06-15T00:30:00Z
**Status:** passed
**Re-verification:** No — initial (retroactive) verification

This is a **deletion/reduction phase** — the goal is the ABSENCE of removed capabilities plus the PRESERVATION of the in-grid ingestion path and the binary planilha+Q&A axis. Verification is goal-backward: each removed capability must have no entry point in the live codebase, and each preserved path must remain wired.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | Geradores de texto avulsos (Fórmula/SQL/Regex/Scripts/Template) sem entrada por UI nem rota (CLEAN-01) | ✓ VERIFIED | `apps/web/src/app/api/tools/` directory does not exist; `features/{sql,regex,scripts,template,formula}` absent; `server/ai/{formula,sql,regex,scripts,template}-stream.ts` absent; `server/ai/{table-clarifier,destructive-classifier,formula-prompts}.ts` absent; `server/tools/formula-repository.ts` absent |
| 2 | Cadeia completa do OCR (imagem→tabela) removida (CLEAN-02) | ✓ VERIFIED | `app/api/tools/ocr`, `app/workspace/ocr`, `features/ocr`, `server/ai/ocr-processor.ts`, `packages/shared/src/ocr` all absent. PRESERVED: `server/extraction/image-extractor.ts` exists and is wired |
| 3 | File Analysis como tool separado removido; só sobra ingestão CSV/XLSX (CLEAN-03) | ✓ VERIFIED | `app/api/tools/file-analysis`, `app/workspace/file-analysis`, `features/file-analysis`, `server/ai/file-chat-stream.ts`, `server/file-analysis/{file-repository,cleanup-job}.ts` all absent. PRESERVED: `server/file-analysis/file-parser.ts` + `server/extraction/csv-xlsx-extractor.ts` exist and wired |
| 4 | Intent-classifier e render-dispatcher reduzidos a planilha + Q&A (CLEAN-06) | ✓ VERIFIED | `UNIFIED_INTENTS = [sheet_operation, qa, unknown]` (schema.ts:3-6); intent-classifier returns only `sheet_operation`/`qa`/`unknown`; render-dispatcher has only `case "qa_response"` + `case "table_spec"` + `default` |
| 5 | Geração de tabela do zero (stub→clarificação→confirmação) removida (CLEAN-07) | ✓ VERIFIED | `case "unified_table"` absent from route.ts; ClarificationCard/ConfirmationCard/TableIntentStub/session-context-selector files absent; `table_clar_question`/`table_stub` removed from dispatcher & schema |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `apps/web/src/app/api/tools/` | removed | ✓ VERIFIED | Directory does not exist — entire standalone tool route surface gone |
| `apps/web/src/server/ai/intent-classifier.ts` | binary classify | ✓ VERIFIED | Returns `sheet_operation`/`qa`/`unknown` only (lines 46-90); `classifyFileIntent` gone |
| `packages/shared/src/unified-chat/schema.ts` | UNIFIED_INTENTS reduced to 3 | ✓ VERIFIED | Lines 3-6: `[sheet_operation, qa, unknown]` |
| `apps/web/src/app/api/chat/unified/route.ts` | reduced — binary branches | ✓ VERIFIED | No removed `case`s; `classifyIntent` (line 15) routes to `sheet_operation`/`qa` branches (lines 197, 256, 261, 269) |
| `apps/web/src/features/unified-chat/components/render-dispatcher.tsx` | table_spec + qa_response + default | ✓ VERIFIED | Only `case "qa_response"`, `case "table_spec"` (→ TableGridPanel when hasRows), `default: null` |
| `apps/web/src/features/unified-chat/components/intent-pill.tsx` | reduced to sheet_operation/qa | ✓ VERIFIED | INTENT_LABELS/ICONS/OVERRIDE_OPTIONS = sheet_operation ("Operação") / qa ("Pergunta") |
| `apps/web/src/server/extraction/image-extractor.ts` | PRESERVED | ✓ VERIFIED | Exists, imported by dispatcher.ts |
| `apps/web/src/server/file-analysis/file-parser.ts` | PRESERVED | ✓ VERIFIED | Exists, imported by csv-xlsx-extractor.ts |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `extraction/dispatcher.ts` | `extraction/image-extractor.ts` | `import extractImage` | ✓ WIRED | dispatcher.ts:4 imports; :84/:87 call `extractImage` for png/jpeg |
| `extraction/csv-xlsx-extractor.ts` | `file-analysis/file-parser.ts` | `import parseFile` | ✓ WIRED | csv-xlsx-extractor.ts:7 imports; :85/:106 call `parseFile` for csv/xlsx |
| `api/chat/unified/route.ts` | `extraction/dispatcher.ts` | `extractContent()` | ✓ WIRED | route.ts:21 imports `extractContent` — confirms in-grid/ingestion path reachable from unified chat |
| `api/chat/unified/route.ts` | `intent-classifier.ts` | `classifyIntent()` | ✓ WIRED | route.ts:15 imports; binary routing at :197/:269 |
| `render-dispatcher.tsx` | `table-grid-panel.tsx` | `case "table_spec" → <TableGridPanel>` | ✓ WIRED | render-dispatcher.tsx:10 imports, :89 renders `<TableGridPanel spec={...} />` when hasRows |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `render-dispatcher.tsx` | `payload` (table_spec/qa_response) | route.ts stream payloads (`qaResponsePayloadSchema.parse`, table spec generation) | ✓ — payloads produced by live binary branches | ✓ FLOWING |
| `extraction/dispatcher.ts` | image/csv/xlsx buffers | `/api/chat/unified` attachments → `extractContent` → extractImage/parseFile | ✓ — preserved ingestion path reachable | ✓ FLOWING (not orphaned) |

**Note on PRESERVED-not-orphaned:** `server/extraction/{image-extractor,csv-xlsx-extractor}.ts` and `server/file-analysis/file-parser.ts` are NOT orphans. They form the generic attachment-ingestion path reachable via `/api/chat/unified` (route.ts:21 `extractContent`). This is the in-grid/DATA-03 path, distinct from the removed standalone OCR/File-Analysis tools (which had their own `/workspace/*` pages and `/api/tools/*` routes, all deleted).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence (file:line) |
| ----------- | ----------- | ----------- | ------ | -------------------- |
| CLEAN-01 | 18-01, 18-04, 18-08 | Cadeia dos geradores de texto avulsos removida — sem UI nem rota; avaliação de fórmula na planilha permanece | ✓ SATISFIED | `apps/web/src/app/api/tools/` absent; `features/{sql,regex,scripts,template,formula}` absent; `server/ai/{formula,sql,regex,scripts,template}-stream.ts` absent; `server/tools/formula-repository.ts` absent; `packages/shared/src/index.ts` no longer exports formula/sql/regex/scripts/template |
| CLEAN-02 | 18-02 | Cadeia do OCR removida — página, rota, Vision, fixtures, assets | ✓ SATISFIED | `app/api/tools/ocr`, `app/workspace/ocr`, `features/ocr`, `server/ai/ocr-processor.ts`, `packages/shared/src/ocr` all absent. `image-extractor.ts` preserved & wired (dispatcher.ts:4,84,87) |
| CLEAN-03 | 18-03 | Análise de Arquivos como tool separado removida; sobra ingestão CSV/XLSX | ✓ SATISFIED | `app/api/tools/file-analysis`, `app/workspace/file-analysis`, `features/file-analysis`, `server/ai/file-chat-stream.ts`, `server/file-analysis/{file-repository,cleanup-job}.ts` absent. `file-parser.ts` preserved & wired (csv-xlsx-extractor.ts:7,85,106) |
| CLEAN-06 | 18-05, 18-06, 18-07 | Classificador de intent e render-dispatcher reduzidos a planilha + Q&A | ✓ SATISFIED | `schema.ts:3-6` UNIFIED_INTENTS=[sheet_operation,qa,unknown]; `intent-classifier.ts:46-90` binary; `render-dispatcher.tsx:83-94` qa_response+table_spec+default; `intent-pill.tsx:14-27` 2 intents; `context-messages.ts:83,89` serializeAssistant binary; `unified-chat-tool.tsx:52-59` intentFromPayload binary |
| CLEAN-07 | 18-04, 18-06, 18-07 | Geração de tabela do zero (stub→clarificação→confirmação de spec) removida | ✓ SATISFIED | `case "unified_table"` absent from route.ts; `table-clarifier.ts` absent; ClarificationCard/ConfirmationCard/TableIntentStub/session-context-selector files absent; `table_clar_question`/`table_stub` removed from dispatcher & schema |

**Orphaned requirements:** None. REQUIREMENTS.md maps CLEAN-01/02/03/06/07 to Phase 18; all five are claimed across plans 18-01..18-08 and verified above. (REQUIREMENTS.md still shows CLEAN-06 checkbox unchecked at line 54 and "Pending" at line 124 — this is a stale tracking-doc artifact; the implementation is complete and verified in the live codebase.)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `apps/web/src/app/api/conversations/[tool]/route.ts` | 7-15 | `VALID_TOOL_KINDS` still lists legacy kinds (`formula`, `sql`, `regex`, `script`, `template`, `unified_table`) | ⚠️ WARNING (non-critical) | Dead but auth-gated; no UI consumer produces these kinds. Touches CLEAN-06 cleanliness only — does not re-expose any removed capability. Tech debt for a future cleanup pass. |
| `apps/web/src/server/extraction/pdf-extractor.ts` | 37 | Stale copy "Use o tool de OCR para extrair a tabela da imagem." | ℹ️ INFO (cosmetic) | User-facing string references a tool that no longer exists. Cosmetic only — no functional impact. |
| `apps/web/src/features/unified-chat/lib/sample-spec.ts` | 7 | Comment mentions deleted `server/ai/table-clarifier.ts` | ℹ️ INFO (cosmetic) | Stale doc comment; the referenced file is gone. No functional impact. |
| `apps/web/src/server/ai/context-messages.ts` | 151, 276 | Comments reference deleted `file-chat-stream.ts` | ℹ️ INFO (cosmetic) | Stale doc comments only; code is binary (`table_spec`/`qa_response`). No functional impact. |

No 🛑 BLOCKER anti-patterns. No `TBD`/`FIXME`/`XXX` debt markers found in phase-touched files. The two known warnings flagged by the milestone integration check are recorded above as non-critical (WARNING/INFO) and do not fail the phase.

### Human Verification Required

None. This is a deletion/reduction phase verifiable entirely by static analysis (absence of artifacts + presence of preserved wiring). Per the task brief, all 4 QA gates were already GREEN in the milestone integration check; behavioral validation of the binary classifier eval (~20 prompts UAT) is explicitly deferred to Phase 20 by plan 18-05.

### Gaps Summary

No gaps. All five CLEAN requirements (CLEAN-01/02/03/06/07) are confirmed by independent targeted greps and reads against the live codebase:

- Every removed capability has zero entry points: the entire `apps/web/src/app/api/tools/` tree is gone, the `/workspace/{sql,regex,scripts,templates,ocr,file-analysis}` pages and `features/{sql,regex,scripts,template,formula,ocr,file-analysis}` dirs are gone, the per-tool `*-stream.ts`, `ocr-processor.ts`, `table-clarifier.ts`, and the standalone stub components are gone.
- The generic ingestion path is correctly PRESERVED and still wired: `image-extractor`/`csv-xlsx-extractor`/`file-parser` are reachable from `/api/chat/unified` via `extractContent` (route.ts:21) — these are the in-grid/DATA-03 path, not orphans of the removed standalone tools.
- The binary axis is in place end-to-end: `UNIFIED_INTENTS=[sheet_operation,qa,unknown]`, intent-classifier returns only those three, route.ts routes via `classifyIntent` to binary branches, render-dispatcher/intent-pill/context-messages/unified-chat-tool all reduced to `table_spec`/`qa_response`.

Two known warnings (legacy `VALID_TOOL_KINDS` list; stale OCR copy string) plus two cosmetic stale comments are recorded as non-critical tech debt and do not block goal achievement.

---

_Verified: 2026-06-15T00:30:00Z_
_Verifier: Claude (gsd-verifier)_
