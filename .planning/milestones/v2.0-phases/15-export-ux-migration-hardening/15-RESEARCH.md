# Phase 15: Export, UX Migration & Hardening — Research

**Researched:** 2026-06-09
**Domain:** CSV/XLSX export client-side, CSV/Excel formula-injection sanitization (SEC), Next.js App Router UX migration
**Confidence:** HIGH

## Summary

Esta fase tem três frentes, e a maior surpresa da investigação é que **duas das três já estão majoritariamente prontas** no código atual — o trabalho real concentra-se no export sanitizado (EXP-01, EXP-02, SEC-04).

1. **Export CSV/XLSX (EXP-01, EXP-02, SEC-04):** trabalho greenfield. Não existe nenhuma utilidade de export ou de escape no código (`csv-parse` é apenas leitura; o uso atual de `xlsx` é só `XLSX.read`). É preciso escrever um sanitizador de injeção de fórmula (regra OWASP canônica) e dois geradores de arquivo client-side a partir do estado do grid. A lib `xlsx@0.18.5` já está instalada [VERIFIED: apps/web/node_modules/xlsx/package.json] — sem deps novas.

2. **Fixture fallback do table generator:** **já implementado**. `buildTableSpec` em `apps/web/src/server/ai/table-clarifier.ts:248` já retorna uma `TableSpecPayload` determinística quando `OPENAI_API_KEY` está ausente (linhas 254-282). O critério "table generator tem fixture fallback para dev/test" já está satisfeito — a fase só precisa **verificar/testar** isso, não construir.

3. **UX migration (success criterion 3):** **parcialmente feita**. O root `/workspace` já monta `UnifiedChatTool` (`apps/web/src/app/(workspace)/workspace/page.tsx`) — Phase 12 migrou o default. O que **falta** é o critério "o ToolNav por aba não aparece na rota raiz": hoje o `UnifiedChatTool` renderiza `<ToolNav />` via prop `bottomNav` na linha 455. A migração restante é remover/condicionar o ToolNav na raiz mantendo cada tool acessível por deep link (as rotas `/workspace/sql`, `/workspace/regex` etc. já existem) ou por sidebar.

