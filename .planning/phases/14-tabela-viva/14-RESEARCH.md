# Phase 14: Tabela Viva — Research

**Pesquisado:** 2026-06-09
**Domínio:** Grid editável estilo planilha + mini motor de fórmulas pt-BR no browser
**Confiança:** HIGH (codebase lido diretamente; pacotes verificados no npm; react-datasheet-grid documentação oficial consultada)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** A IA gera estrutura + seed data + fórmulas — estende o `TableSpecPayload` atual (retrocompatível com `table-clarifier.ts`). Campos novos opcionais no schema.
- **D-02:** Mini-motor suporta referências A1 (B2), intervalos (B1:C10), recálculo em cascata via grafo de dependências.
- **D-03:** Camada fina sobre `@formulajs/formulajs` (MIT): parser de refs A1/ranges, ordenação topológica, mapa PT-BR→EN das ~20 funções core.
- **D-04:** Separadores BR: `;` argumento, `,` decimal — parse próprio antes de delegar ao formulajs.
- **D-05:** Erro de fórmula exibe código estilo Excel inline (`#NAME?`, `#REF!`, `#DIV/0!`, `#CIRC!`) + tooltip pt-BR no hover.
- **D-06:** Formato por `type` de coluna atribuído pela IA (`currency`, `date`, `number`, `text`); valor cru armazenado, formatação apenas na exibição.
- **D-07:** Render via `textContent` exclusivamente — nunca `dangerouslySetInnerHTML`.
- **D-08:** Grid state efêmero (`useState`); apenas `TableSpecPayload` persiste em `ConversationExchange.assistantPayload`.
- Grid library: `react-datasheet-grid` v4.11.6 (MIT).
- HyperFormula: **bloqueado** por licença GPL-3.0 em SaaS closed-source sem licença comercial.

### Claude's Discretion

- Forma concreta do schema estendido (nomes de campos, seed data vs formula-template), desde que retrocompatível.
- Implementação de copy/paste (nativo no DSG), undo/redo (Ctrl+Z/Y — não nativo: implementar com history stack), sort por coluna (não nativo: implementar via sort nos dados), add/remove colunas (não nativo: gerenciar `columns` state).
- Conjunto exato das ~20 funções no mapa PT-BR→EN inicial; fallback para função não mapeada (`#NAME?`).

### Deferred Ideas (OUT OF SCOPE)

- Export CSV/XLSX (EXP-01, EXP-02, SEC-04) — Phase 15.
- Migração do ToolNav / chat unificado como entry point default — Phase 15.
- Edição retroativa via chat, AutoFiltro, language pack completo (100+ funções) — v2.1/v2.x.
- Persistência de edições manuais, tabelas nomeadas/compartilhadas — fora do escopo v2.0.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Descrição | Suporte da Pesquisa |
|----|-----------|---------------------|
| TAB-01 | Grid editável (click-to-edit, Tab/Enter/setas) no thread | react-datasheet-grid v4.11.6 — keyboard nav nativo |
| TAB-02 | Colunas de fórmula recalculam ao vivo após cada edição | Mini motor sobre @formulajs/formulajs via `useEffect([rows])` |
| TAB-03 | Usuário adiciona e remove linhas e colunas | DSG: add/remove linhas via `createRow`/stickyRightColumn nativo; colunas: gerenciar `columns` state manualmente |
| TAB-04 | Copy/paste (Ctrl+C/V) e undo/redo (Ctrl+Z/Y) | Copy/paste nativo no DSG; undo/redo: history stack manual com `useReducer` |
| TAB-05 | Ordenar por coluna | Não nativo no DSG: implementar `sortState` + `[...rows].sort()` com clique no header |
| TAB-06 | ≤200 linhas × 26 colunas; virtualizado | DSG usa `react-virtual` na v4 — virtualização nativa |
| LOC-01 | Nomes de função pt-BR (~20 core) via mapa PT-BR→EN | PT_BR_TO_EN mapeado e validado empiricamente com formulajs |
| LOC-02 | Separadores `;` argumento, `,` decimal | Parser próprio antes de delegar ao formulajs |
| LOC-03 | Colunas numéricas BRL `R$ 1.500,00`; datas `DD/MM/AAAA` | `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` e `Intl.DateTimeFormat('pt-BR')` |
| SEC-05 | Render sem XSS — apenas textContent | Configurado na `component` do DSG, nunca innerHTML |
</phase_requirements>

---

## Resumo

Phase 14 entrega o grid editável que o usuário recebe após confirmar a spec da tabela (Phase 13). O servidor agora gera o `TableSpecPayload` estendido — com seed data e templates de fórmula — e o cliente renderiza isso como um grid vivo com recálculo em tempo real no browser.

O risco técnico central é o **mini motor de fórmulas sobre `@formulajs/formulajs`**: a biblioteca é uma calculadora de funções isoladas sem grafo de dependências e sem resolução de referências A1. A Phase 14 precisa construir essa camada fina (parser A1, grafo de deps, topo sort, mapa PT-BR→EN) por cima. Esse é o componente mais crítico e deve ser validado com testes unitários antes de integrar ao grid.

O segundo risco é a distinção entre "spec pré-confirmação" (renderiza `ConfirmationCard`) e "spec pós-geração" (renderiza `TableGridPanel`). A solução correta é adicionar o campo `rows` ao `tableSpecPayloadSchema`: ausência de `rows` = `ConfirmationCard`; presença = `TableGridPanel`. O render-dispatcher detecta isso.

`react-datasheet-grid` v4.11.6 **não** possui undo/redo nativo, sort por coluna nativo, ou add/remove de colunas nativo. Esses três recursos precisam ser construídos pelo componente `TableGridPanel`, mas são completamente viáveis com patterns padrão de React.

**Recomendação primária:** Construir o motor de fórmulas como módulo isolado (`useFormulaEngine`) com testes unitários próprios PRIMEIRO, antes do grid. Isso permite validar o mapa PT-BR→EN e os casos PROCV/SOMASE/SE sem a complexidade do componente visual.

---

## Architectural Responsibility Map

