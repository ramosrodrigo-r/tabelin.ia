---
phase: 260617-ukf-crie-as-funcoes-da-toolbar-da-planilha-q
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/features/unified-chat/components/table-grid-panel.tsx
  - apps/web/src/styles/globals.css
  - apps/web/tests/table-grid-panel.test.tsx
autonomous: true
requirements: [TOOLBAR-01, TOOLBAR-02, TOOLBAR-03, TOOLBAR-04, TOOLBAR-05]

must_haves:
  truths:
    - "Clicar em qualquer botão antes desabilitado (Ordenar, Agrupar, Compartilhar, Pintura, Zoom, Moeda, Percentual, decimais, Fonte, Tamanho, Negrito, Itálico, Tachado, Cor do texto, Preenchimento, Bordas, Mesclar, Alinhar, Funções) produz um efeito real e observável na UI — nenhum permanece `disabled` ou vira só toast/console.log"
    - "Selecionar uma célula e aplicar negrito/itálico/tachado/cor/preenchimento/borda/alinhamento altera o estilo visual exatamente daquela célula, e persiste ao navegar para outra célula"
    - "Zoom aplica escala visual real à grade (75/100/125/150%) via dropdown funcional"
    - "Sigma insere um template de fórmula (ex. =SOMA()) na célula ativa, usando o motor de fórmulas existente"
    - "Mesclar células concatena o conteúdo de células adjacentes selecionadas na primeira e limpa as demais (comportamento real, não decorativo)"
    - "Ordenar abre um menu real de escolha de coluna+direção que aciona o sort já existente (handleSortClick/setSortState)"
    - "Agrupar agrupa visualmente linhas adjacentes com valor igual numa coluna escolhida, com separador/cabeçalho de grupo"
    - "Compartilhar abre um diálogo real que oferece copiar a tabela como texto para a área de transferência (e Web Share API quando suportado)"
    - "Nenhuma funcionalidade já existente (Filtrar, Colunas, Nova/Exemplo/Importar, Linha/Coluna, CSV/XLSX, Undo/Redo, sort por cabeçalho) regride"
  artifacts:
    - path: "apps/web/src/features/unified-chat/components/table-grid-panel.tsx"
      provides: "Toolbar de formatação e utilitários totalmente funcional, modelo de estilo por célula, active cell tracking, todos os menus/diálogos novos"
    - path: "apps/web/src/styles/globals.css"
      provides: "Estilos para os novos menus/dropdowns/diálogos (sort menu, group menu, share dialog, font/size/zoom dropdowns, color picker, formatting toolbar active states)"
    - path: "apps/web/tests/table-grid-panel.test.tsx"
      provides: "Cobertura automatizada para os novos comportamentos (estilo de célula, zoom, sigma, sort menu, share dialog)"
  key_links:
    - from: "format-btn (Bold/Italic/etc.)"
      to: "cellStyles state + dsgColumns component renderer"
      via: "onClick aplica estilo na activeCell; renderer lê cellStyles[`${rowIndex}:${colKey}`] e aplica inline style"
      pattern: "cellStyles\\[.*rowIndex.*colKey"
    - from: "Sigma button"
      to: "useFormulaEngine / dispatch SET"
      via: "insere '=SOMA()' no valor bruto da activeCell via dispatch"
      pattern: "SOMA\\(\\)"
    - from: "Ordenar button"
      to: "handleSortClick/setSortState"
      via: "menu de sort chama setSortState diretamente com key+dir escolhidos"
      pattern: "setSortState"
---

<objective>
Tornar funcional TODO botão da toolbar da planilha (`table-grid-panel.tsx`) que hoje está `disabled`/decorativo ("em breve"), sem exceção: Ordenar, Agrupar, Compartilhar, Pintura (format painter), Zoom, Moeda, Percentual, decimais (+/-), Fonte, Tamanho, Negrito, Itálico, Tachado, Cor do texto, Preenchimento, Bordas, Mesclar, Alinhar, Funções (Sigma).

Purpose: o usuário relatou que a toolbar inteira está "sem clique" — botões existem visualmente mas não fazem nada. Isso quebra a promessa central do produto ("planilha viva"): uma planilha que parece pronta mas não responde a interação é peor que não ter a toolbar.

