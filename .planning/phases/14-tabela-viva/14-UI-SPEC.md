---
phase: 14
slug: tabela-viva
status: draft
shadcn_initialized: false
preset: none
created: 2026-06-09
---

# Phase 14 — UI Design Contract: Tabela Viva

> Contrato visual e de interação para o grid editável de planilha renderizado
> no thread de conversa unificado. Gerado por gsd-ui-researcher,
> verificado por gsd-ui-checker.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — CSS custom properties em `apps/web/src/styles/globals.css` |
| Preset | not applicable |
| Component library | none (componentes próprios com classes CSS semânticas) |
| Icon library | lucide-react (já em uso: `FileSpreadsheet`, `ChevronDown`, `Regex`, etc.) |
| Font | Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif |

**Fonte:** `apps/web/src/styles/globals.css` (body font-family e variáveis CSS) + análise direta do codebase.

**Grid library:** `react-datasheet-grid` v4.11.6 (MIT).
Import obrigatório: `import "react-datasheet-grid/dist/style.css"` no componente `"use client"` que importa o grid.
Os estilos base do DSG devem ser sobrepostos pelos tokens do projeto (ver seção Grid Theming Override).

**shadcn gate:** Não aplicável — projeto não usa Next.js + shadcn. CSS próprio em `globals.css`.

---

## Spacing Scale

Declarado (múltiplos de 4 — padrão já em uso no projeto):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gaps de ícone, padding inline de pill |
| sm | 8px | Espaçamento compacto entre elementos (output-header gap, metadata-row gap) |
| md | 16px | Padding padrão de card (`.assistant-card`: padding 16px), gaps de seção |
| lg | 24px | Padding de seção, topbar padding |
| xl | 32px | Auth panel padding, auth-panel margin |
| 2xl | 48px | Não usado nesta phase |
| 3xl | 64px | Não usado nesta phase |

**Exceções desta phase:**
- Célula do grid: padding interno 4px 8px (xs/sm) — ditado pela densidade de planilha, não pelo card.
- Toolbar do grid: padding 8px 12px (sm / entre sm e md) — compacto para não competir com o conteúdo.
- Altura mínima de linha de célula: 28px — mantém a grid densa como planilha, abaixo do min-height 36px dos ghost-buttons.
- Tooltip de erro de fórmula: padding 6px 8px.

**Fonte:** `globals.css` análise direta — padding 16px no `.assistant-card`, gap 8px no `.chat-exchange`, gap 20px no `.chat-thread`.

---

## Typography

| Role | Size | Weight | Line Height | Uso |
|------|------|--------|-------------|-----|
| Body | 14px | 400 (regular) | 1.5 | Texto de célula, mensagens do thread, copy de empty state |
| Label | 12px | 650 (semibold) | 1.4 | Cabeçalhos de coluna, output-header h2 (15px → ver abaixo), labels de toolbar, tooltip de erro |
| Heading (card) | 15px | 650 (semibold) | 1.25 | Título do `TableGridPanel` no `output-header h2` — padrão do projeto (`output-header h2: font-size: 15px`) |
| Small | 12px | 400 (regular) | 1.4 | Contadores de undo/redo (se exibidos), dica de teclado |

**Código de erro de fórmula inline na célula:** 12px, weight 400, cor `var(--destructive)`.

**Nota:** O projeto usa 4 tamanhos efetivos (12, 14, 15, 20px) com 2 pesos (400 e 650). Esta phase usa 3 dos 4: 12px, 14px, 15px.

**Fonte:** `globals.css` — `body: font-size: 14px; line-height: 1.5`, `.field label: font-size: 12px; font-weight: 650`, `.output-header h2: font-size: 15px`.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#f7f8fa` (`var(--background)`) | Background da workspace, fundo da área externa ao grid |
| Secondary (30%) | `#ffffff` (`var(--surface)`) | `.assistant-card` background, fundo interno do `TableGridPanel`, cabeçalho de coluna do grid |
| Accent (10%) | `#0b6b57` (`var(--primary)`) | Borda de célula selecionada, header de coluna ativo (sort), CTA "Gerar Tabela", focus ring |
| Destructive | `#b42318` (`var(--destructive)`) | Texto de código de erro de fórmula inline (`#NAME?`, `#REF!`, etc.), botão "Remover Coluna" no hover |

