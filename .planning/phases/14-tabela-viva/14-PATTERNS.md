# Phase 14: Tabela Viva — Pattern Map

**Mapped:** 2026-06-09
**Files analyzed:** 10 (6 new, 4 modified)
**Analogs found:** 10 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/shared/src/unified-chat/schema.ts` (MODIFY) | schema | CRUD | `packages/shared/src/formula/schema.ts` | exact |
| `packages/shared/src/table/formula-locale.ts` (NEW) | utility | transform | `packages/shared/src/formula/platforms.ts` | role-match |
| `apps/web/src/server/ai/table-clarifier.ts` (MODIFY) | service | request-response | self (existing file) | exact |
| `apps/web/src/features/unified-chat/components/table-grid-panel.tsx` (NEW) | component | event-driven | `apps/web/src/features/unified-chat/components/confirmation-card.tsx` | role-match |
| `apps/web/src/features/unified-chat/hooks/use-formula-engine.ts` (NEW) | hook | transform | `apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts` | role-match |
| `apps/web/src/features/unified-chat/components/render-dispatcher.tsx` (MODIFY) | component | request-response | self (existing file) | exact |
| `apps/web/src/features/unified-chat/components/confirmation-card.tsx` (MODIFY) | component | request-response | self (existing file) | exact |
| `apps/web/src/styles/globals.css` (MODIFY) | config | — | self (existing file) | exact |
| `apps/web/tests/formula-engine.test.ts` (NEW) | test | — | `apps/web/tests/table-clarifier.test.ts` | exact |
| `apps/web/tests/table-grid-panel.test.tsx` (NEW) | test | — | `apps/web/tests/unified-schema.test.ts` | exact |

---

## Pattern Assignments

### `packages/shared/src/unified-chat/schema.ts` (MODIFY — extend tableSpecPayloadSchema)

**Analog:** `packages/shared/src/formula/schema.ts` and self

**Existing tableSpecPayloadSchema** (`packages/shared/src/unified-chat/schema.ts` lines 63-69):
```typescript
export const tableSpecPayloadSchema = z.object({
  kind: z.literal("table_spec"),
  title: z.string(),
  columns: z.array(z.object({ name: z.string(), type: z.string() })),
  rowCount: z.number().int().min(1).max(200),
  format: z.string().optional(),
});
```

**How formula/schema.ts adds nested object schemas** (lines 9-12, 33-40):
```typescript
// Pattern: define sub-schema first, then compose in parent
export const formulaRequestBaseSchema = z.object({
  platform: formulaPlatformSchema,
  formulaLanguage: formulaLanguageSchema
});

export const formulaMetadataSchema = z.object({
  mode: formulaModeSchema,
  platform: formulaPlatformSchema,
  formulaLanguage: formulaLanguageSchema,
  separator: z.enum([";", ","]),
  providerModel: z.string().optional(),
  requestId: z.string().optional()
});
```

**Extension pattern to apply** (replace existing `tableSpecPayloadSchema`):
```typescript
// Step 1: extract tableColumnSchema as a named sub-schema
export const tableColumnSchema = z.object({
  name: z.string(),
  type: z.enum(["text", "number", "date", "currency", "formula"]),
  key: z.string().optional(),
  formula: z.string().optional(),
  width: z.number().optional(),
});

