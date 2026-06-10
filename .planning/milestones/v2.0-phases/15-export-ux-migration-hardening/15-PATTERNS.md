# Phase 15: Export, UX Migration & Hardening - Pattern Map

**Mapped:** 2026-06-09
**Files analyzed:** 5 (1 new util, 1 new test, 2 modified components, 1 fixture-coverage test)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/web/src/features/unified-chat/lib/table-export.ts` (NEW) | utility (pure) | transform / file-I/O | `apps/web/src/features/unified-chat/hooks/use-formula-engine.ts` | exact (mesmo padrão de "funções puras module-scope + tipos exportados" no mesmo feature) |
| `apps/web/tests/table-export.test.ts` (NEW) | test (unit) | transform | `apps/web/tests/formula-engine.test.ts` | exact (unit test puro de funções do mesmo feature) |
| `apps/web/src/features/unified-chat/components/table-grid-panel.tsx` (MODIFY ~l.446) | component | event-driven (download) | (auto-analog — o próprio toolbar `ghost-button` no arquivo) | exact (botões irmãos já no mesmo `table-grid-toolbar`) |
| `apps/web/src/features/unified-chat/unified-chat-tool.tsx` (MODIFY ~l.455) | component | request-response | (edição cirúrgica — remover prop) | n/a (remoção de 1 linha) |
| `apps/web/tests/table-clarifier.test.ts` (EXTEND/VERIFY) | test (server unit) | CRUD/request-response | (o próprio arquivo — já cobre fixture mode) | exact (test já existe) |

> Nota de download-trigger: **não existe** analog de download via `Blob`/`createObjectURL`/`<a download>` no codebase. Os usos de `.click()` encontrados (`file-upload-panel.tsx`, `attachment-button.tsx`) são `input.click()` de **upload**, não download. O trigger de download é greenfield — usar o snippet de RESEARCH.md (Code Examples) como fonte canônica. Ver seção "No Analog Found".

## Pattern Assignments

### `apps/web/src/features/unified-chat/lib/table-export.ts` (utility, transform/file-I/O) — NEW

**Analog:** `apps/web/src/features/unified-chat/hooks/use-formula-engine.ts`

Este é o analog estrutural mais forte: módulo do **mesmo feature** (`unified-chat`), cheio de **funções puras module-scope testáveis sem React**, com tipos exportados no topo e seções demarcadas por comentário. Copiar essa anatomia exatamente. O `lib/` ainda não existe — criar `apps/web/src/features/unified-chat/lib/`.

**Imports + tipos exportados pattern** (use-formula-engine.ts lines 5-13):
```typescript
import * as formulajs from "@formulajs/formulajs";
import { translateFunctionName } from "@tabelin/shared";
import type { TableColumn } from "@tabelin/shared";

// ─── Tipos exportados ──────────────────────────────────────────────────────────

export type CellRef = { row: number; col: number };
export type RowData = Record<string, string | number>;
```
> Para `table-export.ts`: importar `import * as XLSX from "xlsx";` e reusar `import type { TableColumn } from "@tabelin/shared";` + `import type { RowData } from "../hooks/use-formula-engine";` (já é o tipo de `displayRows`). NÃO colocar `"use client"` no topo — o módulo deve ser puro/testável; só `buildXlsx`/`buildCsv`/`sanitizeCellForExport` são puros. O trigger de download (DOM) fica como função separada (ver Pitfall 4 do RESEARCH).

**Funções puras module-scope pattern** (use-formula-engine.ts lines 15-30, 69-80):
```typescript
// ─── Funções puras (module-scope, testáveis sem React) ─────────────────────────

/**
 * Doc em pt-BR explicando contrato + edge cases.
 */
export function parseA1(ref: string): CellRef | null {
  const m = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!m) return null;
  // ...
}
```
> Replicar para: `sanitizeCellForExport(value): string`, `buildCsv(columns, rows): string`, `buildXlsx(columns, rows): XLSX.WorkBook`. Manter o estilo: JSDoc pt-BR, `export function`, sem classes. Lógica concreta (regex de sanitização, BOM, cell-objects `{t:"s"}`) vem de RESEARCH.md Patterns 1-3 — **copiar daquelas seções**, não reinventar.

**Acesso a valor de célula por key** (table-grid-panel.tsx line 104, use-formula-engine.ts line 224):
```typescript
const key = col.key ?? col.name.toLowerCase().replace(/\s+/g, "_");
// valor da célula = row[key] ?? ""
```
> Em `buildCsv`/`buildXlsx`, derivar o valor de cada célula com `row[col.key ?? col.name] ?? ""` (`displayRows` já vem com as fórmulas calculadas). Este é o accessor canônico usado em todo o feature.

**Sanitização (SEC-04) — fonte autoritativa:** RESEARCH.md Pattern 1 (lines 136-141):
```typescript
const DANGEROUS_LEAD = /^[=+\-@\t\r\n]/;   // critério + \n (gap-close OWASP)
export function sanitizeCellForExport(value: string | number): string {
  const s = String(value ?? "");
  return DANGEROUS_LEAD.test(s) ? `'${s}` : s;
}
```

---

### `apps/web/tests/table-export.test.ts` (test, unit) — NEW

**Analog:** `apps/web/tests/formula-engine.test.ts`

Mesma família de teste: unit puro de funções de export do mesmo feature, vitest. **Diferença importante de convenção:** o feature já existe nesta fase, então NÃO precisa do padrão "import dinâmico com try/catch para skip-graceful" que `formula-engine.test.ts` usa (aquele era TDD-first para módulos ainda inexistentes). Importar direto.

**Estrutura básica vitest** (formula-engine.test.ts line 1, 34-41):
```typescript
import { describe, expect, it } from "vitest";

