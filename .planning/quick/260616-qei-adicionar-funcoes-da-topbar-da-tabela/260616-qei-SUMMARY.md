---
quick_id: 260616-qei
slug: adicionar-funcoes-da-topbar-da-tabela
description: Funcoes topbar da tabela — Filtrar e Colunas
date: 2026-06-16
status: complete
commit: 5cb2c84
---

# Summary: 260616-qei

## O que foi feito

### Filtrar
- Botão "Filtrar" na utility-bar agora é funcional
- Ao clicar, aparece uma `filter-bar` abaixo com input de texto
- Filtra linhas em tempo real (case-insensitive, busca em todos os valores)
- Mostra contador "X de Y" quando há texto digitado
- Botão X limpa o filtro e fecha a barra
- Badge no botão mostra quantidade de linhas filtradas

### Colunas
- Botão "Colunas" na utility-bar agora é funcional
- Abre dropdown com lista de colunas e checkboxes
- Desmarcar oculta a coluna do grid; remarcar a reexibe
- Fecha ao clicar fora do painel
- Badge no botão mostra quantas colunas estão ocultas
- Guard: não permite ocultar a última coluna visível

### Removido
- Botão Imprimir e ícone `Printer` removidos conforme solicitação do usuário

## Arquivos modificados
- `apps/web/src/features/unified-chat/components/table-grid-panel.tsx`
- `apps/web/src/styles/globals.css`