Output: `table-grid-panel.tsx` com um modelo de estilo por célula (`cellStyles`), rastreamento de célula ativa, todos os 19 botões hoje desabilitados convertidos em ações reais e observáveis, CSS de suporte em `globals.css`, e testes automatizados cobrindo os comportamentos novos mais críticos.

**Decisão de escopo (documentar, não esconder):** `cellStyles` (e os novos estados de zoom/fonte/tamanho/grupo) vivem em `useState` LOCAL ao componente `TableGridPanel` — não entram no `historyReducer` (undo/redo) nem no `WorkspaceStateContext`/auto-save. Justificativa: nenhuma fonte (CONTEXT/ROADMAP/RESEARCH) exige que formatação visual sobreviva a reload ou undo; persistir isso exigiria migrar `WorkspaceStateContext` + `GridState` + schema `@tabelin/shared` + auto-save, o que é uma mudança de armazenamento de dados fora do pedido ("crie as funções", não "persista estilos"). Os dados (`rows`/`columns`/fórmulas) continuam 100% no fluxo existente — única exceção: o Sigma e o Mesclar ESCREVEM no valor real da célula (via `dispatch`/`updateState`), pois são mudanças de DADO, não de estilo, e por isso entram no histórico normal de undo/redo.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/web/src/features/unified-chat/components/table-grid-panel.tsx
@apps/web/src/features/unified-chat/hooks/use-formula-engine.ts
@apps/web/src/components/app/workspace-state-context.tsx
@apps/web/src/styles/globals.css
@apps/web/tests/table-grid-panel.test.tsx
@.planning/quick/260616-qei-adicionar-funcoes-da-topbar-da-tabela/260616-qei-SUMMARY.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Modelo de estilo por célula + rastreamento de célula ativa</name>
  <files>apps/web/src/features/unified-chat/components/table-grid-panel.tsx, apps/web/tests/table-grid-panel.test.tsx</files>
  <behavior>
    - Test 1: aplicar um estilo (ex. `{ bold: true }`) numa célula via uma função helper `applyCellStyle(rowIndex, colKey, patch)` e ler de volta via `cellStyles[`${rowIndex}:${colKey}`]` retorna o patch mesclado
    - Test 2: `applyCellStyle` em duas células diferentes não vaza estilo entre elas (chaves independentes)
    - Test 3: alternar (toggle) uma propriedade booleana (ex. `bold`) duas vezes retorna ao estado original (liga/desliga)
  </behavior>
  <action>
    Adicionar tipo local `CellStyle = { bold?: boolean; italic?: boolean; strikethrough?: boolean; color?: string; background?: string; align?: "left" | "center" | "right"; border?: boolean; fontFamily?: string; fontSize?: number; numberFormat?: "currency" | "percent" | undefined; decimals?: number }` em `table-grid-panel.tsx` (próximo aos outros tipos locais, topo do arquivo, junto de `GridState`).

    Adicionar estado `const [cellStyles, setCellStyles] = useState<Record<string, CellStyle>>({})` dentro do componente `TableGridPanel`, usando chave `${originalRowIndex}:${colKey}` (índice ORIGINAL, não o índice pós-sort/filtro — mesma convenção de `removeRow`/`sortIndexMap` já existente no arquivo, para que o estilo não "salte" de célula quando o usuário ordena/filtra).

    Adicionar estado `const [activeCell, setActiveCell] = useState<{ rowIndex: number; colKey: string } | null>(null)` — rowIndex aqui é o índice ORIGINAL (resolvido via `sortIndexMap[rowIndex] ?? rowIndex`, mesmo padrão usado em `deleteColComponent`).

    No `component` render de cada coluna em `dsgColumns` (dentro do `.map` que monta `dataCols`), capturar o parâmetro `active: boolean` e `rowIndex` já recebidos (ver assinatura existente no arquivo) e, num `useEffect`-like inline (não é possível usar hook dentro do render de célula da grid — em vez disso, registrar via `onClick`/`onFocus` no wrapper retornado): envolver o `<span>` de saída em uma `<div>` (ou aplicar diretamente no `<span>`) com `onMouseDown={() => setActiveCell({ rowIndex: sortIndexMap[rowIndex] ?? rowIndex, colKey })}` para capturar qual célula está ativa antes do datasheet-grid roubar o foco. Aplicar o estilo lido de `cellStyles[`${sortIndexMap[rowIndex] ?? rowIndex}:${colKey}`]` como inline `style` nesse wrapper (fontWeight, fontStyle, textDecoration, color, background, textAlign, border, fontFamily, fontSize).

    Criar helper `applyCellStyle(rowIndex: number, colKey: string, patch: Partial<CellStyle> | ((prev: CellStyle) => Partial<CellStyle>))` com `useCallback`, que faz merge imutável em `cellStyles` na chave correspondente. Criar helper `applyCellStyleToActive(patch: ...)` que no-ops silenciosamente (sem crash) quando `activeCell` é `null` — usado pelos botões de formatação nas próximas tasks.

    Não fazer wiring de nenhum botão de toolbar ainda nesta task — apenas o modelo de dados + leitura/escrita + aplicação de estilo na célula via `cellStyles`. As próximas tasks conectam os botões.
  </action>
  <verify>
    <automated>cd apps/web && npx vitest run tests/table-grid-panel.test.tsx -t "cellStyles|CellStyle|applyCellStyle"</automated>
  </verify>
  <done>Tipo `CellStyle`, estado `cellStyles`/`activeCell`, helper `applyCellStyle`/`applyCellStyleToActive` existem e têm teste cobrindo merge/isolamento/toggle; renderer de célula aplica o estilo lido do map sem quebrar a renderização existente (testes antigos TAB-01/SEC-05/LOC-03 continuam passando).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Formatação de texto — Negrito, Itálico, Tachado, Cor do texto, Preenchimento, Bordas, Alinhar</name>
  <files>apps/web/src/features/unified-chat/components/table-grid-panel.tsx, apps/web/src/styles/globals.css, apps/web/tests/table-grid-panel.test.tsx</files>
  <behavior>
    - Test 1: clicar em "Negrito" sem nenhuma célula ativa não lança erro (no-op gracioso)
    - Test 2: com uma célula focada/ativa (simular via `onMouseDown` na célula renderizada), clicar em "Negrito" aplica `fontWeight: bold` (ou classe equivalente) inline na célula correspondente no DOM
    - Test 3: clicar em "Alinhar à esquerda" duas vezes seguidas cicla para "centro" (ou comportamento de ciclo equivalente) — comportamento determinístico testável
  </behavior>
  <action>
    Remover `disabled` e `title="... (em breve)"` dos botões Bold, Italic, Strikethrough, Type (cor do texto), PaintBucket (preenchimento), LayoutGrid (bordas) e AlignLeft no `.formatting-toolbar` (linhas atuais ~854-879 do arquivo lido). Cada botão chama `applyCellStyleToActive` (Task 1) com o patch apropriado:
    - Bold → toggle `bold` (`(prev) => ({ bold: !prev.bold })`)
    - Italic → toggle `italic`
    - Strikethrough → toggle `strikethrough`
    - Type (Cor do texto) → abre um popover simples (reaproveitar padrão de `columns-panel`/`columns-panel-container` já existente no arquivo: `position: relative` + painel absoluto fechando ao clicar fora, com `useRef`+`useEffect` igual ao `colsPanelRef` existente) com uma paleta fixa de 8 cores (ex.: preto, vermelho, azul, verde, laranja, roxo, cinza, marrom) — clicar numa cor seta `color` na célula ativa e fecha o popover
    - PaintBucket (Preenchimento) → mesmo padrão de popover de paleta, seta `background`
    - LayoutGrid (Bordas) → toggle booleano `border` (liga/desliga uma borda sólida de 1px) — sem popover, ação direta
    - AlignLeft (Alinhar) → ação direta que CICLA `align` entre `"left" → "center" → "right" → "left"` a cada clique (ler `cellStyles[chave]?.align ?? "left"` e calcular o próximo); atualizar o ícone do botão dinamicamente trocando entre `AlignLeft`/`AlignCenter`/`AlignRight` do `lucide-react` conforme o align atual da célula ativa (import `AlignCenter`, `AlignRight` adicionais no bloco de import já existente)

    Adicionar no `data-active` (mesmo padrão usado em `.utility-btn[data-active]`) para os botões toggle (Bold/Italic/Strikethrough/Bordas) refletirem se a célula ativa atualmente tem aquele estilo — usar `cellStyles[activeCell ? `${activeCell.rowIndex}:${activeCell.colKey}` : ""]?.bold` etc.

    Em `globals.css`, adicionar classes `.format-btn[data-active]` (mesmo visual de `.utility-btn[data-active]`: fundo `#e8f0fe`, cor `#1a56db`) e `.color-popover`/`.color-popover-swatch` reaproveitando o padrão visual de `.columns-panel`/`.columns-panel-item` (border-radius 10px, box-shadow, etc.) com swatches de 20x20px em grid.
  </action>
  <verify>
    <automated>cd apps/web && npx vitest run tests/table-grid-panel.test.tsx -t "Negrito|Italico|Tachado|Alinhar|format-btn"</automated>
  </verify>
  <done>Bold/Italic/Strikethrough/Color/Fill/Border/Align não são mais `disabled`; clicar em cada um produz mudança visível e testável no estilo inline da célula ativa; nenhum requer célula ativa para não crashar (no-op gracioso quando null).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Formato numérico, decimais, zoom, fonte e tamanho</name>
  <files>apps/web/src/features/unified-chat/components/table-grid-panel.tsx, apps/web/src/styles/globals.css, apps/web/tests/table-grid-panel.test.tsx</files>
  <behavior>
    - Test 1: clicar em "Formato moeda" com célula ativa seta `numberFormat: "currency"` no `cellStyles` daquela célula, e a célula passa a exibir o valor formatado via `formatCellValue` (reutilizar a função já existente, não duplicar lógica de moeda)
    - Test 2: clicar em "Aumentar decimais" incrementa `decimals` (capado em 0..10); "Diminuir decimais" decrementa sem ir abaixo de 0
    - Test 3: selecionar "125%" no dropdown de Zoom aplica `transform: scale(1.25)` (ou zoom CSS equivalente) no container do grid (`.table-grid-panel` / `gridContainerRef`)
  </behavior>
  <action>
    Substituir o `<span className="format-dropdown" aria-hidden>100% <ChevronDown/></span>` estático por um dropdown real e funcional (reaproveitar o padrão de popover de Task 2 / `columns-panel`): estado `const [zoom, setZoom] = useState(100)`, opções fixas `[75, 100, 125, 150]`; ao selecionar, fecha o dropdown e aplica `style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}` no elemento que envolve o `<DynamicDataSheetGrid>` (ajustar `width`/`height` do wrapper externo proporcionalmente via CSS para não cortar a grade — usar `width: ${100 / zoom * 100}%` no wrapper interno se necessário para compensar o scale).

    Remover `disabled`/`title="(em breve)"` de DollarSign (Moeda) e Percent (Percentual): cada botão chama `applyCellStyleToActive({ numberFormat: "currency" | "percent" })` (toggle: se já é esse formato, volta a `undefined`). Estender `formatCellValue` (função pura já exportada no topo do arquivo) ou criar uma variante que aceite o `numberFormat` do `cellStyles` da célula com precedência sobre o `type` da coluna quando presente — ATENÇÃO: não alterar a assinatura usada pelos testes existentes (`formatCellValue(value, type)`); em vez disso, no ponto de uso dentro do `component` renderer, decidir o "tipo efetivo" como `cellStyles[chave]?.numberFormat ?? colType` antes de chamar `formatCellValue`. Para `"percent"`, adicionar um novo branch dentro de `formatCellValue` que formata com `Intl.NumberFormat("pt-BR", { style: "percent" })` quando `type === "percent"` e o valor é number.

    Remover `disabled`/`title` de ChevronsLeft/ChevronsRight (decimais): cada um ajusta `decimals` no `cellStyles` da célula ativa (`Math.max(0, (prev.decimals ?? 2) - 1)` / `Math.min(10, (prev.decimals ?? 2) + 1)`). Quando `decimals` está definido no `cellStyles` e o "tipo efetivo" é `currency`/`percent`/`number`, usar `minimumFractionDigits`/`maximumFractionDigits: decimals` na chamada de `Intl.NumberFormat` (adaptar `formatCellValue` para aceitar um terceiro parâmetro opcional `decimals?: number` — parâmetro adicional opcional não quebra chamadas existentes).

    Substituir os dois `<span className="format-dropdown" aria-hidden>Inter/10 <ChevronDown/></span>` estáticos por dropdowns reais: Fonte com opções fixas `["Inter", "Arial", "Georgia", "Courier New", "Verdana"]` aplicando `fontFamily` no `cellStyles` da célula ativa; Tamanho com opções fixas `[8, 9, 10, 11, 12, 14, 16, 18, 24]` aplicando `fontSize` (em px) no `cellStyles`. Mesmo padrão de popover com `useRef`+`useEffect` de fechar ao clicar fora.
  </action>
  <verify>
    <automated>cd apps/web && npx vitest run tests/table-grid-panel.test.tsx -t "Moeda|Percentual|decimais|Zoom|Fonte|Tamanho"</automated>
  </verify>
  <done>Moeda/Percentual/decimais aplicam numberFormat e decimals reais lidos por formatCellValue; Zoom tem dropdown funcional com 4 presets aplicando scale CSS real; Fonte e Tamanho são dropdowns reais (não mais `<span>` estático) que aplicam fontFamily/fontSize na célula ativa.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Sigma (funções), Mesclar células, Pintura (format painter)</name>
  <files>apps/web/src/features/unified-chat/components/table-grid-panel.tsx, apps/web/tests/table-grid-panel.test.tsx</files>
  <behavior>
    - Test 1: clicar em "Funções" (Sigma) com uma célula ativa insere a string `"=SOMA()"` como valor bruto daquela célula via `dispatch`, entrando no histórico de undo normal
    - Test 2: "Mesclar células" com duas células adjacentes na mesma linha selecionadas (simular via dois `onMouseDown` consecutivos com shift, ou um segundo estado `secondaryCell` para fim do range) concatena os valores brutos das duas com espaço e limpa a segunda, via `dispatch`
    - Test 3: "Formato de pintura" copia o `cellStyles` da célula ativa; ao clicar em outra célula em seguida (modo "colar formato" ativo), aplica o mesmo `cellStyles` na célula de destino e desativa o modo
  </behavior>
  <action>
    Remover `disabled`/`title="(em breve)"` do botão Sigma. `onClick`: se `activeCell` é null, no-op; senão, ler `currentColumns`/`currentRows` para montar a nova linha com `[activeCell.colKey]: "=SOMA()"` preservando os demais campos, e chamar `dispatch({ type: "SET", newState: { rows: <rows atualizadas>, columns: currentColumns } })` — mesmo padrão usado por `addRow`/`addColumn` já existentes no arquivo. Isso aciona o `useFormulaEngine` existente automaticamente (já é `displayRows` derivado).

    Remover `disabled`/`title` do botão Merge. Implementar seleção de range mínima: ao clicar em Merge sem um `secondaryCell` definido, entrar em "modo seleção de fim de mesclagem" (estado `mergeArmed: boolean`) e mostrar dica visual (ex. cursor ou borda piscante no botão via `data-active`); o próximo `onMouseDown` em OUTRA célula DA MESMA LINHA (`rowIndex` igual ao de `activeCell`) define o range e executa o merge: concatena `String(valor1).trim() + " " + String(valor2).trim()` (ignorando vazios) no `colKey` da PRIMEIRA célula do range (menor índice de coluna), limpa (`""`) o(s) `colKey`(s) restante(s) do range, via `dispatch`. Se a segunda célula está em linha diferente, cancela o modo sem aplicar (mesclagem cross-linha fora de escopo — limitação documentada, não um todo pendente). Resetar `mergeArmed` após a operação ou após Escape.

    Remover `disabled`/`title` do botão Paintbrush (Formato de pintura). `onClick`: se não há `activeCell`, no-op; senão guardar `cellStyles[chaveAtiva]` num estado `copiedStyle: CellStyle | null` e ativar `paintMode: boolean`. Enquanto `paintMode` é true, o próximo clique em qualquer célula (reaproveitar o `onMouseDown` já adicionado na Task 1) aplica `applyCellStyle(rowIndex, colKey, copiedStyle)` na célula clicada (substituindo, não mesclando, para reproduzir "pintar" fielmente) e desativa `paintMode`. Adicionar `data-active` no botão Paintbrush quando `paintMode` é true (reaproveita CSS de Task 2).
  </action>
  <verify>
    <automated>cd apps/web && npx vitest run tests/table-grid-panel.test.tsx -t "Sigma|Mesclar|pintura|Funcoes|Funções"</automated>
  </verify>
  <done>Sigma insere template de fórmula real no valor da célula (passa pelo motor de fórmulas); Mesclar concatena e limpa células reais adjacentes na mesma linha; Pintura copia e aplica cellStyles real entre duas células — nenhum é toast/no-op.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 5: Ordenar (menu), Agrupar (grupos visuais), Compartilhar (diálogo)</name>
  <files>apps/web/src/features/unified-chat/components/table-grid-panel.tsx, apps/web/src/styles/globals.css, apps/web/tests/table-grid-panel.test.tsx</files>
  <behavior>
    - Test 1: clicar em "Ordenar" abre um menu listando todas as `currentColumns`; clicar numa coluna + "Crescente" chama `setSortState({ key: <col>, dir: "asc" })` (mesmo state já usado pelo sort de cabeçalho) e fecha o menu
    - Test 2: clicar em "Agrupar" e escolher uma coluna agrupa linhas adjacentes com valor igual nessa coluna — verificar que um cabeçalho/separador de grupo aparece no DOM antes do primeiro grupo de linhas distintas
    - Test 3: clicar em "Compartilhar" abre um diálogo com opção "Copiar tabela como texto"; clicar nela chama `navigator.clipboard.writeText` com um conteúdo TSV/texto contendo os dados visíveis da tabela
  </behavior>
  <action>
    Remover `disabled`/`title="(use os cabeçalhos...)"` do botão Ordenar (`ArrowUpDown`). Implementar um menu dropdown (mesmo padrão de popover das tasks anteriores) listando `currentColumns.map(c => c.name)`; ao clicar numa coluna, mostrar/alternar dois botões "Crescente"/"Decrescente" (ou reutilizar `handleSortClick` chamando-o diretamente, já que ele alterna asc→desc→null por coluna — preferir chamar `setSortState({ key: col.key!, dir: "asc" })` ou `"desc"` diretamente para dar controle explícito de direção pelo menu, em vez de depender do ciclo de `handleSortClick`). Fechar o menu após a seleção.

    Remover `disabled`/`title="(em breve)"` do botão Agrupar (`Layers`). Implementar agrupamento real e simples: estado `const [groupByKey, setGroupByKey] = useState<string | null>(null)`; ao clicar em Agrupar, abrir um popover com `currentColumns` para escolher a coluna de agrupamento (ou "Nenhum" para desagrupar, setando `groupByKey` para `null`). Quando `groupByKey` não é null, antes de passar `filteredSortedRows` para `DynamicDataSheetGrid`, ordenar implicitamente por essa coluna (reaproveitando a mesma lógica de comparação já usada em `sortedRows`) e, na renderização da primeira célula de cada grupo (linha cujo valor de `groupByKey` é diferente da linha anterior), aplicar uma classe CSS `row-group-header` que adiciona uma borda superior mais grossa + um pequeno label do valor do grupo sobreposto (via `::before` ou um `<div>` absoluto posicionado relativo à célula, dado que `react-datasheet-grid` não expõe linhas de header nativas no meio do grid) — implementação pragmática: adicionar o valor do grupo como prefixo visual textual (ex. `"— Categoria: Alimentação —"`) na primeira célula visível da nova linha de grupo, usando o wrapper de célula já criado na Task 1, sem inserir uma linha de dados real na grade (evita corromper `rows`/`onChange`).

    Remover `disabled`/`title="(em breve)"` do botão Share2 (Compartilhar). `onClick` abre um diálogo modal simples (reaproveitar padrão de popover/painel, mas centrado: `position: fixed`, overlay semi-transparente, fecha em Escape ou clique fora) com duas ações: (1) "Copiar tabela como texto" — monta uma string TSV a partir de `currentColumns`/`displayRows` (reaproveitar `cellValue`-like logic já presente em `buildCsv` como referência, mas inline e simples: cabeçalho + linhas separadas por tab, sanitização não é necessária aqui pois é só clipboard texto, não abre em Excel) e chama `await navigator.clipboard.writeText(texto)`, mostrando feedback "Copiado!" por 2s; (2) quando `navigator.share` existe (`typeof navigator.share === "function"`), mostrar um segundo botão "Compartilhar arquivo" que monta um `Blob` CSV (reaproveitando `buildCsv` já importado) como `File` e chama `navigator.share({ files: [file], title: activeSpec.title })` dentro de um try/catch silencioso (usuário pode cancelar o share nativo sem erro).

    Em `globals.css`, adicionar `.sort-menu`/`.group-menu` (reaproveitando visual de `.columns-panel`), `.share-dialog-overlay` (fixed, inset 0, rgba(0,0,0,0.4)), `.share-dialog` (card centrado, branco, padding, border-radius), `.row-group-header` (border-top mais grossa + ::before com o label do grupo, `position: relative`).
  </action>
  <verify>
    <automated>cd apps/web && npx vitest run tests/table-grid-panel.test.tsx -t "Ordenar|Agrupar|Compartilhar"</automated>
  </verify>
  <done>Ordenar abre menu real que aciona setSortState; Agrupar agrupa visualmente linhas adjacentes por coluna escolhida com separador visível; Compartilhar abre diálogo funcional com cópia para clipboard (e Web Share quando suportado) — nenhum é stub.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Usuário → cellStyles | Usuário escolhe cores/fontes via UI controlada (dropdowns/swatches fixos) — não há input de texto livre indo para `style` |