**Accent reservado para:**
1. Borda de célula com foco ativo (estado de edição) — `outline: 2px solid var(--primary)`
2. Indicador de sort ativo no cabeçalho de coluna (ícone de seta)
3. Botão primário "Gerar Tabela" (background `var(--primary)`, texto `#fff`)
4. Focus ring global (já definido em `globals.css`: `outline: 2px solid var(--primary)`)
5. Hover do `.ghost-button` (border-color `rgb(11 107 87 / 40%)`) — já existe

**Cores adicionais (semânticas, já definidas):**
- `var(--border)` `#d9dee5` — bordas do grid, linhas separadoras de célula, borda do `TableGridPanel`
- `var(--muted)` `#5e6a75` — texto de placeholder, copy secundário no empty state, dica de teclado
- `var(--text)` `#111827` — texto de célula (valor cru)
- `#fbfcfd` — fundo do `.output-box` — reusar como fundo das células não editadas (leitura)

**Grid theming override (DSG CSS variables):**
O `react-datasheet-grid` usa variáveis CSS próprias (prefixo `--dsg-*`). Sobrescrever no escopo do `.table-grid-panel` para alinhar com os tokens do projeto:

```css
.table-grid-panel {
  --dsg-cell-background-color: #ffffff;
  --dsg-cell-text-color: var(--text);
  --dsg-border-color: var(--border);
  --dsg-selection-border-color: var(--primary);
  --dsg-selection-background-color: rgb(11 107 87 / 8%);
  --dsg-header-active-color: var(--primary);
  --dsg-header-text-color: var(--text);
  --dsg-cell-disabled-background-color: #f8fafc;
  --dsg-scroll-shadow-color: rgb(15 23 42 / 8%);
  font-size: 14px;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
```

**Fonte:** `globals.css` — todas as variáveis CSS do projeto. RESEARCH.md (14-RESEARCH.md) Pattern 7 (render seguro) e Pattern 4/5/6 para estado do grid.

---

## Copywriting Contract

Todos os textos voltados ao usuário em pt-BR.

| Elemento | Texto |
|----------|-------|
| Título do card da grid (output-header h2) | `{payload.title}` — o título gerado pela IA é exibido diretamente |
| CTA primário (toolbar, geração confirmada) | "Gerar Tabela" — usado no `ConfirmationCard` existente (já: "Confirmar e Gerar") |
| Botão add linha | "+ Linha" |
| Botão add coluna | "+ Coluna" |
| Botão remover coluna (header, hover) | "Remover" |
| Sort asc (tooltip no ícone) | "Ordenar crescente" |
| Sort desc (tooltip no ícone) | "Ordenar decrescente" |
| Sort neutro (tooltip no ícone) | "Ordenar por esta coluna" |
| Undo (tooltip, Ctrl+Z) | "Desfazer (Ctrl+Z)" |
| Redo (tooltip, Ctrl+Y) | "Refazer (Ctrl+Y)" |
| Empty state heading (grid sem linhas após remoção) | "Tabela vazia" |
| Empty state body | "Adicione uma linha clicando em + Linha abaixo da tabela." |
| Erro de fórmula — código inline | `#NAME?` / `#REF!` / `#DIV/0!` / `#CIRC!` (estilo Excel — reconhecível pelo usuário BR) |
| Tooltip de `#NAME?` | "Função não reconhecida. Verifique o nome em português (ex.: SOMA, SE, PROCV)." |
| Tooltip de `#REF!` | "Referência de célula inválida ou fora dos limites da tabela." |
| Tooltip de `#DIV/0!` | "Divisão por zero. O divisor dessa fórmula resultou em zero." |
| Tooltip de `#CIRC!` | "Referência circular detectada. A fórmula referencia a própria célula." |
| Tooltip de `#ERRO!` (erro genérico) | "Erro ao calcular esta fórmula. Verifique os argumentos." |
| Estado de fórmula calculando (se > 100ms) | nenhum spinner — recálculo deve ser imperceptível (< 16ms em 200 linhas) |
| Aviso de limite de colunas atingido (26 colunas) | "Limite de 26 colunas atingido." — toast ou inline no botão "+ Coluna" (disabled + title) |
| Aviso de limite de linhas atingido (200 linhas) | "Limite de 200 linhas atingido." — botão "+ Linha" disabled + title |
| Espaço reservado para export (Phase 15) | Nenhum texto — área reservada visualmente à direita da toolbar com slot vazio |