describe("PT_BR_TO_EN map", () => {
  it("PROCV mapeia para VLOOKUP", () => {
    expect(PT_BR_TO_EN["PROCV"]).toBe("VLOOKUP");
  });
});
```
> Para table-export: `import { sanitizeCellForExport, buildCsv, buildXlsx } from "../src/features/unified-chat/lib/table-export";` direto. Test names em pt-BR. Cobrir o Test Map de RESEARCH.md lines 339-344: sanitização de cada char perigoso (`= + - @ \t \r`), célula normal inalterada, CSV com `;` + BOM + RFC4180 quoting, XLSX cell-objects `{t:"s"}`, e que exporta `displayRows` calculado (não template `{row}`).

**Pitfall 4 (RESEARCH l.238-242):** testar `buildXlsx` (puro, retorna `WorkBook`) — NÃO testar `XLSX.writeFile`/download (efeito DOM). Asserts sobre as células do WorkBook: `ws["A1"].t === "s"`.

---

### `apps/web/src/features/unified-chat/components/table-grid-panel.tsx` (component, event-driven) — MODIFY ~line 446

**Analog (auto):** os botões irmãos `+ Linha` / `+ Coluna` no mesmo toolbar deste arquivo.

**Slot exato a preencher** (table-grid-panel.tsx lines 445-447):
```typescript
        {/* Slot reservado para export Phase 15 */}
        <div className="table-grid-toolbar-spacer" />
```

**Padrão de botão a copiar** (table-grid-panel.tsx lines 436-444):
```typescript
        <button
          className="ghost-button"
          type="button"
          aria-label="Adicionar coluna"
          disabled={colsAtLimit}
          onClick={addColumn}
        >
          + Coluna
        </button>
```
> Adicionar dois `<button className="ghost-button" type="button" aria-label="Exportar CSV"...>` / `"Exportar XLSX"` no slot. `onClick` chama handlers que passam `displayRows` + `historyState.present.columns` para `buildCsv`/`buildXlsx` + trigger de download. Manter `className="ghost-button"` e `type="button"` (convenção do toolbar). Slug do arquivo: derivar de `spec.title`.

**Dados a exportar** (table-grid-panel.tsx lines 120-125) — usar `displayRows` (fórmulas calculadas), nunca `historyState.present.rows` (templates):
```typescript
const { displayRows } = useFormulaEngine(
  historyState.present.rows,
  historyState.present.columns,
  spec.separator ?? ";"
);
```
> Colunas para o cabeçalho: `historyState.present.columns`. Separador CSV: usar `;` por decisão (CONTEXT) — independente de `spec.separator`.

**Import a adicionar** (seguir o estilo de import já presente na line 12):
```typescript
import { buildCsv, buildXlsx, downloadCsv, downloadXlsx } from "../lib/table-export";
```

**Test extension:** estender `apps/web/tests/table-grid-panel.test.tsx` (já existe, usa `@testing-library/react` + `fireEvent`, lines 1-37 mostram a convenção e o `SPEC_FIXTURE`). Adicionar teste que o botão "Exportar" aparece no toolbar e dispara o handler (mockar `downloadCsv`/`XLSX.writeFile` para não tocar DOM/fs).

---

### `apps/web/src/features/unified-chat/unified-chat-tool.tsx` (component) — MODIFY ~line 455

**Edição cirúrgica.** Remover a prop `bottomNav={<ToolNav />}` da renderização raiz.

**Linha a remover** (unified-chat-tool.tsx line 455):
```typescript
          bottomNav={<ToolNav />}