| Usuário → Sigma/Mesclar (dados) | Texto inserido (`=SOMA()`, concatenação de células) entra no mesmo pipeline de `dispatch`/`useFormulaEngine` já hardenizado contra XSS (renderização sempre via `formatCellValue` → string em `<span>`, nunca `dangerouslySetInnerHTML`) |
| Compartilhar → clipboard/Web Share | Conteúdo TSV/CSV gerado client-side a partir dos próprios dados da tabela; nenhuma chamada de rede nova, nenhum dado sai do browser sem ação explícita do usuário |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-260617-01 | Tampering | `cellStyles` inline style injection via `color`/`background` | mitigate | Cor/fundo só vêm de paletas fixas pré-definidas (swatches), nunca de `<input type="text">` livre — elimina vetor de CSS injection via valor arbitrário |
| T-260617-02 | Information Disclosure | Botão Compartilhar / Web Share API | accept | Conteúdo compartilhado é estritamente os dados já visíveis na própria tabela do usuário, ação client-side explícita (clique), sem novo endpoint de rede; risco equivalente ao já aceito pelos botões CSV/XLSX existentes |
| T-260617-03 | Tampering | Sigma insere fórmula em célula | mitigate | Reusa `dispatch`/`useFormulaEngine` já existente — mesmo motor que já trata `#NAME?`/`#ERRO!` para fórmulas malformadas; nenhuma superfície nova de `eval` (evaluateArithmetic já não usa `eval`) |
| T-260617-04 | Denial of Service | Zoom CSS transform extremo | accept | Presets fixos (75/100/125/150%) sem input livre — sem vetor de valores extremos |
</threat_model>