**Confirmação de ação destrutiva:**
- **Remover coluna:** Sem dialog de confirmação — a ação é desfeita via Ctrl+Z (undo disponível). O botão "Remover" aparece apenas no hover do header da coluna, reduzindo clique acidental.
- **Remover linha:** Sem dialog de confirmação — botão de delete nativo do DSG (stickyRightColumn), desfazível via Ctrl+Z.

**Fonte:** CONTEXT.md D-05 (erros de fórmula), REQUIREMENTS.md TAB-03, TAB-04, TAB-06, análise dos componentes existentes.

---

## Interaction Contract

### TAB-01: Click-to-edit + navegação de teclado

- **Clique simples** em célula não-fórmula: entra em modo de edição (comportamento nativo do DSG).
- **Clique simples** em célula do tipo `"formula"`: célula é **read-only** — exibe valor calculado. Não entra em modo de edição (fórmulas são geradas pela IA; o usuário não edita a fórmula, apenas os dados de entrada).
- **Tab**: avança foco para próxima célula à direita; na última coluna da linha, move para a primeira célula da próxima linha.
- **Enter**: confirma edição e avança para a célula abaixo.
- **Shift+Tab**: recua para célula anterior.
- **Setas** (↑ ↓ ← →): navegação entre células em modo de seleção; em modo de edição, apenas movem o cursor dentro do texto.
- **Escape**: cancela edição em curso, restaura o valor anterior.
- **Backspace / Delete**: em célula selecionada (não em modo de edição), limpa o conteúdo.

**Fonte:** RESEARCH.md §Phase Requirements TAB-01 — "keyboard nav nativo" do DSG.

### TAB-02: Recálculo de fórmula ao vivo

- Recálculo ocorre via `useEffect([rows])` — deferred pelo React scheduler, não síncrono no `onChange`.
- Sem indicador de "calculando" para recálculos < 100ms (critério: imperceptível).
- Células do tipo `"formula"` exibem o resultado calculado em modo display. Durante a edição de uma célula de dados, as células de fórmula dependentes atualizam assim que o `onChange` do DSG dispara.
- **Valor de fórmula calculado** armazenado em `displayRows` (derivado), nunca em `rawRows` — previne Pitfall 2 (RESEARCH.md).

**Fonte:** RESEARCH.md Pattern 2, anti-pattern "Guardar displayRows ao invés de rawRows".

### TAB-03: Add/remove linhas e colunas

- **"+ Linha"**: botão na toolbar abaixo/dentro do grid. Adiciona linha no final. Comportamento nativo via `createRow` prop do DSG.
- **"+ Coluna"**: botão na toolbar. Adiciona coluna do tipo `"text"` ao final, com nome "Nova Coluna {n}". Desabilitado quando 26 colunas já presentes.
- **Remover linha**: ícone de X visível na `stickyRightColumn` nativa do DSG em cada linha.
- **Remover coluna**: botão "Remover" visível no hover do header da coluna. Confirmação: nenhuma (desfazível via Ctrl+Z).
- Todas as operações são registradas no history stack (undo/redo).

### TAB-04: Copy/paste e undo/redo