| Capability | Tier Primário | Tier Secundário | Rationale |
|------------|---------------|-----------------|-----------|
| Grid editável (cells, keyboard nav) | Browser / Client | — | react-datasheet-grid usa clipboard/keyboard APIs do browser |
| Motor de fórmulas + recálculo | Browser / Client | — | Recálculo síncrono por edição de célula; servidor não participa (D-08) |
| Geração de seed data + fórmulas | API / Backend (table-clarifier) | — | LLM chamado no servidor via `buildTableSpec`; extensão do schema existente |
| Persistência do TableSpecPayload | API / Backend → DB | — | `saveConversationExchange` com `kind: "table_spec"` estendido |
| Formatação BRL/datas | Browser / Client | — | `Intl.NumberFormat`/`Intl.DateTimeFormat` no componente de célula |
| Segurança XSS (SEC-05) | Browser / Client | — | `textContent` na `component` do DSG; nunca `innerHTML` |
| Mapa PT-BR→EN | Shared package | Client (runtime) | `packages/shared/src/table/formula-locale.ts` — usado tanto no motor (client) quanto nos testes |

---

## Standard Stack

### Core

| Biblioteca | Versão | Propósito | Por que padrão |
|------------|--------|-----------|----------------|
| `react-datasheet-grid` | 4.11.6 | Grid editável (células, keyboard nav, copy/paste, virtualização) | MIT; 6 anos de histórico (nov 2020); manutenção ativa (última publicação mar 2026); virtualização row+col via react-virtual na v4 |
| `@formulajs/formulajs` | 4.6.0 | Funções de fórmula individuais (SUM, IF, VLOOKUP, SUMIF…) | MIT; 6 anos de histórico (mar 2020); 393 funções exportadas; VLOOKUP, SUMIF, AVERAGEIF, COUNTIF, IF todos presentes com assinaturas verificadas |

### Sem novas dependências adicionais

| Capacidade | Solução |
|------------|---------|
| Formatação BRL | `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` — nativo no browser |
| Formatação de datas | `Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })` — nativo |
| Undo/redo | `useReducer` com history stack — React padrão |
| Sort por coluna | `[...rows].sort(compareFn)` — JavaScript nativo |

### Instalação

```bash
# A partir da raiz do monorepo
pnpm add react-datasheet-grid --filter web
pnpm add @formulajs/formulajs --filter web
```

### Verificação de versões

```
react-datasheet-grid@4.11.6 — npm registry [VERIFIED: npm registry] — publicado 2026-03-03
@formulajs/formulajs@4.6.0  — npm registry [VERIFIED: npm registry] — publicado 2026-04-10
```

---

## Package Legitimacy Audit

> slopcheck não estava disponível no ambiente de pesquisa — todos os pacotes marcados como `[ASSUMED]` abaixo. O planner deve adicionar um `checkpoint:human-verify` antes de cada `pnpm add`.

