---
phase: 15-export-ux-migration-hardening
verified: 2026-06-10T01:30:00Z
status: human_needed
score: 12/12 must-haves verified
overrides_applied: 0
human_verification:
  - test: "CR-01 (15-REVIEW.md): decidir se o gap de sanitização CSV em células que começam com aspas (`\"=cmd\"...`) ou whitespace antes de um caractere perigoso constitui um gap de SEC-04 a ser fechado nesta fase ou aceito/postergado"
    expected: "Decisão registrada: (a) plano de fechamento adicional para 15-04, ou (b) override formal aceitando o risco residual com justificativa"
    why_human: "Decisão de risco de segurança/escopo — não é um fato programático; depende de apetite a risco do produto"
  - test: "Smoke manual: editar célula com '=1+1' (e variantes '+', '-', '@', TAB, CR/LF), exportar CSV e XLSX, abrir no Excel/Google Sheets, confirmar que a célula aparece como texto literal e não dispara fórmula/macro"
    expected: "Célula exibida como \"'=1+1\" / \"=1+1\" como texto, sem execução de fórmula"
    why_human: "downloadCsv/downloadXlsx (efeitos DOM) não são testados em automação (Pitfall 4); requer abrir arquivo real em Excel/Sheets"
  - test: "Navegação pós-migração (Task 3 do 15-03-PLAN, checkpoint:human-verify auto-aprovado sob AUTO_MODE): confirmar visualmente que /workspace mostra chat unificado sem ToolNav, Sidebar visível e funcional, deep links /workspace/sql etc. funcionando"
    expected: "Chat unificado é o entry point default; Sidebar com Formula/Scripts/SQL/Regex/Templates/File Analysis/OCR visível; clique em SQL navega para /workspace/sql"
    why_human: "Verificação visual de UI/navegação — checkpoint foi auto-aprovado sob AUTO_MODE sem confirmação humana real"
---

# Phase 15: Export, UX Migration & Hardening — Verification Report