- **Ctrl+C / Ctrl+V**: copy/paste **nativo do DSG** — copia seleção em formato TSV (compatível com Excel/Sheets). Nenhuma implementação extra necessária.
- **Ctrl+X**: cut nativo do DSG.
- **Ctrl+Z**: undo via history stack com `useReducer` (implementação própria — não nativo no DSG). Cap de 50 entradas.
- **Ctrl+Y / Ctrl+Shift+Z**: redo.
- Undo/redo opera sobre o estado completo `{ rows, columns }` — inclui add/remove de linha/coluna.

**Fonte:** RESEARCH.md Pattern 4 (undo/redo), "Copy/paste nativo DSG".

### TAB-05: Sort por coluna

- **Clique no cabeçalho de coluna**: ciclo de estados — nenhum → asc → desc → nenhum.
- Indicador visual no header: ícone de seta (lucide-react `ArrowUp` / `ArrowDown` / ausente).
- Sort aplica `[...rows].sort(compareFn)` sobre os dados — nunca muta o estado diretamente (Pitfall 3).
- Colunas de fórmula são sortáveis pelos seus valores calculados.
- Sort state (`{ key, dir }`) é separado do history stack — desfazer não reverte o sort, apenas as edições de dado.

**Fonte:** RESEARCH.md Pattern 5 (sort), Pitfall 3.

### TAB-06: Virtualização 200 linhas × 26 colunas

- Limite rígido: 200 linhas, 26 colunas (A–Z).
- Botões "+ Linha" e "+ Coluna" ficam `disabled` ao atingir os limites, com `title` explicativo.
- Virtualização nativa via `react-datasheet-grid` v4 (`react-virtual` interno).
- Grid height: `height: min(600px, calc(100vh - 280px))` — não ultrapassa a viewport.
- `lockRows` prop não é usado — linhas são livremente editáveis.

### LOC-03: Formatação BR (display-only)

- **Células `type: "currency"`**: exibem `R$ 1.500,00` via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Edição opera sobre o número cru (ex.: `1500`).
- **Células `type: "date"`**: exibem `31/12/2025` via `Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })`. Edição opera sobre string ISO `"YYYY-MM-DD"`.
- **Células `type: "number"`**: sem formatação especial — exibem o número como string.
- **Células `type: "text"`**: exibem o valor cru como string.
- **Células `type: "formula"`**: exibem o resultado calculado com o formato do tipo da coluna (se currency → formata como BRL; se date → formata como data; senão → string).
- **Células com erro de fórmula**: exibem o código inline (`#NAME?`, etc.) na cor `var(--destructive)`, com tooltip pt-BR no hover.

### SEC-05: Render sem XSS

- Todo conteúdo de célula renderiza via React children (`{string}`) — nunca `dangerouslySetInnerHTML`.
- Tooltips de erro usam atributo `title` nativo ou componente React com `textContent`.
- Cabeçalhos de coluna renderizam via `{col.name}` — nunca innerHTML.
- `formatCellValue()` retorna `string` — nunca JSX com HTML arbitrário.

---

## Layout do `TableGridPanel`

O `TableGridPanel` é um card `.assistant-card` no thread de conversa. Estrutura interna:

```
┌─ .assistant-card (border: 1px solid var(--border), border-radius: 10px, background: var(--surface), padding: 16px) ─────────────────┐
│                                                                                                                                       │
│  ┌─ .output-header ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │  <h2>{payload.title}</h2>                                                      [slot vazio p/ export — Phase 15]                  │ │
│  └───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                                                       │
│  ┌─ .table-grid-toolbar ─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │  [+ Linha] [+ Coluna]                                                          [← espaço para export Phase 15 →]                  │ │
│  └───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                                                       │
│  ┌─ .table-grid-panel ───────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │  DynamicDataSheetGrid                                                                                                             │ │
│  │   • altura: min(600px, calc(100vh - 280px))                                                                                      │ │
│  │   • largura: 100% do card                                                                                                        │ │
│  │   • overflow-x: auto (scroll horizontal se > largura do card)                                                                    │ │
│  │   • cabeçalhos de coluna clicáveis para sort                                                                                     │ │
│  │   • stickyRightColumn: botão X de remoção de linha                                                                               │ │
│  └───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                                                       │
│  ┌─ .table-grid-footer (opcional, quando limites atingidos) ────────────────────────────────────────────────────────────────────────┐ │
│  │  [mensagem de limite ou vazio]                                                                                                    │ │
│  └───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### CSS Classes novas para esta phase

Adicionar em `globals.css` (seção "Grid editável"):

```css
/* ── Tabela Viva grid ───────────────────────────────────────────────── */