```
> Remover apenas esta linha (a prop é opcional em `chat-input.tsx` line 18: `bottomNav?: React.ReactNode`, e o consumo é guardado por `{bottomNav ? ... : null}` na line 81 — remover a prop simplesmente não renderiza o ToolNav). Avaliar também remover o import órfão na line 20 (`import { ToolNav } from "@/components/app/tool-nav";`) se não houver outro uso no arquivo. Tools permanecem acessíveis pelas rotas por-tool já existentes (`/workspace/sql` etc.) + sidebar — ver Pitfall 5 do RESEARCH (confirmar sidebar antes de remover).

---

### `apps/web/tests/table-clarifier.test.ts` (test, server unit) — VERIFY / EXTEND

**Já existe e já cobre o fixture mode.** A fase só precisa **garantir cobertura** do branch `buildTableSpec` sem `OPENAI_API_KEY` (table-clarifier.ts lines 254-281).

**Convenção de fixture-mode test** (table-clarifier.test.ts lines 12-25):
```typescript
const REAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe("... — fixture mode", () => {
  beforeEach(() => { delete process.env.OPENAI_API_KEY; });
  afterAll(() => {
    if (REAL_OPENAI_API_KEY) process.env.OPENAI_API_KEY = REAL_OPENAI_API_KEY;
    else delete process.env.OPENAI_API_KEY;
  });
  // ...
});
```
> Adicionar (se ausente) um `describe("buildTableSpec — fixture mode")` que afirma: retorna spec determinística, passa `tableSpecPayloadSchema.safeParse` (import de `@tabelin/shared`, já usado na line 10), e que tem as colunas/rows esperadas (title "Controle de Gastos", coluna formula `=SOMA(C{row};-D{row})`). Reusar o mesmo `beforeEach/afterAll` para isolar o env var. Ver [[fixture-mode-sem-openai-key]].

## Shared Patterns

### Convenção de feature module (puro + testável)
**Source:** `apps/web/src/features/unified-chat/hooks/use-formula-engine.ts` (lines 1-30)
**Apply to:** `table-export.ts`
- Funções puras `export function` em module-scope; tipos `export type` no topo; seções demarcadas por `// ─── … ─────`; JSDoc em pt-BR. Sem classes. Lógica DOM (download) separada das funções puras para testabilidade (Pitfall 4 RESEARCH).

### Convenção de teste vitest
**Source:** `apps/web/tests/formula-engine.test.ts` (line 1), `apps/web/tests/table-grid-panel.test.tsx` (lines 1-3), `apps/web/tests/table-clarifier.test.ts` (lines 12-25)
**Apply to:** `table-export.test.ts`, extensão de `table-grid-panel.test.tsx`, `table-clarifier.test.ts`
- `import { describe, expect, it } from "vitest";` (+ `vi` para mocks, `@testing-library/react` + `fireEvent` para component tests). Test names em pt-BR. Para env-var-dependent tests: `delete process.env.X` em `beforeEach` + restore em `afterAll`. Testes ficam em `apps/web/tests/` (flat). Comando: `pnpm --filter web test -- table-export`.
- O padrão "import dinâmico try/catch skip-graceful" de `formula-engine.test.ts` / `table-grid-panel.test.tsx` era TDD-first para módulos inexistentes — para módulos que **já existem nesta fase**, importar direto.

### Botão de toolbar
**Source:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx` (lines 426-444)
**Apply to:** botões Exportar CSV / XLSX
- `className="ghost-button"`, `type="button"`, `aria-label` em pt-BR, `onClick` handler. Inseridos no `<div className="table-grid-toolbar">`, no slot reservado (line 446).

### Sanitização SEC-04 (output encoding)
**Source:** RESEARCH.md Pattern 1/2/3 (lines 129-184) — fonte autoritativa, sem analog no codebase (greenfield)
**Apply to:** TODA célula em `buildCsv` e `buildXlsx`
- `sanitizeCellForExport` prefixa `'` em células iniciadas por `= + - @ \t \r \n`. CSV: BOM `U+FEFF` (\uFEFF) + quoting RFC 4180 + separador `;`. XLSX: todas as células como cell-objects `{t:"s", v}` via `aoa_to_sheet`.

## No Analog Found

| File/Concern | Role | Data Flow | Reason |
|--------------|------|-----------|--------|
| download trigger (`downloadCsv` via `Blob`+`<a download>`; `XLSX.writeFile` para XLSX) | utility (DOM effect) | file-I/O | Nenhum download client-side existe no codebase. Os `.click()` existentes (`file-upload-panel.tsx:64,142`, `attachment-button.tsx:71`) são `input.click()` de **upload**, não download. → Usar RESEARCH.md Code Examples (lines 253-263) + `XLSX.writeFile` (RESEARCH line 182) como fonte. |
| sanitização de injeção de fórmula (CSV/XLSX) | utility | transform | Greenfield (RESEARCH line 11: "Não existe nenhuma utilidade de export ou de escape"). `csv-xlsx-extractor.ts` usa só `XLSX.read` (parse), não write/sanitize. → Fonte: RESEARCH.md Patterns 1-3 + OWASP. |

## Metadata

**Analog search scope:** `apps/web/src/features/unified-chat/` (lib, hooks, components), `apps/web/tests/`, `apps/web/src/features/file-analysis/components/`, `apps/web/src/components/app/`, `apps/web/src/server/ai/`
**Files scanned:** ~12 (use-formula-engine.ts, table-grid-panel.tsx, unified-chat-tool.tsx, table-clarifier.ts, chat-input.tsx, file-upload-panel.tsx, attachment-button.tsx + tests: formula-engine, table-grid-panel, table-clarifier)
**xlsx usage confirmed:** `xlsx@0.18.5` already imported in `file-parser.ts`, `csv-xlsx-extractor.ts`, `zip-guard.ts` (all `read` path) — write path (`aoa_to_sheet`/`writeFile`) is new this phase
**Pattern extraction date:** 2026-06-09
