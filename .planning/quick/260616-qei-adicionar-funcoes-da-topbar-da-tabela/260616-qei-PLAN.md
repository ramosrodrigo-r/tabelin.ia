---
quick_id: 260616-qei
slug: adicionar-funcoes-da-topbar-da-tabela
description: Adicionar funcoes da topbar da tabela — Filtrar, Imprimir, Colunas
date: 2026-06-16
status: planned
must_haves:
  truths:
    - Botão Filtrar abre barra de filtro com input de texto que filtra linhas em tempo real
    - Botão Imprimir chama window.print()
    - Botão Colunas abre dropdown com checkboxes para mostrar/ocultar colunas individuais
    - Botões antes disabled agora são clicáveis e funcionais
  artifacts:
    - apps/web/src/features/unified-chat/components/table-grid-panel.tsx (modificado)
    - apps/web/src/styles/globals.css (estilos para filter-bar e columns-dropdown)
---

# Quick Task 260616-qei: Funcoes da Topbar da Tabela

## Tarefa 1 — Funcao Filtrar

**files:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx`, `apps/web/src/styles/globals.css`

**action:**
- Adicionar estado `filterText: string` e `showFilter: boolean`
- Remover `disabled` do botão Filtrar; adicionar `onClick` que alterna `showFilter`
- Adicionar `data-active` no botão quando filter está ativo
- Renderizar `<div className="filter-bar">` abaixo do utility-bar quando `showFilter === true`
  - Input de texto com placeholder "Filtrar linhas..."
  - Botão X para limpar e fechar
- Aplicar filterText sobre `sortedRows` antes do grid: filtrar linhas onde qualquer valor contém o texto (case-insensitive)

**verify:** Ao clicar Filtrar, aparece input; digitar texto reduz linhas visíveis no grid

**done:** [ ]

---

## Tarefa 2 — Funcao Imprimir

**files:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx`, `apps/web/src/styles/globals.css`

**action:**
- Remover `disabled` do botão Imprimir
- Adicionar `onClick={() => window.print()}`
- Adicionar CSS `@media print` que esconde sidebar, utility-bar, formatting-toolbar e mostra só o grid

**verify:** Clicar Imprimir abre dialog de impressão do browser

**done:** [ ]

---

## Tarefa 3 — Funcao Colunas (visibilidade)

**files:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx`, `apps/web/src/styles/globals.css`

**action:**
- Adicionar estado `hiddenCols: Set<string>` e `showColsPanel: boolean`
- Remover `disabled` do botão Colunas; adicionar `onClick` que alterna `showColsPanel`
- Renderizar dropdown `.columns-panel` abaixo do botão quando `showColsPanel === true`
  - Lista de checkboxes: um por coluna, checked = visível
  - Click fora fecha o painel
- Filtrar `dsgColumns.columns` excluindo colunas em `hiddenCols` antes de passar ao DynamicDataSheetGrid
- Commit atômico com todas as três tarefas (são dependentes no mesmo arquivo)

**verify:** Botão Colunas abre painel; desmarcar coluna a remove do grid; remarcar a recoloca

**done:** [ ]