.table-grid-panel {
  /* DSG theming override — alinha com tokens do projeto */
  --dsg-cell-background-color: #ffffff;
  --dsg-cell-text-color: var(--text);
  --dsg-border-color: var(--border);
  --dsg-selection-border-color: var(--primary);
  --dsg-selection-background-color: rgb(11 107 87 / 8%);
  --dsg-header-active-color: var(--primary);
  --dsg-header-text-color: var(--text);
  --dsg-cell-disabled-background-color: #f8fafc;
  --dsg-scroll-shadow-color: rgb(15 23 42 / 8%);
  font-size: 14px;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 6px;
}

.table-grid-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0 12px;
}

.table-grid-toolbar-spacer {
  flex: 1;
}

/* Célula de fórmula — read-only, levemente diferenciada */
.cell-formula {
  background: #f8fafc;
  color: var(--text);
  font-style: italic;
}

/* Célula com erro de fórmula */
.cell-error {
  color: var(--destructive);
  font-size: 12px;
  cursor: help;
}

/* Cabeçalho de coluna sortável */
.col-header {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  font-weight: 650;
  font-size: 12px;
}

.col-header:hover {
  color: var(--primary);
}

.col-header[data-sort="asc"],
.col-header[data-sort="desc"] {
  color: var(--primary);
}

/* Botão de remoção de coluna — visível só no hover do header */
.col-header-remove {
  display: none;
  border: 0;
  background: none;
  color: var(--muted);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 11px;
  margin-left: auto;
}

.col-header:hover .col-header-remove {
  display: flex;
}

.col-header-remove:hover {
  color: var(--destructive);
  background: rgb(180 35 24 / 8%);
}
```

**Nota sobre `.cell-formula` (read-only):** O DSG v4 suporta colunas disabled/read-only via `disabled: () => true` na definição de coluna. Usar esta prop para colunas `type: "formula"` — não implementar cursor custom via CSS isolado.

---

## Fluxo de transição: ConfirmationCard → TableGridPanel

1. **Estado inicial:** `render-dispatcher` recebe `payload` com `kind: "table_spec"` e `rows` ausente ou vazio → renderiza `ConfirmationCard` (Phase 13, existente).
2. **Usuário confirma:** `onConfirm(editedSpec)` dispara `overrideGenerate = true` no `UnifiedChatTool`. O servidor chama `buildTableSpec` estendido (com `rows` e `formulaLanguage`).
3. **Servidor responde:** evento `complete` NDJSON carrega `table_spec` com `rows.length > 0`.
4. **Render-dispatcher detecta:** `rows && rows.length > 0` → renderiza `<TableGridPanel spec={payload} />`.
5. **Transição visual:** não há animação de transição — o card simplesmente muda de `ConfirmationCard` para `TableGridPanel` no mesmo slot do thread. A ausência de animação é intencional (consistente com o padrão dos outros cards do thread).

**Detecção no render-dispatcher (contrato de implementação):**
```
case "table_spec":
  if (payload.rows && payload.rows.length > 0) → <TableGridPanel>
  else → <ConfirmationCard>