**Primary recommendation:** Escrever uma única utilidade pura `table-export.ts` (sanitizador + buildCsv + buildXlsx + triggerDownload) testável sem React, plugá-la num botão "Exportar" no slot já reservado do `TableGridPanel` (linha 446-447: `{/* Slot reservado para export Phase 15 */}`), e fazer uma edição cirúrgica de UX para tirar o `ToolNav` da raiz. Fixture já existe — apenas cobrir com teste.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Sanitização de injeção de fórmula (SEC-04) | Browser/Client | — | Export é 100% client-side a partir do estado efêmero do grid; nenhum dado vai ao servidor (decisão de privacidade v2.0) |
| Geração de arquivo CSV | Browser/Client | — | Os dados vivem no `historyState` do `TableGridPanel` (React state), nunca persistidos |
| Geração de arquivo XLSX | Browser/Client | — | `xlsx` roda no browser via `XLSX.writeFile`/`write`; dados são o grid efêmero |
| Trigger de download | Browser/Client | — | `Blob` + `URL.createObjectURL` ou `XLSX.writeFile` (DOM-only) |
| Migração do default `/workspace` | Frontend Server (SSR) | Browser | A page server-component já monta `UnifiedChatTool`; remoção do ToolNav é decisão de render no client |
| Fixture fallback do gerador de tabela | API/Backend | — | `buildTableSpec` é server-only (`table-clarifier.ts`); fixture já guardado por `!process.env.OPENAI_API_KEY` |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXP-01 | Usuário pode exportar a tabela para CSV | Estado do grid em `TableGridPanel.historyState.present.{rows,columns}`; CSV gerado client-side de `displayRows` (com fórmulas calculadas) + `Blob` download. Slot de botão já reservado (table-grid-panel.tsx:446) |
| EXP-02 | Usuário pode exportar a tabela para XLSX reusando `xlsx` já instalada | `xlsx@0.18.5` confirmada instalada; `XLSX.utils.aoa_to_sheet` com cell-objects `{t:"s"}` + `XLSX.writeFile(wb, name)` força download. Sem deps novas |
| SEC-04 | Sanitização de injeção de fórmula: prefixo `'` em células iniciadas por `=`,`+`,`-`,`@`,`\t`,`\r`; células editadas gravadas como texto (`t:"s"`) no XLSX | Regra OWASP canônica documentada abaixo; função pura `sanitizeCellForExport`; no XLSX, escrever todas as células de dados como `{t:"s", v:string}` (nunca como fórmula) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `xlsx` (SheetJS CE) | 0.18.5 | Gerar workbook XLSX e disparar download no browser | Já instalada e já usada para `read` no projeto [VERIFIED: apps/web/package.json + node_modules]. Restrição explícita do critério: "sem dependências novas além da lib `xlsx`" |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (nenhuma) | — | CSV é gerado com `String`/`Array.join` puro + `Blob` nativo | CSV não precisa de lib — RFC 4180 quoting é trivial e a sanitização é a parte sensível |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `xlsx` para CSV também | `XLSX.utils.sheet_to_csv` | Funciona, mas **não** aplica a sanitização de injeção — geraria CSV vulnerável. Preferir CSV manual onde controlamos o escape célula a célula |
| `Blob` + `createObjectURL` manual | `XLSX.writeFile(wb, name)` | Para XLSX, `writeFile` já dispara o download no browser (DOM-only, sem fs). Para CSV manual, usar `Blob`. Os dois caminhos coexistem |

**Installation:**
```bash
# Nenhuma instalação necessária — xlsx@0.18.5 já presente.
# pnpm (NÃO npm). Caso fosse necessário: pnpm add <pkg> --filter web
```

**Version verification:**
```
xlsx → 0.18.5 [VERIFIED: apps/web/node_modules/xlsx/package.json, "version":"0.18.5"]
```
> ⚠️ Nota de segurança de supply-chain: `xlsx@0.18.5` é a última versão publicada no **npm registry** pela SheetJS antes de eles moverem distribuição para o CDN próprio (`cdn.sheetjs.com`). Há CVEs conhecidos (ReDoS / prototype-pollution) em versões ≤0.18.5 que **só afetam o caminho de parsing/`read`** (já em uso no projeto, fora do escopo desta fase). O caminho de **escrita** desta fase (`aoa_to_sheet`/`writeFile`) não é afetado por esses CVEs. Como a restrição do critério proíbe deps novas, **manter 0.18.5** é a decisão correta; qualquer upgrade para a linha CDN é deferido. [ASSUMED — CVE applicability to write path]

## Package Legitimacy Audit

> Nenhum pacote novo é instalado nesta fase. A única dependência runtime (`xlsx`) já está no `package.json` e em `node_modules`.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `xlsx` | npm | already installed (0.18.5) | — | github.com/SheetJS/sheetjs | n/a (pré-instalada) | Approved (no install) |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*Esta fase não instala pacotes; o gate de legitimidade não se aplica (nenhum `pnpm add`).*

## Architecture Patterns

### System Architecture Diagram

