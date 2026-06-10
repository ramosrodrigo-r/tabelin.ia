---
status: testing
phase: 15-export-ux-migration-hardening
source: [15-01-SUMMARY.md, 15-02-SUMMARY.md, 15-03-SUMMARY.md]
started: 2026-06-10T00:00:00Z
updated: 2026-06-10T00:00:00Z
---

## Current Test

number: 1
name: Cold Start — app sobe do zero
expected: |
  `pnpm --filter web dev` sobe sem erros; http://localhost:3000/workspace carrega o chat unificado.
awaiting: user response

## Tests

### 1. Cold Start — app sobe do zero
expected: Servidor Next sobe sem erro; /workspace carrega o chat unificado.
result: [pending]

### 2. Navegação — Sidebar visível, ToolNav removido, deep links (UNI-07)
expected: Em /workspace a Sidebar mostra Formula/Scripts/SQL/Regex/Templates/File Analysis/OCR; NÃO há ToolNav (barra de abas) embaixo do input; clicar "SQL" vai para /workspace/sql; voltar mostra o chat.
result: [pending]

### 3. Gerar uma tabela no chat unificado (pré-requisito do export)
expected: Pedir uma tabela no chat gera um TableGridPanel (grid) com toolbar contendo "Adicionar linha", "Adicionar coluna", "Exportar CSV", "Exportar XLSX".
result: [pending]

### 4. Exportar CSV (EXP-01)
expected: Clicar "Exportar CSV" baixa `<titulo>.csv`; abrir no Excel/Sheets mostra acentos corretos (BOM UTF-8), separador `;`, e os VALORES calculados (não fórmulas template `{row}`).
result: [pending]

### 5. Exportar XLSX (EXP-02)
expected: Clicar "Exportar XLSX" baixa `<titulo>.xlsx`; abre no Excel/Sheets com as mesmas colunas/linhas; toda célula é texto (não recalcula como fórmula).
result: [pending]

### 6. Sanitização de injeção de fórmula (SEC-04 — teste de segurança)
expected: Editar uma célula para `=1+1` (ou `=SOMA(1;2)`), exportar CSV e XLSX, reabrir: a célula aparece como TEXTO literal `=1+1` (prefixo `'`), NÃO é executada como fórmula. Idem para uma célula iniciada por `+`, `-`, `@`.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0

## Gaps

[none yet]