```

---

## Estados e feedback visual

| Estado | Visual |
|--------|--------|
| Grid carregado com dados (normal) | Células com fundo `#ffffff`, bordas `var(--border)`, texto `var(--text)` |
| Célula com foco (editável) | Borda `2px solid var(--primary)` (nativo DSG via `--dsg-selection-border-color`) |
| Célula em edição | Background branco, cursor de texto, sem background colorido |
| Seleção de range | Background `rgb(11 107 87 / 8%)` (nativo DSG via `--dsg-selection-background-color`) |
| Célula de fórmula (read-only) | Background `#f8fafc`, texto em itálico, cursor `default` |
| Célula com erro de fórmula | Texto `var(--destructive)`, fonte 12px, cursor `help`, tooltip no hover |
| Coluna com sort ativo | Ícone de seta (lucide `ArrowUp`/`ArrowDown`) na cor `var(--primary)` |
| Botão "+ Linha" / "+ Coluna" disabled | `opacity: 0.4; cursor: not-allowed` + `title` com mensagem de limite |
| Grid vazio (zero linhas) | Linha de fundo vazia do DSG + mensagem `.unified-empty-state` abaixo do grid |

---

## Acessibilidade

- `<div className="assistant-card" aria-label="Tabela: {payload.title}">` — label descreve o conteúdo do card.
- Botões da toolbar com `aria-label` explícito: `"Adicionar linha"`, `"Adicionar coluna"`.
- Botão de remoção de coluna: `aria-label="Remover coluna {col.name}"`.
- `stickyRightColumn` de remoção de linha: `aria-label="Remover linha {n}"`.
- Células de erro: `title="{tooltip em pt-BR}"` para leitores de tela.
- Focus ring: herda `outline: 2px solid var(--primary); outline-offset: 2px` definido globalmente em `globals.css`.
- DSG usa `role="grid"` internamente — não sobrescrever.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable — projeto não usa shadcn |
| npm — `react-datasheet-grid@4.11.6` | MIT, fonte primária do grid | Verificado: histórico 5,5 anos, repo público ativo, sem postinstall script — RESEARCH.md §Package Legitimacy Audit |
| npm — `@formulajs/formulajs@4.6.0` | MIT, funções de fórmula | Verificado: histórico 6,2 anos, fork comunitário do Handsontable formulajs, sem postinstall script — RESEARCH.md §Package Legitimacy Audit |

**Registro de segurança de terceiros:** Ambas as bibliotecas verificadas via inspeção direta de pacote npm em 2026-06-09 (RESEARCH.md). Nenhum `postinstall` detectado. Nenhum padrão suspeito (fetch externo, eval, process.env). Classificação: **view passed — no flags — 2026-06-09**.

---

## Fora de escopo desta phase (não especificar)

- Botões "Exportar CSV" / "Exportar XLSX" — **Phase 15** (EXP-01, EXP-02, SEC-04). Reservar slot visual (`table-grid-toolbar-spacer`) mas não implementar.
- Migração do ToolNav — **Phase 15**.
- AutoFiltro (dropdown por coluna), edição retroativa via chat, language pack completo (100+ funções) — **v2.1/v2.x**.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

---

## Pre-Population Sources

| Fonte | Decisões incorporadas |
|-------|----------------------|
| `14-CONTEXT.md` | 8 (D-01..D-08: origem do conteúdo, motor, separadores BR, erros de fórmula, formatação, segurança, persistência, grid library) |
| `14-RESEARCH.md` | 8 (Standard Stack, Patterns 1–8, Anti-Patterns, Grid theming, DSG CSS variables, pitfalls) |
| `12-CONTEXT.md` | 3 (light theme, chat-thread layout, assistant-card pattern) |
| `globals.css` (codebase direto) | 12 (todas as variáveis CSS, classes existentes, spacing, typography, button styles) |
| `confirmation-card.tsx`, `clarification-card.tsx`, `render-dispatcher.tsx` (codebase direto) | 4 (padrão de card, ghost-button, output-box, fluxo de confirmação) |
| REQUIREMENTS.md | 10 (TAB-01..06, LOC-01..03, SEC-05) |
| Input do usuário (esta sessão) | 0 — todo o contrato pré-populado de artefatos upstream |