// Step 2: extend tableSpecPayloadSchema with optional fields (retrocompatível)
export const tableSpecPayloadSchema = z.object({
  kind: z.literal("table_spec"),
  title: z.string(),
  columns: z.array(tableColumnSchema),
  rowCount: z.number().int().min(1).max(200),
  format: z.string().optional(),
  // CAMPOS NOVOS — opcionais para retrocompatibilidade com Phase 13:
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).optional(),
  formulaLanguage: z.enum(["pt-BR", "en"]).optional(),
  separator: z.enum([";", ","]).optional(),
});
```

**Type export pattern** (lines 133-138 of existing schema.ts):
```typescript
// Existing pattern — add new export alongside:
export type TableSpecPayload = z.infer<typeof tableSpecPayloadSchema>;
export type TableColumn = z.infer<typeof tableColumnSchema>; // NEW
```

**unifiedCompletePayloadSchema update** (lines 88-100): `tableSpecPayloadSchema` is already a member of the union — no structural change needed; the union picks it up automatically from the re-exported schema.

---

### `packages/shared/src/table/formula-locale.ts` (NEW)

**Analog:** `packages/shared/src/formula/platforms.ts`

**platforms.ts structure** (pure data export pattern):
```typescript
// packages/shared/src/formula/platforms.ts — constant arrays + helper fn
export const FORMULA_PLATFORM_IDS = [...] as const;
export const FORMULA_LANGUAGE_IDS = ["pt-BR", "en", ...] as const;
export type FormulaLanguage = typeof FORMULA_LANGUAGE_IDS[number];

export function getSeparatorForLanguage(lang: FormulaLanguage): ";" | "," | null {
  // lookup table
}
```

**Pattern to copy for formula-locale.ts:**
```typescript
// packages/shared/src/table/formula-locale.ts
// Pure data + types — no framework dependencies, safe to import in both browser and Node

export const PT_BR_TO_EN: Record<string, string> = {
  SOMA: "SUM",
  SOMASE: "SUMIF",
  // ... ~20 entries
};

export type FormulaBRFunctionName = keyof typeof PT_BR_TO_EN;

export function translateFunctionName(brName: string): string | null {
  return PT_BR_TO_EN[brName.toUpperCase()] ?? null;
}
```

**index.ts barrel export pattern** (`packages/shared/src/index.ts` lines 1-22):
```typescript
// Add after existing entries:
// Phase 14: tabela viva
export * from "./table/formula-locale";
// Note: tableSpecPayloadSchema stays in ./unified-chat/schema.ts — no new barrel entry for it
```

---

### `apps/web/src/server/ai/table-clarifier.ts` (MODIFY — extend buildTableSpec)

**Analog:** Self — existing file at `apps/web/src/server/ai/table-clarifier.ts`

**Fixture mode pattern** (lines 229-240):
```typescript
// Fixture mode — retorna spec determinística sem chamar a API
if (!process.env.OPENAI_API_KEY) {
  return {
    kind: "table_spec",
    title: "Tabela de " + prompt.slice(0, 30),
    columns: [
      { name: "Coluna A", type: "text" },
      { name: "Coluna B", type: "number" },
    ],
    rowCount: 10,
    format: "default",
  };
}
```
**Modification:** Replace the fixture return with the extended version from RESEARCH.md Pattern 8 (including `rows`, `formulaLanguage: "pt-BR"`, `separator: ";"`, and a formula column).

**buildSpecSystemPrompt pattern** (lines 119-130) — the function to replace:
```typescript
function buildSpecSystemPrompt(originalPrompt: string): string {
  return `Você é um assistente especialista em planilhas brasileiro.
O usuário pediu para criar uma tabela. Gere uma especificação completa com:
- title: título descritivo em português
- columns: array de colunas com name e type (text, number, date, currency, boolean)
- rowCount: número de linhas (mínimo 1, máximo 200; padrão 10 se não especificado)
- format: formato opcional (opcional)

Pedido original: "${originalPrompt}"

Retorne defaults razoáveis...`;
}
```
**Modification:** Expand system prompt as shown in RESEARCH.md Pattern 8 to instruct LLM to generate `rows`, `key`, `formula` templates (using `{row}` placeholder), `formulaLanguage`, and `separator`.

**Structured Outputs + fallback pattern** (lines 249-284 — use exactly the same try/catch structure):
```typescript
try {
  const completion = await client.chat.completions.parse({
    model: getOpenAIModel(),
    messages: [...],
    response_format: zodResponseFormat(tableSpecPayloadSchema, "table_spec"),
  });
  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) throw new Error("Spec builder returned no parsed output");
  return parsed;
} catch (err) {
  if (!shouldFallbackFromStructuredOutputs(err)) throw err;
  // fallback json_object path...
  return tableSpecPayloadSchema.parse(raw);
}
```

---

### `apps/web/src/features/unified-chat/components/table-grid-panel.tsx` (NEW)

**Analog:** `apps/web/src/features/unified-chat/components/confirmation-card.tsx`

**"use client" + import pattern** (confirmation-card.tsx lines 1-6):
```typescript
"use client";