<verification>
- `cd apps/web && npx vitest run tests/table-grid-panel.test.tsx` — todos os testes (antigos + novos) passam, incluindo TAB-01/SEC-05/LOC-03/EXP-01/EXP-02/DATA-01..04 sem regressão
- `cd apps/web && npx tsc --noEmit` (ou `npm run typecheck` se existir) — sem novos erros de tipo
- Inspeção manual (`grep -c 'em breve' apps/web/src/features/unified-chat/components/table-grid-panel.tsx`) deve retornar `0` — nenhum botão deve restar com title "(em breve)"
- Inspeção manual (`grep -n '<button' apps/web/src/features/unified-chat/components/table-grid-panel.tsx | grep 'disabled$\|disabled '`) — revisar manualmente que nenhum `disabled` remanescente é incondicional (apenas os já existentes e legítimos: `rowsAtLimit`/`colsAtLimit`/`isFormula`)
</verification>

<success_criteria>
- Todos os 19 botões antes `disabled`/"(em breve)" agora executam uma ação real e observável
- Nenhuma regressão nos comportamentos já funcionais (Filtrar, Colunas, Nova/Exemplo/Importar, Linha/Coluna, CSV/XLSX, Undo/Redo, sort por cabeçalho)
- Testes automatizados cobrem os comportamentos centrais de cada grupo de botões (Tasks 1-5)
- Nenhuma chamada de rede nova; tudo client-side dentro de `table-grid-panel.tsx` (+ CSS)
</success_criteria>

<output>
Create `.planning/quick/260617-ukf-crie-as-funcoes-da-toolbar-da-planilha-q/260617-ukf-SUMMARY.md` when done
</output>
