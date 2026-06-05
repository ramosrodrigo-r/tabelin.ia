---
status: complete
phase: 11-attachment-ui-pro-gating
source: [11-VERIFICATION.md]
started: 2026-06-04T17:45:00Z
updated: 2026-06-05T00:00:00Z
---

## Current Test

[testing complete — see 11-UAT.md]

## Tests

### 1. Free user vê CTA de upgrade ao interagir com o botão de paperclip
expected: O tooltip "Recurso exclusivo Pro" aparece no hover; a UX comunica claramente que o recurso requer upgrade (botão disabled + title + aria-label)
result: pass

### 2. Drag-and-drop em todos os 5 tools solta arquivo na área do chat corretamente
expected: Arquivo dropped aparece como chip de preview; aviso LGPD aparece; usuário free recebe o drop ignorado silenciosamente (guard !isPro)
result: pass

### 3. Feedback de dois estágios (Enviando documento... → Extraindo conteúdo...) é perceptível durante upload real
expected: O usuário vê "Enviando documento..." e depois "Extraindo conteúdo..." antes da resposta do LLM começar a aparecer
result: pass
note: Validado com OPENAI_API_KEY real (em fixture mode a extração é instantânea e a resposta é canned, tornando o teste inválido). Com latência real os dois estágios ficaram perceptíveis e a resposta veio grounded na imagem.

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