**Phase Goal:** Usuários podem exportar a tabela para CSV e XLSX com sanitização de injeção de fórmula, a navegação migra para o chat unificado como ponto de entrada default e o table generator tem fixture fallback para dev/test
**Verified:** 2026-06-10T01:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Célula iniciada por `= + - @ TAB CR LF` recebe prefixo `'` no export | ✓ VERIFIED (literal must_have) — see CR-01 caveat below | `table-export.ts:29-32` `DANGEROUS_LEAD = /^[=+\-@\t\r\n]/`; 18/18 tests in `table-export.test.ts` pass, including all 7 dangerous-lead chars + `\n`. Roadmap SC1 wording ("células que começam com `=`,`+`,`-`,`@`") is satisfied for raw-leading-char cells. |
| 2 | Célula normal (não perigosa) é exportada sem alteração | ✓ VERIFIED | `table-export.test.ts:36-37` `sanitizeCellForExport("Categoria")` === `"Categoria"`; numeric coercion `1500` → `"1500"` (line 40-41); null/undefined → `""` (line 44-46) |
| 3 | `buildCsv` produz BOM UTF-8 + separador `;` + quoting RFC 4180 | ✓ VERIFIED | `table-export.ts:65-71` returns `"﻿" + ...`; tests at lines 51-69 confirm BOM, `;` separator, quoting+doubled-quotes |
| 4 | `buildXlsx` grava todas as células de dados como cell-objects `{t:'s'}` (texto, nunca fórmula) | ✓ VERIFIED | `table-export.ts:82-93` header+body built as `{ t: "s" as const, v: sanitizeCellForExport(...) }` via `aoa_to_sheet`; tests 87-106 assert `ws["A1"].t === "s"` and all data cells `t === "s"` |
| 5 | Export usa `displayRows` (valores calculados), nunca templates `{row}` | ✓ VERIFIED | `table-grid-panel.tsx:430,436` pass `displayRows` (derived from `useFormulaEngine`, line 140-145) to `buildCsv`/`buildXlsx`, never `historyState.present.rows` (raw templates). `table-export.test.ts:72-78` confirms calculated values exported, not `{row}` template |
| 6 | Botão "Exportar CSV" aparece no toolbar do TableGridPanel | ✓ VERIFIED | `table-grid-panel.tsx:480-486` `aria-label="Exportar CSV"`; `table-grid-panel.test.tsx` new EXP-01/02 describe block — 3 tests pass |
| 7 | Botão "Exportar XLSX" aparece no toolbar do TableGridPanel | ✓ VERIFIED | `table-grid-panel.tsx:487-494` `aria-label="Exportar XLSX"` |
| 8 | Clicar Exportar CSV chama `buildCsv`/`downloadCsv` com displayRows + columns atuais | ✓ VERIFIED | `handleExportCsv` (lines 428-432): `buildCsv(historyState.present.columns, displayRows)` → `downloadCsv(csv, slug+".csv")`; component test mocks confirm 1x call on click |
| 9 | Clicar Exportar XLSX chama `buildXlsx`/`downloadXlsx` com displayRows + columns atuais | ✓ VERIFIED | `handleExportXlsx` (lines 434-438), analogous wiring confirmed |
| 10 | A rota raiz `/workspace` NÃO renderiza o ToolNav (bottomNav removido do mount raiz) | ✓ VERIFIED | `grep -c "ToolNav" apps/web/src/features/unified-chat/unified-chat-tool.tsx` → `0` (import + `bottomNav={<ToolNav />}` prop both removed) |
| 11 | Os tools continuam alcançáveis: a Sidebar com links `/workspace/sql`, `/workspace/regex` etc. está montada no workspace layout | ✓ VERIFIED | `apps/web/src/app/(workspace)/workspace/layout.tsx:3,28` — `import { Sidebar } from "@/components/app/sidebar"` + `<Sidebar />` rendered inside `.workspace-body`, applies to all `/workspace/*` routes incl. root |
| 12 | `buildTableSpec` retorna spec determinística e válida quando `OPENAI_API_KEY` está ausente | ✓ VERIFIED | `table-clarifier.test.ts:93-160` — `describe("buildTableSpec — fixture mode")` deletes `OPENAI_API_KEY` in `beforeEach`, restores in `afterAll`; asserts `tableSpecPayloadSchema.safeParse(result).success === true`, `title === "Controle de Gastos"`, formula column contains `"=SOMA"`. 14/14 tests pass |

**Score:** 12/12 truths verified (1 carries a flagged security-completeness caveat — see Gaps/Human Verification)

### CR-01 Assessment (SEC-04 edge case)

`15-REVIEW.md` flags `CR-01`: `DANGEROUS_LEAD = /^[=+\-@\t\r\n]/` tests only the **raw leading character** of a cell value. Reproduced concretely:

```
input:  "\"=cmd|' /C calc'!A0"   (raw cell value starting with a literal double-quote)
sanitizeCellForExport(raw) → unchanged (leading char is `"`, not in DANGEROUS_LEAD)
csvField(raw) → "\"\"\"=cmd|' /C calc'!A0\""   (RFC4180 quoting wraps + doubles internal quotes)
```

After RFC4180 unescaping by a CSV reader, the resulting cell content begins with `"=cmd...` — i.e. a literal `"` followed by `=`. Whether this re-activates as a formula depends on the consuming application's CSV parser/locale (most spreadsheet CSV importers treat the unescaped leading `"` as a literal text character, not as a formula trigger, since formula detection in Excel/Sheets requires the cell's *first character* to be `=`/`+`/`-`/`@` with no leading text). The literal must_have wording — "Célula **iniciada por** `= + - @ TAB CR LF`" — and Roadmap SC1 wording — "células que **começam com** `=`, `+`, `-` ou `@`" — both refer to the raw input's leading character, which IS correctly handled (12/12 dangerous-lead tests pass).

