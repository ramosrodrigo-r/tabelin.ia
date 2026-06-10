---
status: partial
phase: 13-clarification-loop
source: [13-VERIFICATION.md]
started: 2026-06-08T21:05:00Z
updated: 2026-06-08T21:05:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Fluxo end-to-end com API real
expected: Abrir http://localhost:3000/workspace com OPENAI_API_KEY configurada, digitar "cria uma tabela de vendas" e verificar o loop completo: 1) ClarificationCard aparece com "Pergunta 1 de 2" e botão "Gerar mesmo assim" visível; 2) ao responder, aparece "Pergunta 2 de 2"; 3) após 2 turns (ou skip), ConfirmationCard aparece com título/colunas/rowCount editáveis; 4) ao clicar "Confirmar e Gerar", a tabela é gerada e a cota é debitada apenas uma vez.
result: [pending]

### 2. Teste "corrupt NDJSON enters the error state" flaky
expected: O teste deve passar de forma consistente na suite completa (25 arquivos em paralelo), sem falha intermitente. Confirmar se a flakiness é pré-existente (Phase 12, commit e698699) ou se precisa de fix de isolamento de teste.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