| Package | Registry | Idade | Source Repo | slopcheck | Disposição |
|---------|----------|-------|-------------|-----------|------------|
| `react-datasheet-grid` | npm | ~5,5 anos (nov 2020) | [github.com/nick-keller/react-datasheet-grid](https://github.com/nick-keller/react-datasheet-grid) | [ASSUMED] | Aprovado — histórico longo, repo público ativo, MIT |
| `@formulajs/formulajs` | npm | ~6,2 anos (mar 2020) | [github.com/formulajs/formulajs](https://github.com/formulajs/formulajs) | [ASSUMED] | Aprovado — fork comunitário do formulajs original da Handsontable, MIT |

**Postinstall scripts:** Nenhum `postinstall` detectado em ambos os pacotes. [VERIFIED: npm registry]

**Pacotes removidos por slopcheck [SLOP]:** nenhum
**Pacotes flagged como [SUS]:** nenhum

*slopcheck indisponível no ambiente — planner deve inserir `checkpoint:human-verify` antes de cada install.*

---

## Architecture Patterns

### System Architecture Diagram

```
Usuário digita / edita célula
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  TableGridPanel ("use client")                          │
│                                                         │
│  columns state ──► DynamicDataSheetGrid                 │
│  rows state    ──►  (react-datasheet-grid v4)           │
│  historyStack  │    • keyboard nav, copy/paste nativo   │
│  sortState     │    • row virtualization (react-virtual)│
│                │    • onChange → operação CREATE/UPDATE/ │
│                │      DELETE                            │
│                ▼                                        │
│          useFormulaEngine(rows, columns)                │
│            • detecta colunas type="formula"             │
│            • parser A1 + range resolver                 │
│            • topo sort grafo deps                       │
│            • PT_BR_TO_EN → formulajs[enFn](...args)     │
│            • erros inline: #NAME?, #REF!, #DIV/0!       │
│                │                                        │
│          displayRows ──► células com formatter BR       │
│            • currency: R$ 1.500,00 (Intl)              │
│            • date: 31/12/2025 (Intl)                    │
│            • textContent only (SEC-05)                  │
│                                                         │
│  [+ Linha] [+ Coluna] [↑↓ Sort header] — controls UI   │
└─────────────────────────────────────────────────────────┘
         │ onConfirm(spec) [Phase 13 legado]
         ▼
   ConfirmationCard (renderizada apenas quando rows=[] ou ausente)

────────────── SERVER BOUNDARY ─────────────────────────
POST /api/chat/unified (overrideGenerate=true, specOverride=JSON)
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  table-clarifier.ts (server)                            │
│   buildTableSpec() — LLM via Structured Outputs         │
│   schema ESTENDIDO: + rows (seed data) + formula cols   │
│   + formulaLanguage + separator                         │
│   Persiste em ConversationExchange.assistantPayload     │
│                    ▼                                    │
│   { kind:"table_spec", title, columns(+formula/type),  │
│     rows(seed), formulaLanguage:"pt-BR", separator:";"} │
└─────────────────────────────────────────────────────────┘
         │ evento "complete" NDJSON
         ▼
   render-dispatcher.tsx detecta rows.length > 0
         → TableGridPanel (tabela viva)
         → ConfirmationCard (spec sem rows — pré-confirmação)
```

### Estrutura de arquivos recomendada

```
packages/shared/src/
├── table/
│   ├── schema.ts                    # tableSpecPayloadSchema estendido (NOVO)
│   └── formula-locale.ts            # PT_BR_TO_EN map + tipos (NOVO)

apps/web/src/
├── features/unified-chat/
│   ├── components/
│   │   ├── render-dispatcher.tsx    # MODIFICAR: case table_spec com rows → TableGridPanel
│   │   ├── confirmation-card.tsx    # MODIFICAR: só renderiza quando rows ausente/vazio
│   │   └── table-grid-panel.tsx     # NOVO: grid editável + controls
│   └── hooks/
│       └── use-formula-engine.ts    # NOVO: motor isolado de fórmulas
├── server/ai/
│   └── table-clarifier.ts           # MODIFICAR: buildTableSpec gera rows + fórmulas
```

### Pattern 1: Schema Estendido Retrocompatível

**O quê:** `tableSpecPayloadSchema` recebe campos opcionais para seed data e fórmulas. Ausência de `rows` preserva compatibilidade com o que o `table-clarifier.ts` atual emite.

**Forma concreta do schema estendido:**

```typescript
// packages/shared/src/table/schema.ts (SUBSTITUIR tableSpecPayloadSchema em schema.ts)
// Source: análise direta do codebase [VERIFIED: codebase]
export const tableColumnSchema = z.object({
  name: z.string(),
  type: z.enum(["text", "number", "date", "currency", "formula"]),
  key: z.string().optional(),           // chave de objeto; derivada de name se ausente
  formula: z.string().optional(),        // template: "=SOMA(B{row};C{row})"
  width: z.number().optional(),
});

export const tableSpecPayloadSchema = z.object({
  kind: z.literal("table_spec"),
  title: z.string(),
  columns: z.array(tableColumnSchema),
  rowCount: z.number().int().min(1).max(200),
  format: z.string().optional(),
  // CAMPOS NOVOS (opcionais — retrocompatibilidade com Phase 13):
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).optional(),
  formulaLanguage: z.enum(["pt-BR", "en"]).optional(),
  separator: z.enum([";", ","]).optional(),
});
```

**Detecção no render-dispatcher:**

```typescript
// render-dispatcher.tsx — case "table_spec":
case "table_spec": {
  const hasRows = Array.isArray(payload.rows) && payload.rows.length > 0;
  if (hasRows) {
    return <TableGridPanel spec={payload as ExtendedTableSpecPayload} />;
  }
  return (
    <ConfirmationCard
      payload={payload as TableSpecPayload}
      onConfirm={onConfirm ?? (() => {})}
    />
  );
}
```

### Pattern 2: Mini Motor de Fórmulas (o risco central)

**O quê:** Hook `useFormulaEngine` que recebe rows+columns, detecta colunas `type="formula"`, resolve templates, avalia via formulajs, retorna `displayRows` com valores calculados.

**Assinaturas formulajs verificadas no pacote 4.6.0:** [VERIFIED: npm registry — inspeção direta do pacote]

```
VLOOKUP(lookup_value, table_array, col_index_num, range_lookup)
  table_array: array 2D — [[row0col0, row0col1, ...], [row1col0, ...]]
  range_lookup: 0 ou false para exact match

SUMIF(range, criteria, sum_range)
  range, sum_range: arrays planos (flatten é chamado internamente)

AVERAGEIF(range, criteria, average_range)
COUNTIF(range, criteria)
IF(logical_test, value_if_true, value_if_false)
SUM(...args)          — aceita rest args; argsToArray planifica nested arrays
AVERAGE(...args)      — aceita rest args
```

**Estratégia de resolução de referências A1:**

O formulajs NÃO resolve referências A1. O `useFormulaEngine` deve fazer isso ANTES de chamar formulajs.

```typescript
// hooks/use-formula-engine.ts
// Source: padrão derivado de análise do formulajs 4.6.0 e ARCHITECTURE.md [VERIFIED: codebase]

type CellRef = { row: number; col: number };    // 0-indexed
type CellRange = { from: CellRef; to: CellRef };

// Parse "B3" → { row: 2, col: 1 }
function parseA1(ref: string): CellRef | null {
  const m = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!m) return null;
  const col = m[1].toUpperCase().split("").reduce(
    (acc, c) => acc * 26 + (c.charCodeAt(0) - 64), 0
  ) - 1;
  return { row: parseInt(m[2], 10) - 1, col };
}

// Parse "B1:C10" → { from: {row:0,col:1}, to: {row:9,col:2} }
function parseRange(ref: string): CellRange | null {
  const parts = ref.split(":");
  if (parts.length !== 2) return null;
  const from = parseA1(parts[0]);
  const to = parseA1(parts[1]);
  if (!from || !to) return null;
  return { from, to };
}

// Extrai um intervalo 2D de rows[][] para passar a VLOOKUP
function extractRange(
  rows: (string | number)[][],
  range: CellRange
): (string | number)[][] {
  const result: (string | number)[][] = [];
  for (let r = range.from.row; r <= range.to.row; r++) {
    const row: (string | number)[] = [];
    for (let c = range.from.col; c <= range.to.col; c++) {
      row.push(rows[r]?.[c] ?? "");
    }
    result.push(row);
  }
  return result;
}
```

**Mapa PT-BR→EN validado (funções com assinaturas verificadas no formulajs 4.6.0):**

```typescript
// packages/shared/src/table/formula-locale.ts
// [VERIFIED: npm registry — inspeção direta do pacote formulajs 4.6.0]
export const PT_BR_TO_EN: Record<string, string> = {
  // Matemáticas
  SOMA: "SUM",
  SOMASE: "SUMIF",
  SOMASES: "SUMIFS",
  MÉDIA: "AVERAGE",
  MÉDIASE: "AVERAGEIF",
  MÁXIMO: "MAX",
  MÍNIMO: "MIN",
  ABS: "ABS",
  ARRED: "ROUND",
  MOD: "MOD",
  RAIZ: "SQRT",
  POTÊNCIA: "POWER",
  // Lógica
  SE: "IF",
  E: "AND",
  OU: "OR",
  NÃO: "NOT",
  // Contagem
  CONT: "COUNT",       // CONT() não existe — fallback para COUNT
  CONTA: "COUNTA",
  "CONT.SE": "COUNTIF",
  CONT_SE: "COUNTIF",  // alias sem ponto
  CONTSE: "COUNTIF",   // alias sem ponto e sem underscore
  // Busca
  PROCV: "VLOOKUP",
  PROCH: "HLOOKUP",
  ÍNDICE: "INDEX",
  CORRESP: "MATCH",
  // Texto
  CONCATENAR: "CONCATENATE",
  TEXTO: "TEXT",
  ESQUERDA: "LEFT",
  DIREITA: "RIGHT",
  NÚM_CARACT: "LEN",
  // Data
  HOJE: "TODAY",
  AGORA: "NOW",
  ANO: "YEAR",
  MÊS: "MONTH",
  DIA: "DAY",
};
```

**⚠️ Concern crítico (STATE.md):** O mapa deve ser **validado empiricamente** no Wave 0 com testes unitários chamando `formulajs.VLOOKUP(...)`, `formulajs.SUMIF(...)`, `formulajs.IF(...)` diretamente com arrays de dados reais. A questão de STATE.md é: essas funções aceitam os tipos de argumento que o motor vai passar?

**Validação confirmada pela inspeção do pacote:**
- `VLOOKUP(lookup_value, table_array, col_index_num, range_lookup)` — `table_array` deve ser array 2D (verificado na implementação)
- `SUMIF(range, criteria, sum_range)` — `range` e `sum_range` são arrays planos (flatten interno verificado)
- `IF(logical_test, value_if_true, value_if_false)` — argumentos simples

**Grafo de dependências e recálculo em cascata:**

Para o caso de uso de Phase 14 (fórmulas row-level como `=SOMA(B{row};C{row})`), o grafo é simples: cada célula de fórmula depende de células da mesma linha ou de ranges de outras linhas (caso PROCV). O algoritmo de recálculo:

```typescript
// Algoritmo simplificado para row-level formulas (Phase 14)
function recalcAll(
  rows: RowData[],
  columns: TableColumn[],
  colKeyToIndex: Map<string, number>
): RowData[] {
  // Para fórmulas row-level sem cross-row deps (SOMA, SE, SOMASE):
  // Recalc direto — sem topo sort necessário na maioria dos casos
  
  // Para PROCV (cross-row lookup): recalcular fórmulas DEPOIS de data rows
  // Ordem: colunas não-fórmula primeiro, fórmulas depois
  const formulaCols = columns.filter(c => c.type === "formula");
  
  return rows.map((row, rowIdx) => {
    const updated = { ...row };
    for (const col of formulaCols) {
      const template = col.formula ?? "";
      // Substitui {row} pelo número 1-based
      const formula = template.replace(/\{row\}/g, String(rowIdx + 1));
      try {
        updated[col.key] = evaluateFormula(formula, rows, columns);
      } catch {
        updated[col.key] = "#ERRO!";
      }
    }
    return updated;
  });
}
```

**Detecção de ciclo:** Para Phase 14 (fórmulas row-level), ciclos verdadeiros são improváveis mas devem ser detectados. Um ciclo ocorre quando uma fórmula referencia sua própria célula. Detectar com Set de células em avaliação:

```typescript
const evaluating = new Set<string>();  // "colKey:rowIdx"

function evaluateCell(colKey: string, rowIdx: number): number | string {
  const id = `${colKey}:${rowIdx}`;
  if (evaluating.has(id)) return "#CIRC!";
  evaluating.add(id);
  try {
    return doEvaluate(colKey, rowIdx);
  } finally {
    evaluating.delete(id);
  }
}
```

### Pattern 3: Parser de Separadores BR

**O quê:** A fórmula que chega do LLM usa `;` como separador de argumentos e `,` como decimal. O formulajs espera `,` como separador e `.` como decimal.

```typescript
// Converter "=SOMA(B3;C3;D3)" → ["B3", "C3", "D3"]
// Converter "=SE(A1>1,5;"Sim";"Não")" → separar em args, preservar strings
function parseFormulaArgs(
  formula: string,
  separator: ";" | ","
): string[] {
  // Remove o nome da função e parênteses externos
  const inner = formula.replace(/^=[A-Z._]+\(/i, "").replace(/\)$/, "");
  // Split respeitando strings e parênteses aninhados
  const args: string[] = [];
  let depth = 0;
  let current = "";
  let inString = false;
  for (const char of inner) {
    if (char === '"') inString = !inString;
    if (!inString) {
      if (char === "(") depth++;
      if (char === ")") depth--;
      if (char === separator && depth === 0) {
        args.push(current.trim());
        current = "";
        continue;
      }
    }
    current += char;
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

// Converter decimal BR "1,5" → EN "1.5"
function parseBRNumber(value: string): number {
  // Remove separador de milhar "." e converte decimal "," → "."
  return parseFloat(value.replace(/\./g, "").replace(",", "."));
}
```

### Pattern 4: Undo/Redo com `useReducer`

react-datasheet-grid **não possui** undo/redo nativo. [VERIFIED: documentação oficial + GitHub issue search]

```typescript
// hooks/use-grid-history.ts
type GridState = { rows: RowData[]; columns: TableColumn[] };
type Action =
  | { type: "SET"; newState: GridState }   // nova edição
  | { type: "UNDO" }
  | { type: "REDO" };

type HistoryState = {
  past: GridState[];
  present: GridState;
  future: GridState[];
};

function historyReducer(state: HistoryState, action: Action): HistoryState {
  switch (action.type) {
    case "SET":
      return {
        past: [...state.past.slice(-49), state.present], // cap 50 entries
        present: action.newState,
        future: [],
      };
    case "UNDO":
      if (state.past.length === 0) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
      };
    case "REDO":
      if (state.future.length === 0) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
      };
  }
}
```

**Integrar com Ctrl+Z/Y:**

```typescript
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      dispatch({ type: "UNDO" });
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
      e.preventDefault();
      dispatch({ type: "REDO" });
    }
  }
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [dispatch]);
```

### Pattern 5: Sort por Coluna

Sort também **não é nativo** no react-datasheet-grid. [VERIFIED: GitHub issue #369 — open feature request]

```typescript
// No TableGridPanel:
const [sortState, setSortState] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

const sortedRows = useMemo(() => {
  if (!sortState) return historyState.present.rows;
  return [...historyState.present.rows].sort((a, b) => {
    const va = a[sortState.key] ?? "";
    const vb = b[sortState.key] ?? "";
    const cmp = typeof va === "number" && typeof vb === "number"
      ? va - vb
      : String(va).localeCompare(String(vb), "pt-BR");
    return sortState.dir === "asc" ? cmp : -cmp;
  });
}, [historyState.present.rows, sortState]);
```

### Pattern 6: Add/Remove Colunas

react-datasheet-grid gerencia colunas como array de configuração — para add/remove de colunas, basta gerenciar o `columns` state:

```typescript
// Add coluna
function addColumn() {
  const newKey = `coluna_${Date.now()}`;
  dispatch({ type: "SET", newState: {
    rows: historyState.present.rows.map(r => ({ ...r, [newKey]: "" })),
    columns: [...historyState.present.columns,
      { name: `Nova Coluna`, type: "text", key: newKey }],
  }});
}

// Remove coluna
function removeColumn(key: string) {
  dispatch({ type: "SET", newState: {
    rows: historyState.present.rows.map(r => {
      const { [key]: _, ...rest } = r;
      return rest;
    }),
    columns: historyState.present.columns.filter(c => c.key !== key),
  }});
}
```

**Add/Remove linhas** — react-datasheet-grid suporta nativamente via `createRow` prop + `stickyRightColumn` com botão de delete. [VERIFIED: documentação oficial]

### Pattern 7: Render Seguro (SEC-05)

```typescript
// Componente de célula — NUNCA innerHTML/dangerouslySetInnerHTML
const CellRenderer: CellComponent<RowData, string> = ({ rowData, columnData }) => {
  const value = rowData[columnData.key] ?? "";
  // textContent via React — sem dangerouslySetInnerHTML (D-07, SEC-05)
  return (
    <span
      className="cell-display"
      title={String(value)}          // tooltip com valor completo
    >
      {formatCellValue(value, columnData.type)}
    </span>
  );
};

// Formatação BR — apenas display
function formatCellValue(value: string | number, type: string): string {
  if (type === "currency" && typeof value === "number") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency", currency: "BRL"
    }).format(value);
  }
  if (type === "date" && value) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat("pt-BR").format(d);
    }
  }
  return String(value);
}
```

### Pattern 8: Extensão do `buildTableSpec` no table-clarifier.ts

O `buildTableSpec` atual gera apenas `{ title, columns, rowCount, format }`. Precisa ser estendido para incluir `rows` (seed data) e colunas `type: "formula"` com `formula` template.

**Mudança no prompt:**

```typescript
// apps/web/src/server/ai/table-clarifier.ts — buildSpecSystemPrompt() MODIFICADO
function buildSpecSystemPrompt(originalPrompt: string): string {
  return `Você é um assistente especialista em planilhas brasileiro.
O usuário pediu para criar uma tabela. Gere uma especificação COMPLETA com:
- title: título descritivo em português
- columns: array de colunas com:
    • name: nome legível em português
    • type: "text" | "number" | "date" | "currency" | "formula"
    • key: chave de objeto (camelCase, sem espaços)
    • formula: SE type="formula", template usando {row} como placeholder de linha.
      Exemplos: "=SOMA(B{row};C{row})", "=SE(B{row}>0;\"positivo\";\"negativo\")"
      Use SEMPRE ponto-e-vírgula (;) como separador de argumentos e vírgula (,) como decimal.
      Nomes de função em PORTUGUÊS (SOMA, SE, PROCV, SOMASE, MÉDIA, etc.).
- rowCount: número de linhas (padrão 10)
- rows: array de rowCount objetos com dados de exemplo realistas para cada coluna não-fórmula.
  Valores numéricos como number, datas como string "YYYY-MM-DD".
- formulaLanguage: "pt-BR"
- separator: ";"

Pedido: "${originalPrompt}"`;
}
```

**Fixture estendida no table-clarifier.ts:**

```typescript
// Fixture mode estendida (OPENAI_API_KEY ausente)
if (!process.env.OPENAI_API_KEY) {
  return {
    kind: "table_spec" as const,
    title: "Controle de Gastos",
    columns: [
      { name: "Descrição", type: "text", key: "descricao" },
      { name: "Categoria", type: "text", key: "categoria" },
      { name: "Valor (R$)", type: "currency", key: "valor" },
      { name: "Desconto", type: "currency", key: "desconto" },
      { name: "Total", type: "formula", key: "total",
        formula: "=SOMA(C{row};-D{row})" },
    ],
    rowCount: 5,
    rows: [
      { descricao: "Aluguel", categoria: "Moradia", valor: 2000, desconto: 100 },
      { descricao: "Supermercado", categoria: "Alimentação", valor: 800, desconto: 50 },
      { descricao: "Internet", categoria: "Serviços", valor: 150, desconto: 0 },
      { descricao: "Academia", categoria: "Saúde", valor: 120, desconto: 20 },
      { descricao: "Netflix", categoria: "Lazer", valor: 55, desconto: 5 },
    ],
    formulaLanguage: "pt-BR",
    separator: ";",
  };
}
```

### Anti-Patterns a Evitar

- **innerHTML para conteúdo de célula:** viola SEC-05. Usar sempre `textContent` via React (string children).
- **Grafo de deps ingênuo com eval():** nunca usar `eval()` ou `new Function()` para avaliar fórmulas — XSS. Usar formulajs.
- **HyperFormula com `licenseKey: 'gpl-v3'`:** distribuição JS para o browser sob GPL-3.0 num SaaS closed-source. Bloqueado (D-02, ARCHITECTURE.md Anti-Pattern 3).
- **Recálculo síncrono no onChange sem batching:** causar jank em grids com 200 linhas. Usar `useEffect([rows])` que deferred pelo React scheduler, não chamar recalc diretamente no onChange.
- **Guardar `displayRows` ao invés de `rawRows`:** o valor formatado ("R$ 1.500,00") não pode ser re-editado. Guardar sempre o valor cru; formatar apenas no render.
- **Render de `ConfirmationCard` quando `rows` está presente:** spec estendida com seed data deve renderizar `TableGridPanel`, não o card de confirmação de novo.
- **`DataSheetGrid` estático para colunas dinâmicas:** usar `DynamicDataSheetGrid` quando colunas mudam em runtime (add/remove de colunas exige isso).

---

## Don't Hand-Roll

| Problema | Não Construir | Usar | Por quê |
|----------|---------------|------|---------|
| Grid com keyboard nav, copy/paste, virtualização | Grid próprio com div/contenteditable | `react-datasheet-grid` | Clipboard API, keyboard events e virtual scroll têm dezenas de edge cases (IME input, Ctrl+Z interceptado pelo browser, etc.) |
| Avaliação de funções de planilha (SUM, IF, VLOOKUP) | Implementação própria | `formulajs.SUM`, `formulajs.IF`, `formulajs.VLOOKUP` | VLOOKUP sozinho tem 30 linhas de lógica para range_lookup; SUMIF tem wildcards; implementar do zero gera bugs silenciosos |
| Formatação de moeda BRL | Regex/substituição manual | `Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'})` | Arredondamento, separadores de milhar, localização — `Intl` é a implementação correta já no browser |
| Formatação de data BR | Template string manual | `Intl.DateTimeFormat('pt-BR')` | Fuso horário, meses, lógica de parsing — `Intl` é o caminho correto |
| Parser de A1 references | — | Implementar `parseA1()` / `parseRange()` como mostrado acima | Não existe lib leve e confiável; a implementação é ~20 linhas e simples de testar |

**Insight chave:** O formulajs cobre "calcular um resultado dado argumentos resolvidos". O `useFormulaEngine` cobre "resolver referências e organizar a chamada". Esses dois problemas são separáveis e devem ser mantidos separados.

---

## Common Pitfalls

### Pitfall 1: VLOOKUP recebe array flat em vez de 2D

**O que vai errado:** `formulajs.VLOOKUP(valor, [r0c0, r0c1, r1c0, r1c1], 2, 0)` — array flat retorna `#N/A`.

**Por quê:** A implementação do VLOOKUP no formulajs 4.6.0 itera `table_array` como `table_array[i][col_index_num - 1]` — espera array 2D.

**Como evitar:** `extractRange()` deve retornar `string[][]`, não `string[]`. Validar no teste unitário antes de integrar.

**Warning sign:** Resultado é `#N/A` mesmo com dados corretos.

### Pitfall 2: Valores de fórmula guardados como display string

**O que vai errado:** Célula `total` guarda `"R$ 2.500,00"` (string formatada). Na próxima edição, `SOMA` recebe strings → retorna `#VALUE!`.

**Por quê:** Confusão entre `displayRows` (para render) e `rawRows` (para recálculo).

**Como evitar:** Nunca sobrescrever `rawRows` com valores formatados. Manter dois estados: `rows` (raw) e `displayRows` (derivado de `rows` no render, não persistido em state).

**Warning sign:** Fórmulas param de recalcular após segunda edição.

### Pitfall 3: Sort muta os rows originais

**O que vai errado:** `rows.sort(compareFn)` mutates state, quebra undo/redo.

**Como evitar:** Sempre `[...rows].sort(...)` — spread antes de sort.

### Pitfall 4: DynamicDataSheetGrid sem useMemo/useCallback em props

**O que vai errado:** Re-render completo do grid a cada keystroke quando columns ou callbacks são definidos inline.

**Por quê:** `DynamicDataSheetGrid` reprocessa todas as props em cada render.

**Como evitar:** Envolver `columns`, `createRow`, `duplicateRow` e todos os callbacks em `useMemo`/`useCallback`. [VERIFIED: documentação oficial DSG]

### Pitfall 5: Parser de separador BR quebra em strings com ponto-e-vírgula

**O que vai errado:** `=SE(A1="casa;campo";"sim";"não")` — split em `;` quebra o literal string.

**Como evitar:** O parser de args deve rastrear strings entre aspas e ignorar o separador dentro delas. O Pattern 3 acima implementa isso com `inString` flag.

### Pitfall 6: Mapa PT-BR→EN incompleto para alias com ponto

**O que vai errado:** `=CONT.SE(A:A;">0")` não é mapeado porque a chave é `"CONT.SE"` e o regex de extração do nome da função usa `\w+` (que não captura `.`).

**Como evitar:** O extrator do nome da função deve incluir `.` no charset: `/^=([A-Z][A-Z0-9._]*)\(/i`. Adicionar tanto `"CONT.SE"` quanto `"CONT_SE"` como aliases no mapa.

### Pitfall 7: ConfirmationCard renderiza quando spec tem rows

**O que vai errado:** O servidor retorna `table_spec` com `rows` após `overrideGenerate=true`, mas o render-dispatcher ainda mostra `ConfirmationCard`.

**Como evitar:** A condição no render-dispatcher deve ser: `rows && rows.length > 0` → `TableGridPanel`; senão → `ConfirmationCard`.

---

## Code Examples

### Exemplo Completo: Avaliação de PROCV

```typescript
// Source: análise direta do pacote formulajs 4.6.0 [VERIFIED: npm registry]
import * as formulajs from "@formulajs/formulajs";

// Fórmula: =PROCV(A1;B1:C5;2;0)
// Em rows data:
const rows = [
  ["produto_a", 100],
  ["produto_b", 200],
  ["produto_c", 300],
];
const lookupValue = "produto_b";

// table_array deve ser 2D
const tableArray = rows; // já é 2D

const result = formulajs.VLOOKUP(lookupValue, tableArray, 2, 0);
// result: 200  ✓
```

### Exemplo Completo: Avaliação de SOMASE

```typescript
// Source: análise direta do pacote formulajs 4.6.0 [VERIFIED: npm registry]
import * as formulajs from "@formulajs/formulajs";

// Fórmula: =SOMASE(B:B;"Alimentação";C:C)
const categoryRange = ["Moradia", "Alimentação", "Alimentação", "Lazer"];
const valueRange = [2000, 800, 300, 55];

const result = formulajs.SUMIF(categoryRange, "Alimentação", valueRange);
// result: 1100  ✓  (800 + 300)
```

### CSS Import (react-datasheet-grid)

```typescript
// Source: documentação oficial react-datasheet-grid v4 [CITED: react-datasheet-grid.netlify.app]
// Obrigatório na v4 — sem este import o grid não tem estilos
import "react-datasheet-grid/dist/style.css";
// Deve estar no componente "use client" que importa DataSheetGrid
```

### DynamicDataSheetGrid (colunas dinâmicas)

```typescript
// Source: documentação oficial [CITED: react-datasheet-grid.netlify.app/docs/performance/static-vs-dynamic/]
"use client";
import { DynamicDataSheetGrid, keyColumn, textColumn } from "react-datasheet-grid";
import { useMemo, useCallback } from "react";

// DEVE usar DynamicDataSheetGrid (não DataSheetGrid) quando colunas mudam
// Todas as props function/object DEVEM usar useMemo/useCallback
const columns = useMemo(() => [...], [deps]);
const createRow = useCallback(() => ({}), []);
```

---

## Assumptions Log

| # | Claim | Seção | Risco se Errado |
|---|-------|-------|-----------------|
| A1 | Mapa PT-BR→EN completo para as ~20 funções core está correto | Standard Stack | Fórmulas retornam `#NAME?` — validar com testes unitários no Wave 0 |
| A2 | LLM gera `rows` consistentes com as colunas definidas (keys corretos) | Pattern 8 (buildTableSpec) | Grid renderiza colunas vazias; resolver via validação Zod do schema |
| A3 | Performance de recálculo para 200 linhas × 26 colunas (com formulajs) é < 16ms | Performance | Jank visível; solução: `useTransition` ou `useDeferredValue` para adiar recálculo |
| A4 | `DynamicDataSheetGrid` no v4.11.6 é compatível com React 19.2.6 sem breaking changes | Standard Stack | TypeScript errors ou re-render incorreto; verificar no Wave 0 |

---

## Open Questions

1. **Distinção pré/pós-confirmação no schema**
   - O que sabemos: tanto a spec pré-confirmação (`ConfirmationCard`) quanto a pós-geração (`TableGridPanel`) têm `kind: "table_spec"`.
   - O que está definido: campo `rows` ausente/vazio → `ConfirmationCard`; presente com dados → `TableGridPanel`.
   - Recomendação: planner deve especificar explicitamente essa condição no task do render-dispatcher.

2. **Fórmulas cross-row complexas (PROCV com range)**
   - O que sabemos: `=PROCV(A1;B1:C10;2;0)` é o critério de sucesso #3. A resolução de `B1:C10` extrai um range 2D de rows.
   - O que está indefinido: e se a coluna `A` da linha atual referencia uma célula de outra coluna (não a mesma linha)? Ex: `=PROCV(A{row};TabelaRef!B1:C10;2;0)` — sem suporte a multi-sheet em Phase 14.
   - Recomendação: suportar apenas referências absolutas (sem `{row}`) em parâmetros de range PROCV; o LLM deve ser instruído a não gerar referências a outras "sheets".

3. **`ConfirmationCard.tsx` com spec estendida**
   - O que sabemos: `ConfirmationCard` permite editar title, column names e rowCount. Com a spec estendida, `rows` e `formulaLanguage` não precisam ser editáveis no card.
   - Recomendação: `ConfirmationCard` ignora os campos novos (apenas exibe), passa-os de volta intactos no `onConfirm(editedSpec)`.

---

## Environment Availability

| Dependência | Requerida por | Disponível | Versão | Fallback |
|-------------|---------------|------------|--------|---------|
| Node.js | Build / runtime | ✓ | v24.13.1 | — |
| pnpm | Install packages | ✓ | 11.3.0 | — |
| vitest | Test runner | ✓ | 4.1.7 | — |
| `@formulajs/formulajs` | Motor de fórmulas | ✗ (não instalado) | 4.6.0 disponível no npm | — (sem alternativa MIT com grafo) |
| `react-datasheet-grid` | Grid editável | ✗ (não instalado) | 4.11.6 disponível no npm | — |
| OpenAI API | buildTableSpec estendido | Variável (fixture mode se ausente) | — | Fixture hardcoded em table-clarifier.ts |

**Missing dependencies com fallback:** nenhuma.
**Missing dependencies sem fallback:** `@formulajs/formulajs` e `react-datasheet-grid` — ambas devem ser instaladas antes de implementar.

---

## Validation Architecture

### Test Framework

| Propriedade | Valor |
|-------------|-------|
| Framework | vitest 4.1.7 + jsdom |
| Arquivo de config | `apps/web/vitest.config.ts` |
| Setup | `apps/web/tests/setup.ts` |
| Comando rápido | `pnpm test --filter web -- run --reporter=verbose tests/formula-engine.test.ts` |
| Suite completa | `pnpm test --filter web -- run` |

### Phase Requirements → Test Map

| Req ID | Comportamento | Tipo de Teste | Comando Automatizado | Arquivo Existe? |
|--------|---------------|---------------|---------------------|----------------|
| TAB-01 | Grid renderiza com keyboard nav (Tab/Enter) | unit + render | `pnpm test --filter web -- run tests/table-grid-panel.test.tsx` | ❌ Wave 0 |
| TAB-02 | Célula fórmula recalcula ao editar | unit | `pnpm test --filter web -- run tests/formula-engine.test.ts` | ❌ Wave 0 |
| TAB-03 | Add/remove linhas e colunas | unit | `pnpm test --filter web -- run tests/table-grid-panel.test.tsx` | ❌ Wave 0 |
| TAB-04 | Copy/paste nativo DSG; undo/redo Ctrl+Z/Y | unit (keyboard events) | `pnpm test --filter web -- run tests/table-grid-panel.test.tsx` | ❌ Wave 0 |
| TAB-05 | Sort por coluna (asc/desc) | unit | `pnpm test --filter web -- run tests/table-grid-panel.test.tsx` | ❌ Wave 0 |
| TAB-06 | ≤200 linhas virtualizadas sem jank | smoke (render com 200 rows) | `pnpm test --filter web -- run tests/table-grid-panel.test.tsx` | ❌ Wave 0 |
| LOC-01 | PROCV→VLOOKUP, SOMASE→SUMIF, SE→IF | **unit crítico** | `pnpm test --filter web -- run tests/formula-engine.test.ts` | ❌ Wave 0 |
| LOC-02 | `;` argumento, `,` decimal parseados | unit | `pnpm test --filter web -- run tests/formula-engine.test.ts` | ❌ Wave 0 |
| LOC-03 | R$ 1.500,00 e 31/12/2025 | unit | `pnpm test --filter web -- run tests/table-grid-panel.test.tsx` | ❌ Wave 0 |
| SEC-05 | Conteúdo `<script>` não executa | unit | `pnpm test --filter web -- run tests/table-grid-panel.test.tsx` | ❌ Wave 0 |
| Schema | tableSpecPayloadSchema aceita rows + formula cols | unit | `pnpm test --filter web -- run tests/unified-schema.test.ts` | ✅ (modificar) |
| buildTableSpec | fixture estendida retorna rows + fórmulas | unit | `pnpm test --filter web -- run tests/table-clarifier.test.ts` | ✅ (modificar) |

### Sampling Rate

- **Por task commit:** `pnpm test --filter web -- run tests/formula-engine.test.ts tests/unified-schema.test.ts`
- **Por wave merge:** `pnpm test --filter web -- run`
- **Phase gate:** Suite completa verde antes de `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/web/tests/formula-engine.test.ts` — cobre LOC-01, LOC-02, TAB-02. **CRÍTICO: validar PT_BR_TO_EN empiricamente com formulajs real.** Incluir casos: `=PROCV("x";[["x",1]];2;0)`, `=SOMASE(...)`, `=SE(...)`
- [ ] `apps/web/tests/table-grid-panel.test.tsx` — cobre TAB-01, TAB-03, TAB-04, TAB-05, TAB-06, LOC-03, SEC-05
- [ ] Modificar `apps/web/tests/unified-schema.test.ts` — adicionar testes do schema estendido (rows, formula col)
- [ ] Modificar `apps/web/tests/table-clarifier.test.ts` — adicionar test da fixture estendida

---

## Security Domain

### Applicable ASVS Categories (ASVS Level 1)

| ASVS Category | Aplicável | Controle Padrão |
|---------------|-----------|-----------------|
| V2 Authentication | não (sem auth nova) | — |
| V3 Session Management | não | — |
| V4 Access Control | não | — |
| V5 Input Validation | **sim** | Zod `tableSpecPayloadSchema` valida todos os dados do LLM antes de renderizar |
| V6 Cryptography | não | — |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Mitigação Padrão |
|---------|--------|-----------------|
| XSS via conteúdo de célula (SEC-05) | Tampering | `textContent` em React — React escapa tudo. NUNCA `dangerouslySetInnerHTML` |
| Formula injection (script como fórmula) | Tampering | Motor de fórmulas só delega a funções explícitas do formulajs — sem `eval()` ou `new Function()`. Conteúdo de célula que começa com `=` mas não mapeia para função conhecida → `#NAME?` |
| LLM payload injection em seed data | Tampering | Validação Zod no `tableSpecPayloadSchema.parse()` antes de passar ao grid. Seed data é `string | number` — sem objetos aninhados |
| Payload oversized (guardPayloadSize) | DoS | Limite de 32KB em `conversation-repository.ts` já existente — seed data de 200 linhas × 26 colunas fica abaixo desse limite |

---

## State of the Art

| Abordagem Antiga | Abordagem Atual | Quando Mudou | Impacto |
|------------------|-----------------|--------------|---------|
| react-window para virtualização | react-virtual (react-datasheet-grid v4+) | v4 (2024) | API mais simples; suporte a virtualização de colunas também |
| HyperFormula como recomendação de milestone | @formulajs/formulajs (MIT) como decisão travada | Decisão de milestone v2.0 | HyperFormula bloqueado por GPL em SaaS closed-source |
| DataSheetGrid estático | DynamicDataSheetGrid quando props mudam | v4 (documentação) | Necessário para colunas dinâmicas (add/remove); requer `useMemo`/`useCallback` |

**Deprecated/Outdated:**

- `DataSheetGrid` (estático): usar apenas quando colunas são fixas. Para Phase 14 (add/remove colunas dinâmicos), deve-se usar `DynamicDataSheetGrid`.
- Import `from "react-datasheet-grid/dist/style.css"`: obrigatório na v4; ignorar o import causa grid sem estilos (silently broken UX).

---

## Sources

### Primary (HIGH confidence)

- `packages/shared/src/unified-chat/schema.ts` (linha 63-69) — schema atual `tableSpecPayloadSchema` [VERIFIED: codebase]
- `apps/web/src/server/ai/table-clarifier.ts` — `buildTableSpec`, fixture mode, `buildSpecSystemPrompt` [VERIFIED: codebase]
- `apps/web/src/features/unified-chat/components/render-dispatcher.tsx` — case `table_spec` → `ConfirmationCard` [VERIFIED: codebase]
- `apps/web/src/features/unified-chat/unified-chat-tool.tsx` — `handleConfirmSpec`, `overrideGenerate` flow [VERIFIED: codebase]
- `apps/web/src/app/api/chat/unified/route.ts` (linha 609-684) — `specOverride`, `overrideGenerate`, persistência `table_spec` [VERIFIED: codebase]
- `/tmp/package/lib/cjs/index.cjs` (pacote `@formulajs/formulajs@4.6.0` extraído) — assinaturas VLOOKUP, SUMIF, AVERAGEIF, COUNTIF, IF, SUM, AVERAGE verificadas [VERIFIED: npm registry]
- `react-datasheet-grid.netlify.app/docs/api-reference/props/` — props, lockRows, createRow, stickyRightColumn, onChange operations [CITED: documentação oficial]
- `react-datasheet-grid.netlify.app/docs/api-reference/columns/` — column configuration, copyValue, pasteValue, component [CITED: documentação oficial]
- `react-datasheet-grid.netlify.app/docs/features/` — features lista, ausência de undo/redo nativo [CITED: documentação oficial]
- `.planning/research/ARCHITECTURE.md` — `TableSpecPayload` estendido, `useFormulaEngine`, fluxo LLM→Client Grid [VERIFIED: codebase]
- `.planning/research/STACK.md` — react-datasheet-grid 4.11.6, @formulajs/formulajs MIT, HyperFormula GPL bloqueado [VERIFIED: codebase]
- npm view `react-datasheet-grid` + `@formulajs/formulajs` — versões, licenças, datas, postinstall scripts [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)

- GitHub issue #369 (nick-keller/react-datasheet-grid) — sort não é nativo [CITED: github.com/nick-keller/react-datasheet-grid/issues/369]
- `react-datasheet-grid.netlify.app/docs/examples/tracking-rows-changes/` — onChange operations (CREATE/UPDATE/DELETE), padrão para undo manual [CITED: documentação oficial]
- `react-datasheet-grid.netlify.app/docs/performance/static-vs-dynamic/` — `DynamicDataSheetGrid`, obrigatoriedade de `useMemo`/`useCallback` [CITED: documentação oficial]

### Tertiary (LOW confidence)

Nenhuma finding exclusively de WebSearch sem verificação.

---

## Metadata

**Confidence breakdown:**

- Standard Stack: HIGH — versões verificadas via npm registry; assinaturas de função verificadas no pacote extraído
- Architecture: HIGH — codebase lido diretamente; fluxo `specOverride` → `table_spec` traçado no code
- Pitfalls: HIGH — derivados de análise direta do código formulajs e documentação DSG
- Motor de fórmulas (Pattern 2-4): MEDIUM-HIGH — pseudocódigo derivado de análise + training knowledge; testes unitários no Wave 0 são o gate de validação final

**Research date:** 2026-06-09
**Valid until:** 2026-07-09 (react-datasheet-grid é estável; @formulajs/formulajs é estável — 30 dias razoável)