**Verdict:** The literal must_have and Roadmap SC1 are **met**. CR-01 identifies a *broader OWASP-completeness* concern (defense-in-depth for quote-prefixed/whitespace-prefixed payloads) that is a legitimate hardening recommendation but does not falsify the stated truth as written. This is escalated as a **human verification / risk-acceptance decision** rather than a BLOCKER, because:
- No must_have or roadmap SC explicitly requires sanitizing non-leading-position triggers introduced by quote-escaping.
- The 18-test suite in `table-export.test.ts` covers exactly the criteria as specified (all 7 DANGEROUS_LEAD chars + `\n` gap-close).
- Treating this as a BLOCKER would require expanding scope beyond the documented must_have — which the verifier should not do unilaterally.

**Recommendation:** Either (a) accept via override + track as a fast-follow hardening item, or (b) open a small closure plan applying the REVIEW's suggested fix (`probe = s.replace(/^[\s"']+/, "")`) + add the 3 suggested test cases (`'"=cmd"'`, `' =1+1'`, `'\t=1+1'`).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/src/features/unified-chat/lib/table-export.ts` | sanitizeCellForExport, buildCsv, buildXlsx, downloadCsv, downloadXlsx (puros + efeito DOM separado), min 50 lines | ✓ VERIFIED | 119 lines; all 5 named exports present; `aoa_to_sheet` used; `t: "s"` present; `DANGEROUS_LEAD` regex present |
| `apps/web/tests/table-export.test.ts` | Cobertura SEC-04/EXP-01/EXP-02, contains "sanitizeCellForExport" | ✓ VERIFIED | 18 tests, all pass; imports `sanitizeCellForExport`, `buildCsv`, `buildXlsx` |
| `apps/web/src/features/unified-chat/components/table-grid-panel.tsx` | 2 export buttons in toolbar slot, handlers pass displayRows; contains "buildCsv" | ✓ VERIFIED | Imports `buildCsv, buildXlsx, downloadCsv, downloadXlsx` (line 13); buttons at 480-494; handlers at 428-438 |
| `apps/web/tests/table-grid-panel.test.tsx` | Teste de presença + clique dos botões de export (download mockado), contains "Exportar" | ✓ VERIFIED | New `describe("TableGridPanel — EXP-01/EXP-02 export CSV/XLSX")` with 3 tests; vi.hoisted mocks for buildCsv/buildXlsx/downloadCsv/downloadXlsx; 18/18 pass |
| `apps/web/src/app/(workspace)/workspace/layout.tsx` | Sidebar montada (acesso pós-remoção ToolNav), contains "Sidebar" | ✓ VERIFIED | `import { Sidebar }` + `<Sidebar />` rendered inside `.workspace-body`, applies to all `/workspace/*` routes |
| `apps/web/src/features/unified-chat/unified-chat-tool.tsx` | ToolNav removido do mount raiz (prop + import órfão) | ✓ VERIFIED | `grep -c "ToolNav"` → 0 |
| `apps/web/tests/table-clarifier.test.ts` | Cobertura do branch fixture buildTableSpec sem OPENAI_API_KEY, contains "buildTableSpec" | ✓ VERIFIED | New `describe("buildTableSpec — fixture mode")`, 5 tests incl. schema/title/formula assertions, 14/14 pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `table-export.ts` | `xlsx` (SheetJS) | `import * as XLSX`, `aoa_to_sheet` with `{t:'s'}` cell-objects | ✓ WIRED | `table-export.ts:1,89` |
| `table-export.ts` | `@tabelin/shared` TableColumn + `RowData` | `import type` | ✓ WIRED | `table-export.ts:3-4` |
| `table-grid-panel.tsx` | `table-export.ts` | `import { buildCsv, buildXlsx, downloadCsv, downloadXlsx }` | ✓ WIRED | `table-grid-panel.tsx:13` |
| handlers de export | `displayRows` (fórmulas calculadas) | passar displayRows, nunca `historyState.present.rows` | ✓ WIRED | `table-grid-panel.tsx:430,436` use `displayRows`; grep confirms no `historyState.present.rows` passed to export builders |
| `(workspace)/workspace/layout.tsx` | `apps/web/src/components/app/sidebar.tsx` | `import Sidebar + render` | ✓ WIRED | layout.tsx:3,28 |
| `table-clarifier.test.ts` | `buildTableSpec` fixture branch | `delete process.env.OPENAI_API_KEY` + `tableSpecPayloadSchema.safeParse` | ✓ WIRED | test lines 94-95 (beforeEach delete), 150-151 (safeParse assertion) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `table-grid-panel.tsx` export handlers | `displayRows` | `useFormulaEngine(historyState.present.rows, historyState.present.columns, ...)` (line 140-145) — calculates formula values from live grid state | Yes — derived live from edited grid state, not static | ✓ FLOWING |
| `table-clarifier.ts` fixture branch | `buildTableSpec` return | `apps/web/src/server/ai/table-clarifier.ts:254` static deterministic fixture object (intentional, by design for dev/test fallback) | Yes (deterministic by design, not a stub of an unimplemented feature) | ✓ FLOWING (intentional fixture) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `table-export.ts` unit suite (SEC-04/EXP-01/EXP-02) | `npx vitest run table-export` | 18/18 passed | ✓ PASS |
| `table-grid-panel.tsx` export buttons + handlers | `npx vitest run table-grid-panel` | 18/18 passed | ✓ PASS |
| `buildTableSpec` fixture mode (UNI-07) | `npx vitest run table-clarifier` | 14/14 passed | ✓ PASS |
| CR-01 reproduction (quote-prefixed dangerous cell) | Node script reproducing `csvField('"=cmd...')` | Confirms raw leading-char `"` → not flagged by `DANGEROUS_LEAD`; after RFC4180 round-trip, unescaped cell starts with `"=` | See CR-01 Assessment above |
| Real download (Blob/`<a download>`/`XLSX.writeFile`) | N/A — DOM-only effect, not run in CI | Not executed (Pitfall 4 — by design) | ? SKIP → human verification |