```
                        TableGridPanel (client)
                        historyState.present
                       ┌──────────────────────┐
   user edits cells →  │ rows: RowData[]       │
                       │ columns: TableColumn[]│
                       └──────────┬───────────┘
                                  │ (current, user-edited state)
                                  ▼
                useFormulaEngine(rows, columns, sep)
                                  │ displayRows (fórmulas calculadas)
                                  ▼
            ┌─────────────────────────────────────────┐
            │  table-export.ts  (pura, module-scope)   │
            │                                          │
   "Export  │  sanitizeCellForExport(value) ──┐        │
    CSV" →  │  buildCsv(columns, rows) ───────┼─→ Blob │→ download .csv
            │                                 │        │
   "Export  │  buildXlsx(columns, rows):      │        │
    XLSX"→  │    cells = {t:"s", v:sanitized} │        │
            │    aoa_to_sheet → book_new      └─→ wb   │→ XLSX.writeFile() download .xlsx
            └─────────────────────────────────────────┘

   Sanitization decision point per cell:
     value starts with = + - @ \t \r  →  prefix with '   (single quote)
     otherwise                         →  value unchanged
   XLSX additional: ALL data cells written as t:"s" (string) — never t:"n"+formula
```

A regra de qual estado exportar (rows brutos vs `displayRows` calculados) é uma decisão a confirmar — ver Open Questions Q1. Recomendação: exportar `displayRows` (valores calculados visíveis), pois é o que o usuário vê; mas como **valores literais de texto**, nunca como fórmula.

### Recommended Project Structure
```
apps/web/src/features/unified-chat/
├── lib/
│   └── table-export.ts          # NOVO — sanitizeCellForExport, buildCsv, buildXlsx, downloadBlob (puro/testável)
├── components/
│   └── table-grid-panel.tsx     # EDIT — adicionar botões "Exportar CSV/XLSX" no slot já reservado (linha 446)
apps/web/tests/
└── table-export.test.ts         # NOVO — Wave 0: cobre sanitização + estrutura CSV/XLSX
```

