---
status: partial
phase: 11-attachment-ui-pro-gating
source: [11-VERIFICATION.md]
started: 2026-06-04T17:45:00Z
updated: 2026-06-04T17:45:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Free user vê CTA de upgrade ao interagir com o botão de paperclip
expected: O tooltip "Recurso exclusivo Pro" aparece no hover; a UX comunica claramente que o recurso requer upgrade (botão disabled + title + aria-label)
result: [pending]

### 2. Drag-and-drop em todos os 5 tools solta arquivo na área do chat corretamente
expected: Arquivo dropped aparece como chip de preview; aviso LGPD aparece; usuário free recebe o drop ignorado silenciosamente (guard !isPro)
result: [pending]

### 3. Feedback de dois estágios (Enviando documento... → Extraindo conteúdo...) é perceptível durante upload real
expected: O usuário vê "Enviando documento..." e depois "Extraindo conteúdo..." antes da resposta do LLM começar a aparecer
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