### Probe Execution

No `scripts/*/tests/probe-*.sh` referenced in PLAN/SUMMARY/REVIEW for this phase. Step 7c: SKIPPED (no declared or conventional probes).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| EXP-01 | 15-01, 15-02 | Usuário pode exportar a tabela para CSV | ✓ SATISFIED | `buildCsv`/`downloadCsv` implemented + wired to "Exportar CSV" button; 18+18 tests pass |
| EXP-02 | 15-01, 15-02 | Usuário pode exportar a tabela para XLSX (lib `xlsx` já instalada) | ✓ SATISFIED | `buildXlsx`/`downloadXlsx` implemented + wired to "Exportar XLSX" button; no new dependency added (xlsx@0.18.5 reused) |
| SEC-04 | 15-01 | Export CSV/XLSX sanitiza injeção de fórmula — prefixo `'` em célula iniciada por `=,+,-,@,\t,\r`; XLSX `t:"s"` | ✓ SATISFIED (literal wording) — see CR-01 caveat | `DANGEROUS_LEAD` regex covers exactly the specified char set + `\n`; `buildXlsx` forces `t:"s"` on all data cells; CR-01 flags an out-of-spec edge case for human risk decision |
| UNI-07 | 15-03 (Phase 12 origin) | Páginas/atalhos por-tool permanecem acessíveis; chat unificado é entry point default | ✓ SATISFIED | Phase 12 already delivered the unified chat entry point (REQUIREMENTS.md shows `[x]` Complete); Phase 15 completes the remaining piece — Sidebar mounted, ToolNav removed from root mount, deep links preserved |

**Note on REQUIREMENTS.md checkbox state:** `.planning/REQUIREMENTS.md` lines 46-51 still show `[ ]` (unchecked) for EXP-01, EXP-02, SEC-04, and the Phase 15 row in the requirements-coverage table (lines 102-104) shows "Pending". This is a documentation-sync issue (REQUIREMENTS.md was not updated post-implementation) — the underlying code/tests are complete. Not a code gap, but should be updated for tracking accuracy.