### Pattern 1: Sanitização de injeção de fórmula (OWASP canônica)
**What:** Antes de gravar qualquer célula em CSV ou XLSX, prefixar com `'` (aspa simples) toda célula cujo **primeiro caractere** seja perigoso.
**When to use:** Em TODA célula de export, CSV e XLSX, valores texto e numéricos coagidos a string.
**Example:**
```typescript
// Source: OWASP CSV Injection — https://owasp.org/www-community/attacks/CSV_Injection [CITED]
// Caracteres que iniciam fórmula: = + - @ TAB(0x09) CR(0x0D) LF(0x0A)
const DANGEROUS_LEAD = /^[=+\-@\t\r\n]/;

export function sanitizeCellForExport(value: string | number): string {
  const s = String(value ?? "");
  return DANGEROUS_LEAD.test(s) ? `'${s}` : s;
}
```
> O critério da fase lista `=`, `+`, `-`, `@`, `\t`, `\r`. OWASP adiciona `\n` (LF) e variantes full-width (`＝＋－＠`). Recomendação: incluir `\n` (custo zero, fecha o gap). Variantes full-width são edge-case de locale japonês — **fora do escopo brasileiro**, deixar documentado mas não bloquear [ASSUMED — full-width não é vetor relevante para usuário pt-BR].

### Pattern 2: CSV com quoting RFC 4180 + sanitização
**What:** Gerar CSV manualmente (não via `sheet_to_csv`) para controlar o escape célula a célula.
**Example:**
```typescript
function csvField(raw: string): string {
  const sanitized = sanitizeCellForExport(raw);
  // RFC 4180: aspas, vírgula, ; ou newline → envolver em aspas e duplicar aspas internas
  if (/[",;\r\n]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}
// linha = columns.map(c => csvField(displayValue(row, c))).join(",")  (ou ";" — ver Q2)
// arquivo: prefixar BOM "\uFEFF" para Excel abrir UTF-8 corretamente (acentos pt-BR)
```
> ⚠️ **BOM UTF-8:** Sem `\uFEFF` no início, o Excel (locale pt-BR) abre o CSV em Windows-1252 e quebra acentos ("Descrição" → "DescriÃ§Ã£o"). Adicionar BOM. [CITED: prática padrão Excel/UTF-8]

### Pattern 3: XLSX com células forçadas a texto (SEC-04 — `t:"s"`)
**What:** Toda célula de dados é escrita como cell-object string `{t:"s", v}`, nunca deixada o SheetJS inferir tipo (que poderia tratar `=...` como fórmula).
**Example:**
```typescript
// Source: SheetJS Cell Objects — https://docs.sheetjs.com/docs/csf/cell/ [CITED]
// t:"s" = String type, "Values are explicitly stored as text"
import * as XLSX from "xlsx";

export function buildXlsx(columns, rows): XLSX.WorkBook {
  const header = columns.map((c) => ({ t: "s", v: c.name }));
  const body = rows.map((row) =>
    columns.map((c) => ({ t: "s", v: sanitizeCellForExport(displayValue(row, c)) }))
  );
  const aoa = [header, ...body];
  const ws = XLSX.utils.aoa_to_sheet(aoa);      // aceita cell-objects em vez de valores brutos
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tabela");
  return wb;
}
// Download no browser (DOM-only, sem fs):
XLSX.writeFile(buildXlsx(cols, rows), `${slug}.xlsx`);  // força client-side download
```
> A chave de SEC-04 é o cell-object `{t:"s"}`: força tipo string explícito. `aoa_to_sheet` "will accept cell objects in lieu of values". Assim uma célula `=SOMA(...)` editada pelo usuário vira o **texto literal** `'=SOMA(...)` e nunca uma fórmula viva no Excel. [CITED: SheetJS docs]

### Anti-Patterns to Avoid
- **Usar `XLSX.utils.sheet_to_csv` ou `json_to_sheet` cru para o export:** infere tipos e pode escrever `=...` como fórmula; não aplica sanitização. Use cell-objects `{t:"s"}` + CSV manual.
- **Checar apenas o primeiro caractere e ignorar separador/aspas:** OWASP alerta que atacante pode injetar um separador para iniciar nova célula com caractere perigoso no meio do input. O quoting RFC 4180 + sanitização por célula (não por linha) cobre isso.
- **Exportar `rows` brutos com templates de fórmula `=SOMA(C{row};-D{row})`:** o template literal vazaria como texto sem sentido. Exportar `displayRows` (já calculados pelo `useFormulaEngine`).
- **Esquecer o BOM UTF-8 no CSV:** quebra acentos no Excel pt-BR.
- **Renderizar o ToolNav na raiz e também na sidebar:** duplicação; o critério pede ToolNav fora da raiz mas tools acessíveis por deep link/sidebar.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Geração de binário XLSX (ZIP/OOXML) | Serializador OOXML próprio | `xlsx` (`aoa_to_sheet` + `writeFile`) | Formato OOXML é ZIP+XML complexo; a lib já está instalada |
| Trigger de download no browser | `<a download>` manual com cliques sintéticos para XLSX | `XLSX.writeFile(wb, name)` | A lib já faz o `Blob`+anchor internamente para XLSX |
| Fixture do gerador de tabela | Novo fixture | `buildTableSpec` já tem fixture (table-clarifier.ts:254) | **Já existe** — só testar |
| Parsing/quoting RFC 4180 de CSV | nada — é trivial | função própria de ~10 linhas | Aqui hand-roll É a escolha certa: precisamos do controle de sanitização por célula que libs de CSV não dão |

**Key insight:** O único "não hand-roll" forte é o binário XLSX. CSV deve ser hand-rolled de propósito, porque a sanitização SEC-04 exige controle por célula que `sheet_to_csv` não oferece.

## Runtime State Inventory

> Aplicável porque há uma migração de UX (success criterion 3) que mexe em rota default e navegação.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Nenhum — a tabela é estado efêmero do grid (`historyState` em React, nunca persistido). `TableSpecPayload` é persistido em `ConversationExchange.assistantPayload`, mas o export lê o estado vivo do grid, não o banco. | None — verificado em STATE.md (decisão "grid state efêmero") e table-grid-panel.tsx |
| Live service config | Nenhum — export é 100% client-side, nenhum endpoint novo, nenhuma config de serviço externo | None — verificado: nenhuma rota `/api` nova necessária |
| OS-registered state | Nenhum — sem cron, sem task scheduler, sem processo de background | None — N/A para mudança client-side |
| Secrets/env vars | `OPENAI_API_KEY` — **lida** pelo fixture fallback (`!process.env.OPENAI_API_KEY` em table-clarifier.ts). A fase NÃO renomeia nem altera essa var; apenas confirma o comportamento de fallback. | None — apenas testar o branch já existente |
| Build artifacts | Nenhum pacote novo instalado → nenhum egg-info/lockfile change relevante além de possível ajuste se algo for adicionado (não será) | None |

**Verificação de migração de UX:** A rota default `/workspace` **já** aponta para `UnifiedChatTool` desde Phase 12 (workspace/page.tsx). As páginas por-tool (`/workspace/sql`, `/workspace/regex`, `/workspace/scripts`, `/workspace/templates`, `/workspace/file-analysis`, `/workspace/ocr`) **continuam existindo** no filesystem do App Router — deep links preservados sem ação. A única mudança runtime é remover `<ToolNav />` da renderização da raiz.

## Common Pitfalls

### Pitfall 1: Excel ignora aspa simples ao reabrir / re-salvar CSV
**What goes wrong:** OWASP documenta que o Excel pode remover o prefixo `'` ou aspas ao salvar e reabrir o CSV, reativando a fórmula.
**Why it happens:** Comportamento do importador do Excel, fora do nosso controle.
**How to avoid:** Para CSV, o prefixo `'` é o mitigation aceito e é o que o critério pede explicitamente. Para XLSX (formato nativo), o `t:"s"` é **confiável** — a célula é tipada como string no OOXML e o Excel respeita. Documentar que CSV tem essa limitação conhecida; XLSX é o caminho robusto.
**Warning signs:** Teste manual: editar célula com `=1+1`, exportar, reabrir no Excel/Sheets, confirmar que aparece o texto `'=1+1` (ou `=1+1` como texto), não o resultado `2`.

### Pitfall 2: Acentos pt-BR quebrados no CSV (encoding)
**What goes wrong:** "Categoria" → "Categoria" vira mojibake no Excel.
**Why it happens:** Excel pt-BR assume Windows-1252 quando não há BOM.
**How to avoid:** Prefixar o conteúdo CSV com `\uFEFF` (BOM UTF-8) e gerar o Blob com `type: "text/csv;charset=utf-8"`.
**Warning signs:** Coluna "Descrição" exibe `DescriÃ§Ã£o`.

### Pitfall 3: Exportar template de fórmula em vez do valor calculado
**What goes wrong:** Célula da coluna "Total" exporta o texto `=SOMA(C{row};-D{row})` literal com `{row}` não substituído.
**Why it happens:** O estado canônico (`historyState.present.rows`) guarda templates; só `displayRows` (de `useFormulaEngine`) tem o valor calculado.
**How to avoid:** O export deve receber `displayRows`, não `rows`. O `TableGridPanel` já computa `displayRows` (linha 121) — passar isso para o exporter.
**Warning signs:** Coluna de fórmula exibe `{row}` no arquivo exportado.

### Pitfall 4: `XLSX.writeFile` em ambiente não-browser (SSR/teste)
**What goes wrong:** `writeFile` espera DOM; chamado em Node/SSR lança erro ou tenta escrever no fs.
**Why it happens:** `TableGridPanel` é `"use client"`, mas testes rodam em jsdom.
**How to avoid:** Manter `buildXlsx` (puro, retorna WorkBook) separado de `XLSX.writeFile` (efeito DOM). Testar `buildXlsx` + a sanitização; o trigger de download é testado por smoke manual ou mock de `writeFile`.
**Warning signs:** Teste de export falha por `document is not defined` ou tenta gravar arquivo real.

### Pitfall 5: ToolNav some por completo (regressão de navegação)
**What goes wrong:** Ao remover `<ToolNav />` da raiz, os tools ficam inacessíveis se não houver sidebar/deep-link alternativo.
**Why it happens:** O ToolNav é hoje a única navegação visível entre tools.
**How to avoid:** Confirmar que existe outro ponto de acesso (sidebar no `WorkspaceShell`/Topbar, ou deep links). UNI-07 já dizia "páginas por-tool permanecem acessíveis". Decidir o mecanismo antes de remover — ver Open Questions Q3.
**Warning signs:** Após a mudança, não há como chegar em `/workspace/sql` pela UI.

## Code Examples

### Download de CSV via Blob (browser)
```typescript
// Padrão browser nativo — sem libs
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Acessar o estado atual (user-edited) do grid para export
```typescript
// Dentro de TableGridPanel — o estado canônico vivo:
//   historyState.present.rows      → RowData[] com edições do usuário (templates de fórmula)
//   historyState.present.columns   → TableColumn[]
//   displayRows (já derivado, l.121)→ RowData[] com fórmulas CALCULADAS  ← exportar este
// O botão fica no slot já reservado:  table-grid-panel.tsx:446-447
//   {/* Slot reservado para export Phase 15 */}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Export server-side com geração de arquivo no backend | Export 100% client-side do estado efêmero | decisão v2.0 (privacidade) | Nenhum dado de tabela vai ao servidor; export é puro browser |
| `xlsx` distribuído via npm | SheetJS migrou para CDN próprio pós-0.18.5 | ~2023 | Projeto fixa 0.18.5 do npm; restrição da fase proíbe upgrade |

**Deprecated/outdated:**
- `XLSX.write(wb, {type:"binary"})` + manual atob: substituído por `XLSX.writeFile` que já faz o download no browser.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Variantes full-width (`＝＋－＠`) não são vetor relevante para usuário pt-BR; podem ficar fora do regex | Pattern 1 | Baixo — usuário brasileiro raramente cola full-width; se necessário, adicionar ao regex é trivial |
| A2 | Os CVEs conhecidos de `xlsx@0.18.5` afetam só o caminho de `read`/parse, não `write` | Standard Stack | Médio — se um CVE afetar o write, ainda assim a restrição da fase proíbe deps novas; documentar e aceitar |
| A3 | Exportar `displayRows` (calculado) é o comportamento desejado, não os templates brutos | Pattern/Pitfall 3 | Médio — decisão de produto; confirmar em discuss (Q1) |
| A4 | Existe um mecanismo de navegação alternativo (sidebar/deep-link) para os tools quando o ToolNav sair da raiz | Pitfall 5 / UX | Médio — se não houver, remover ToolNav regride navegação (Q3) |

## Open Questions (RESOLVED)

Todas resolvidas no plan-phase decision pass (2026-06-09) — ver `15-CONTEXT.md` "Implementation Decisions".

1. **Exportar valores calculados ou templates de fórmula?** **(RESOLVED → `displayRows`)**
   - What we know: `historyState.present.rows` tem templates (`=SOMA(C{row};-D{row})`); `displayRows` tem valores calculados.
   - Decision: Exportar `displayRows` (valores calculados, como string sanitizada). É o que o usuário vê na tela e o XLSX `t:"s"` garante que vira texto, não fórmula. [CONTEXT: Export — conteúdo]

2. **Separador do CSV: `,` ou `;`?** **(RESOLVED → `;` + BOM UTF-8)**
   - What we know: Excel em locale pt-BR usa `;` como separador de lista (decimal é `,`). O critério LOC-02 já fixou `;` para fórmulas.
   - Decision: Usar `;` como delimitador do CSV (com BOM UTF-8) para abrir corretamente no Excel pt-BR; quotar campos que contenham `;`. [CONTEXT: Export — formato CSV]

3. **Mecanismo de acesso aos tools após remover ToolNav da raiz.** **(RESOLVED → montar a Sidebar existente)**
   - What we know: UNI-07 exige tools acessíveis; rotas por-tool já existem; ToolNav hoje é renderizado dentro do `UnifiedChatTool` (bottomNav).
   - Decision: Reusar a `Sidebar` já existente (`components/app/sidebar.tsx`, hoje não montada) montando-a no `workspace/layout.tsx` como pré-requisito de remover o ToolNav da raiz — evita regressão de navegação. Deep links continuam válidos. [CONTEXT: UX migration; Plan 15-03]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `xlsx` | EXP-02, SEC-04 | ✓ | 0.18.5 | — (restrição proíbe deps novas) |
| `vitest` + jsdom | testes de export/sanitização | ✓ | configurado (vitest.config.ts, environment jsdom) | — |
| Browser DOM (`Blob`, `URL`, `<a download>`) | trigger de download | ✓ (client component) | — | XLSX.writeFile cobre XLSX |
| `pnpm` | gerenciador (não npm) | ✓ | workspace `@tabelin/shared` via `workspace:*` | — |

**Missing dependencies with no fallback:** Nenhuma.
**Missing dependencies with fallback:** Nenhuma — tudo presente.

## Validation Architecture

> nyquist_validation = true (config.json). Seção incluída.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (environment jsdom, globals) |
| Config file | `apps/web/vitest.config.ts` |
| Quick run command | `pnpm --filter web test -- table-export` |
| Full suite command | `pnpm --filter web test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-04 | Célula iniciada por `=`,`+`,`-`,`@`,`\t`,`\r` recebe prefixo `'` | unit | `pnpm --filter web test -- table-export` | ❌ Wave 0 |
| SEC-04 | Célula "normal" (não perigosa) NÃO é alterada | unit | idem | ❌ Wave 0 |
| SEC-04 | No XLSX, células de dados são cell-objects `{t:"s"}` (string), nunca fórmula | unit | idem (assert sobre `aoa_to_sheet` output ou WorkBook cells) | ❌ Wave 0 |
| EXP-01 | `buildCsv` produz linha header + linhas com `;`, quoting RFC 4180, BOM | unit | idem | ❌ Wave 0 |
| EXP-01 | CSV exporta `displayRows` (valores calculados), não templates `{row}` | unit | idem | ❌ Wave 0 |
| EXP-02 | `buildXlsx` retorna WorkBook válido com 1 sheet "Tabela" e header correto | unit | idem | ❌ Wave 0 |
| EXP-01/02 | Botão "Exportar" aparece no toolbar do `TableGridPanel` e dispara handler | component (RTL) | `pnpm --filter web test -- table-grid-panel` | ✅ (test existe, estender) |
| SC-3 (UX) | `/workspace` raiz NÃO renderiza `ToolNav`; tools acessíveis por deep link | manual / e2e | smoke manual (e2e excluído do vitest run) | manual-only — justificar |
| Fixture | `buildTableSpec` retorna spec determinística sem `OPENAI_API_KEY` | unit (server) | `pnpm --filter web test -- table-clarifier` | ✅ já implementado, garantir cobertura |

### Sampling Rate
- **Per task commit:** `pnpm --filter web test -- table-export`
- **Per wave merge:** `pnpm --filter web test`
- **Phase gate:** Full suite verde + `pnpm --filter web typecheck` + `pnpm --filter web lint` antes de `/gsd:verify-work`. Verificação humana E2E: editar célula com `=1+1`, exportar CSV e XLSX, abrir no Excel/Sheets, confirmar texto literal (não cálculo) e acentos corretos.

### Wave 0 Gaps
- [ ] `apps/web/tests/table-export.test.ts` — cobre SEC-04 (sanitização), EXP-01 (CSV), EXP-02 (XLSX cell-objects)
- [ ] Estender `apps/web/tests/table-grid-panel.test.tsx` — botões de export no toolbar
- [ ] Confirmar cobertura existente de `table-clarifier.test.ts` para o branch fixture de `buildTableSpec`

*Framework já instalado; nenhuma instalação de framework necessária.*

## Security Domain

> security_enforcement = true, security_asvs_level = 1, security_block_on = high. Seção incluída.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Rota já autenticada no layout (`redirect("/sign-in")`); export não muda authz |
| V3 Session Management | no | Sem mudança de sessão |
| V4 Access Control | no | Export opera sobre dados que o próprio usuário gerou no client |
| V5 Input Validation / Output Encoding | **yes** | **SEC-04 é o núcleo da fase**: sanitização de injeção de fórmula no output (CSV/XLSX). `sanitizeCellForExport` + cell-objects `{t:"s"}`. `tableSpecPayloadSchema` (Zod) já valida o payload do gerador |
| V6 Cryptography | no | Nenhum dado sensível/cripto envolvido |

### Known Threat Patterns for {Next.js client export + Excel/CSV}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CSV/Excel formula injection (DDE/macro via `=`,`+`,`-`,`@`) | Tampering / Elevation of Privilege | Prefixo `'` em células perigosas (OWASP) + XLSX `t:"s"` força texto |
| Injeção via separador para iniciar nova célula com payload no meio | Tampering | Sanitização **por célula** + quoting RFC 4180 (não por linha) |
| XSS no conteúdo de célula (já mitigado em Phase 14) | Tampering | SEC-05 já garante `textContent`/sem `dangerouslySetInnerHTML`; export não reintroduz HTML |
| ReDoS/prototype-pollution em `xlsx` parse | DoS / Tampering | Fora do escopo da fase (caminho `read`); o caminho `write` desta fase não parseia input externo |

## Sources

### Primary (HIGH confidence)
- Codebase (`apps/web/src/...`) — grep/Read direto: `table-grid-panel.tsx`, `tool-nav.tsx`, `workspace/page.tsx`, `workspace/layout.tsx`, `use-formula-engine.ts`, `table-clarifier.ts`, `packages/shared/src/unified-chat/schema.ts`, `vitest.config.ts`, `package.json`, `node_modules/xlsx/package.json`
- OWASP CSV Injection — https://owasp.org/www-community/attacks/CSV_Injection — caracteres-gatilho e mitigation
- SheetJS Cell Objects — https://docs.sheetjs.com/docs/csf/cell/ — `t:"s"` String type, `aoa_to_sheet` aceita cell-objects
- SheetJS Write Options — https://docs.sheetjs.com/docs/api/write-options/ — `writeFile` força download no browser; `bookType:"xlsx"`

### Secondary (MEDIUM confidence)
- OWASP WSTG Testing for CSV Injection — https://owasp.org/www-project-web-security-testing-guide/...07-Input_Validation_Testing/21-Testing_for_CSV_Injection
- SheetJS issue #2633 "How to set cell as text type?" — github.com/SheetJS/sheetjs/issues/2633

### Tertiary (LOW confidence)
- Aplicabilidade exata dos CVEs de `xlsx@0.18.5` ao caminho write (A2) — não verificado em advisory específico

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `xlsx` confirmada instalada e já em uso; CSV nativo
- Architecture: HIGH — todos os arquivos mapeados por leitura direta; slot de export já existe no código
- Pitfalls: HIGH — OWASP + SheetJS docs + leitura do estado real do grid
- Fixture fallback: HIGH — código já existe (table-clarifier.ts:254), apenas testar
- UX migration: MEDIUM — default já migrado; mecanismo de sidebar/deep-link pós-remoção do ToolNav precisa de decisão (Q3)

**Research date:** 2026-06-09
**Valid until:** 2026-07-09 (stack estável; lib fixada em 0.18.5)