import { useState } from "react";

import type { TableSpecPayload } from "@tabelin/shared";
```
**For table-grid-panel.tsx:** Same `"use client"` directive. Import `useCallback`, `useMemo`, `useReducer`, `useEffect`, `useState` from react. Import `DynamicDataSheetGrid` from `"react-datasheet-grid"`. Import CSS `"react-datasheet-grid/dist/style.css"`. Import types from `@tabelin/shared`.

**assistant-card + output-header structure** (confirmation-card.tsx lines 39-44):
```typescript
return (
  <div className="assistant-card" aria-label="Confirmar especificação da tabela">
    <div className="output-header">
      <h2>Confirme os detalhes da tabela</h2>
    </div>
    <div className="output-box" data-status="complete">
```
**For table-grid-panel.tsx:** Same `.assistant-card` wrapper + `.output-header` with `<h2>{spec.title}</h2>`. Replace `.output-box` with `.table-grid-toolbar` + `.table-grid-panel` wrapper (see UI-SPEC).

**ghost-button pattern** (confirmation-card.tsx line 86):
```typescript
<button className="ghost-button" type="button" onClick={handleConfirm}>
  Confirmar e Gerar
</button>
```
**For table-grid-panel.tsx toolbar buttons:** Use same `ghost-button` class for "+ Linha" and "+ Coluna" buttons, with `disabled` prop and `title` attribute at limits.

**Component prop signature pattern:**
```typescript
// Pattern from confirmation-card.tsx lines 7-13 — named export, destructured props
export function TableGridPanel({
  spec,
}: {
  spec: TableSpecPayload;  // extended TableSpecPayload with rows/formulaLanguage/separator
}) {
  // useReducer for history state (RESEARCH.md Pattern 4)
  // useMemo for columns definition
  // useEffect([rows]) for formula recalc
  // sortState via useState
```

**aria-label pattern** (render-dispatcher.tsx line 44):
```typescript
<div className="assistant-card" aria-label={title}>
```
**For table-grid-panel:** `aria-label={\`Tabela: ${spec.title}\`}` as specified in UI-SPEC.

---

### `apps/web/src/features/unified-chat/hooks/use-formula-engine.ts` (NEW)

**Analog:** `apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts`

**Hook file structure** (use-unified-chat-stream.ts lines 1-15):
```typescript
"use client";

import { ... } from "@tabelin/shared";
import { useCallback, useState } from "react";

export type UnifiedChatStreamStatus = ...;
export type UnifiedAttachmentMeta = { ... };

export function useUnifiedChatStream() {
  const [status, setStatus] = useState<...>("idle");
  // ...
  return { status, ..., submit, reset };
}
```
**Pattern to apply for use-formula-engine.ts:**
- Same `"use client"` directive.
- Import `PT_BR_TO_EN` from `@tabelin/shared` (or direct path to formula-locale).
- Export named types (`CellRef`, `CellRange`, `FormulaEngineResult`).
- Export named function `useFormulaEngine(rows, columns)` returning `{ displayRows, errors }`.
- Internal helpers (`parseA1`, `parseRange`, `extractRange`, `parseFormulaArgs`, `parseBRNumber`) defined as module-scope functions (not inside the hook), matching the style of `createId()` in unified-chat-tool.tsx.

**useCallback/useMemo wrapping pattern** (unified-chat-stream.ts lines 53-68):
```typescript
const reset = useCallback(() => {
  setStatus("idle");
  // ...
}, []);

const submit = useCallback(async (input: SubmitUnifiedChatInput) => {
  // ...
}, []);
```
**For use-formula-engine:** `useMemo` for the `recalcAll` computation:
```typescript
const displayRows = useMemo(() => recalcAll(rows, columns), [rows, columns]);
```

---

### `apps/web/src/features/unified-chat/components/render-dispatcher.tsx` (MODIFY)

**Analog:** Self — existing file at lines 242-249

**Existing `table_spec` case** (lines 242-249):
```typescript
case "table_spec":
  return (
    <ConfirmationCard
      payload={payload as TableSpecPayload}
      onConfirm={onConfirm ?? (() => {})}
    />
  );
```

**Modification — add rows detection:**
```typescript
case "table_spec": {
  const hasRows = Array.isArray((payload as TableSpecPayload).rows) &&
    ((payload as TableSpecPayload).rows?.length ?? 0) > 0;
  if (hasRows) {
    return <TableGridPanel spec={payload as TableSpecPayload} />;
  }
  return (
    <ConfirmationCard
      payload={payload as TableSpecPayload}
      onConfirm={onConfirm ?? (() => {})}
    />
  );
}
```

**Import addition pattern** (lines 1-33 — same import block structure):
```typescript
// Add to existing imports:
import { TableGridPanel } from "./table-grid-panel";
```

**Type cast pattern** already established in the file — use same `payload as TableSpecPayload` cast.

---

### `apps/web/src/features/unified-chat/components/confirmation-card.tsx` (MODIFY)

**Analog:** Self — existing file

**Existing onChange handler pattern** (lines 20-29):
```typescript
function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
  setEditedSpec((current) => ({ ...current, title: e.target.value }));
}

function handleColumnNameChange(index: number, name: string) {
  setEditedSpec((current) => ({
    ...current,
    columns: current.columns.map((col, i) => (i === index ? { ...col, name } : col)),
  }));
}
```

**Modification:** `onConfirm(editedSpec)` in `handleConfirm` already passes the full spec — new fields (`rows`, `formulaLanguage`, `separator`) are part of `editedSpec` state and will be passed through untouched. No new handlers needed; the existing spread pattern `{ ...current, title: e.target.value }` preserves unknown fields.

**Type change only:** `payload: TableSpecPayload` type will automatically include the new optional fields after the schema extension. No structural component changes needed beyond verifying TypeScript still compiles.

---

### `apps/web/src/styles/globals.css` (MODIFY — add grid CSS classes)

**Analog:** Self — existing `.assistant-card`, `.output-header`, `.ghost-button` sections

**Existing class pattern for reference** (lines 405-411):
```css
.assistant-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  padding: 16px;
  overflow-wrap: anywhere;
}
```

**New classes to append** (at end of file or in a new `/* ── Tabela Viva grid ──── */` section — follow the existing section comment style):
The full CSS block is specified in UI-SPEC.md lines 276-361. Key classes: `.table-grid-panel` (DSG theming override with `--dsg-*` variables), `.table-grid-toolbar`, `.table-grid-toolbar-spacer`, `.cell-formula`, `.cell-error`, `.col-header`, `.col-header:hover`, `.col-header[data-sort]`, `.col-header-remove`.

**Section comment pattern** (existing style from globals.css):
```css
/* ── Tabela Viva grid ───────────────────────────────────────────────── */
```

---

### `apps/web/tests/formula-engine.test.ts` (NEW)

**Analog:** `apps/web/tests/table-clarifier.test.ts`

**Test file structure** (table-clarifier.test.ts lines 1-13):
```typescript
import { afterAll, beforeEach, describe, expect, it } from "vitest";

// NOTE: imports falharão até Wave 1 criar os módulos
// @ts-ignore — módulo criado no Wave 1
import { askClarificationQuestion, buildTableSpec } from "../src/server/ai/table-clarifier";
// @ts-ignore — schema criado no Wave 1
import { tableSpecPayloadSchema } from "@tabelin/shared";

const REAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;
```
**For formula-engine.test.ts:** Same `describe`/`it`/`expect` import. Import `useFormulaEngine` or the standalone `evaluateFormula` function (depending on whether the engine exposes a non-hook evaluator for testing). Import `PT_BR_TO_EN` from `@tabelin/shared`.

**describe block + beforeEach/afterAll pattern** (lines 14-25):
```typescript
describe("askClarificationQuestion — fixture mode", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });
  afterAll(() => {
    if (REAL_OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = REAL_OPENAI_API_KEY;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });
  it("retorna uma string para turnIndex 0 no fixture mode", async () => { ... });
});
```
**For formula-engine.test.ts:** No env manipulation needed (pure computation). Use synchronous `it` blocks:
```typescript
describe("PT_BR_TO_EN map", () => {
  it("PROCV mapeia para VLOOKUP", () => {
    expect(PT_BR_TO_EN["PROCV"]).toBe("VLOOKUP");
  });
  it("SOMASE mapeia para SUMIF", () => { ... });
  it("SE mapeia para IF", () => { ... });
});

describe("parseA1", () => {
  it("B3 → { row: 2, col: 1 }", () => { ... });
  it("retorna null para ref inválida", () => { ... });
});

describe("evaluateFormula — PROCV", () => {
  it("=PROCV(lookup;range2D;2;0) retorna valor correto", () => { ... });
  it("=PROCV com valor ausente retorna #N/A", () => { ... });
});

describe("evaluateFormula — separadores BR", () => {
  it("semicolon separates args, comma is decimal", () => { ... });
});
```

**Graceful skip pattern** (unified-schema.test.ts lines 121-126) — for Wave 0 scaffold:
```typescript
it("está disponível após Wave 1 criar o módulo", () => {
  if (!formulaEngine) {
    expect(true).toBe(true);
    return;
  }
  // ... real assertions
});
```

---

### `apps/web/tests/table-grid-panel.test.tsx` (NEW)

**Analog:** `apps/web/tests/unified-schema.test.ts`

**Vitest + jsdom + React Testing Library setup** (vitest.config.ts lines 8-11):
```typescript
test: {
  environment: "jsdom",
  globals: true,
  setupFiles: ["./tests/setup.ts"],
  css: true
}
```
Setup file (tests/setup.ts line 1): `import "@testing-library/jest-dom/vitest";`

**TSX test file structure** — follows the same import/describe/it pattern as unified-schema.test.ts but uses `@testing-library/react`:
```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// @ts-ignore — módulo criado no Wave 2
import { TableGridPanel } from "../src/features/unified-chat/components/table-grid-panel";
```

**Component render test pattern** (standard in this codebase — no existing tsx test to copy from directly, so use RTL conventions aligned with existing test style):
```typescript
describe("TableGridPanel — render", () => {
  it("renderiza título da spec", () => {
    const spec = {
      kind: "table_spec" as const,
      title: "Controle de Gastos",
      columns: [{ name: "Valor", type: "currency", key: "valor" }],
      rowCount: 3,
      rows: [{ valor: 2000 }, { valor: 800 }, { valor: 150 }],
      formulaLanguage: "pt-BR" as const,
      separator: ";" as const,
    };
    render(<TableGridPanel spec={spec} />);
    expect(screen.getByText("Controle de Gastos")).toBeInTheDocument();
  });
});

describe("TableGridPanel — SEC-05 XSS", () => {
  it("conteúdo de célula não executa script", () => {
    // render with cell value "<script>window.__xss=true</script>"
    // expect window.__xss to be undefined
    // expect the string to appear as text, not as executed script
  });
});
```

---

## Shared Patterns

### `"use client"` directive
**Source:** Every component in `apps/web/src/features/unified-chat/components/`
**Apply to:** `table-grid-panel.tsx`, `use-formula-engine.ts`
```typescript
"use client";
```
Required because react-datasheet-grid uses clipboard/keyboard browser APIs. Leaf-node client component in RSC tree.

### assistant-card + output-header chrome
**Source:** `apps/web/src/features/unified-chat/components/confirmation-card.tsx` lines 38-44
```typescript
<div className="assistant-card" aria-label="...">
  <div className="output-header">
    <h2>{title}</h2>
  </div>
  {/* content */}
</div>
```
**Apply to:** `table-grid-panel.tsx` (outer wrapper)

### ghost-button
**Source:** `apps/web/src/features/unified-chat/components/confirmation-card.tsx` line 86 / `apps/web/src/styles/globals.css` lines 168-187
```typescript
<button className="ghost-button" type="button" onClick={handler}>
  Label
</button>
```
**Apply to:** Toolbar buttons in `table-grid-panel.tsx` ("+ Linha", "+ Coluna")

### Zod schema + TypeScript type export
**Source:** `packages/shared/src/formula/schema.ts` lines 75-82
```typescript
export type FormulaGenerateResponse = z.infer<typeof formulaGenerateResponseSchema>;
```
**Apply to:** `packages/shared/src/unified-chat/schema.ts` — add `export type TableColumn = z.infer<typeof tableColumnSchema>`

### Structured Outputs try/catch + fallback
**Source:** `apps/web/src/server/ai/table-clarifier.ts` lines 249-284
```typescript
try {
  const completion = await client.chat.completions.parse({ ...,
    response_format: zodResponseFormat(schema, "schema_name"),
  });
  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) throw new Error("...");
  return parsed;
} catch (err) {
  if (!shouldFallbackFromStructuredOutputs(err)) throw err;
  const fallbackCompletion = await client.chat.completions.create({
    ..., response_format: { type: "json_object" }
  });
  const raw = JSON.parse(fallbackCompletion.choices[0]?.message?.content ?? "{}") as unknown;
  return schema.parse(raw);
}
```
**Apply to:** Modified `buildTableSpec` in `table-clarifier.ts` (unchanged structure, only prompt and fixture change)

### Test beforeEach/afterAll env key guard
**Source:** `apps/web/tests/table-clarifier.test.ts` lines 12-25
```typescript
const REAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;
beforeEach(() => { delete process.env.OPENAI_API_KEY; });
afterAll(() => {
  if (REAL_OPENAI_API_KEY) process.env.OPENAI_API_KEY = REAL_OPENAI_API_KEY;
  else delete process.env.OPENAI_API_KEY;
});
```
**Apply to:** Any test in `table-clarifier.test.ts` that tests the extended fixture mode

### Barrel export for @tabelin/shared
**Source:** `packages/shared/src/index.ts` lines 1-22
```typescript
// Phase 14: tabela viva
export * from "./table/formula-locale";
```
**Apply to:** Add entry to `packages/shared/src/index.ts` for the new `./table/formula-locale` module.

### vitest alias resolution
**Source:** `apps/web/vitest.config.ts` lines 16-19
```typescript
resolve: {
  alias: {
    "@tabelin/shared": new URL("../../packages/shared/src/index.ts", ...),
    "@tabelin/shared/": new URL("../../packages/shared/src/", ...),
  }
}
```
**Note:** New test files in `apps/web/tests/` automatically pick up this alias — no config change needed.

---

## No Analog Found

All files have close analogs in the codebase. No files require falling back to RESEARCH.md patterns exclusively.

| File | Note |
|------|------|
| `use-formula-engine.ts` | No hook with `useMemo`-based computation exists yet, but `use-unified-chat-stream.ts` provides the structural hook pattern; RESEARCH.md Patterns 2-4 provide the algorithm |
| `table-grid-panel.tsx` | No spreadsheet-grid component exists yet; `confirmation-card.tsx` + `clarification-card.tsx` provide the component chrome pattern; RESEARCH.md Patterns 4-7 + UI-SPEC.md provide the grid internals |

---

## Metadata

**Analog search scope:** `packages/shared/src/`, `apps/web/src/features/unified-chat/`, `apps/web/src/server/ai/`, `apps/web/tests/`, `apps/web/src/styles/`
**Files scanned:** 20
**Pattern extraction date:** 2026-06-09