No orphaned requirements found — all 4 IDs declared across the 3 plans (EXP-01, EXP-02, SEC-04, UNI-07) match the phase's declared requirement set in ROADMAP.md (`EXP-01, EXP-02, SEC-04` for the phase header; UNI-07 carried by 15-03 as completion of Phase 12 work).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER found in any of the 7 phase-modified files | - | - |

CR-01/WR-01 through WR-05/IN-01 through IN-04 from `15-REVIEW.md` are tracked as code-quality findings but none introduce a debt-marker comment or stub pattern in the modified files.

### Human Verification Required

#### 1. CR-01 Risk Decision (SEC-04 completeness)

**Test:** Review `15-REVIEW.md` CR-01 finding and the CR-01 Assessment section above. Decide whether the quote-prefix/whitespace-prefix CSV-injection edge case requires a closure plan before Phase 15 is considered fully closed.
**Expected:** Either an override added to this VERIFICATION.md frontmatter accepting the residual risk, or a small follow-up plan (15-04) implementing the REVIEW's suggested `probe`-based fix + 3 additional test cases.
**Why human:** Security risk-acceptance is a product/business decision, not a programmatically-derivable fact. The literal must_have and roadmap SC1 are met as written.

#### 2. Manual smoke test of real download + Excel/Sheets behavior

**Test:** Run `pnpm --filter web dev`, open `/workspace`, generate/edit a table, enter `=1+1`, `+1`, `-1`, `@SUM(1)`, a cell starting with TAB, and a normal cell, then click "Exportar CSV" and "Exportar XLSX". Open both files in Excel and Google Sheets.
**Expected:** All dangerous cells appear as literal text (prefixed with `'` visible or rendered as text, not executed as a formula/macro); normal cells unchanged; CSV opens correctly with pt-BR accents (BOM works); XLSX opens with all data cells as text type.
**Why human:** `downloadCsv`/`downloadXlsx` are DOM-only effects (Blob/`<a download>`/`XLSX.writeFile`) intentionally not exercised in jsdom (Pitfall 4); requires opening real files in spreadsheet applications.

#### 3. Navigation post-migration (Task 3 of 15-03-PLAN, harvested)

**Test:** Open `/workspace` in a browser. Confirm the unified chat is the entry point with NO ToolNav (tab bar) below the input. Confirm the Sidebar (Formula, Scripts, SQL, Regex, Templates, File Analysis, OCR) is visible. Click "SQL" in the Sidebar → should navigate to `/workspace/sql`. Navigate back to `/workspace` → unified chat again.
**Expected:** Chat unificado at root without ToolNav; Sidebar functional; deep links work.
**Why human:** This `checkpoint:human-verify` task was auto-approved under AUTO_MODE per 15-03-SUMMARY.md ("Task 3 ... foi auto-aprovada sob AUTO_MODE ... Recomenda-se verificação manual pelo usuário antes de considerar a fase 15 totalmente fechada"), i.e. no actual human visually confirmed the UI yet.

### Gaps Summary

No BLOCKER-level gaps found. All 12 must-haves (3 phase plans combined) pass at the artifact/wiring/data-flow levels, all 50 relevant unit/component tests pass (18 table-export + 18 table-grid-panel + 14 table-clarifier), and `grep -c ToolNav` = 0 confirms the navigation migration.

Three items require human attention before the phase is considered fully closed:
1. **CR-01 risk decision** — a code-review-flagged SEC-04 completeness edge case (quote-prefixed payloads escaping the leading-character check). The literal must_have and roadmap SC1 are satisfied; this is a defense-in-depth gap beyond the stated scope, requiring a risk-acceptance call.
2. **Manual download/Excel smoke test** — DOM-only download effects were never executed outside unit mocks.
3. **Navigation visual confirmation** — the human-verify checkpoint for the Sidebar/ToolNav migration was auto-approved under AUTO_MODE without an actual human looking at the UI.

Status set to `human_needed` (not `gaps_found`) because no must_have FAILED — these are escalations for decision/confirmation, consistent with the Escalation Gate pattern.

---

_Verified: 2026-06-10T01:30:00Z_
_Verifier: Claude (gsd-verifier)_
