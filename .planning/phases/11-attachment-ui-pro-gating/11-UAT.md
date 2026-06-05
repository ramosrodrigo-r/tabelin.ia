---
status: complete
phase: 11-attachment-ui-pro-gating
source: [11-VERIFICATION.md, 11-HUMAN-UAT.md]
started: 2026-06-05T00:00:00Z
updated: 2026-06-05T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Free user vê CTA de upgrade no botão de anexo
expected: Logado como FREE, o botão de paperclip está desabilitado com tooltip "Recurso exclusivo Pro" (title + aria-label "Anexar arquivo (exclusivo Pro)"); não é possível anexar.
result: pass

### 2. Drag-and-drop funciona nos 5 tools (e é ignorado para free)
expected: Logado como PRO, arrastar um arquivo (CSV/PDF/PNG/TXT) para a área do chat em cada um dos 5 tools mostra o chip de preview (ícone/nome/tamanho) + o aviso LGPD. Logado como FREE, o drop é ignorado silenciosamente (nenhum chip aparece).
result: pass

### 3. Feedback de dois estágios durante upload real
expected: Logado como PRO, ao anexar um arquivo e enviar, aparece "Enviando documento..." e em seguida "Extraindo conteúdo..." antes da resposta do LLM começar a streamar.
result: pass
note: Validado com OPENAI_API_KEY real (fixture mode tornava a extração instantânea e a resposta canned — não exercitável). Com latência real, os dois estágios ficaram perceptíveis e a resposta veio grounded na imagem (OCR leu a tabela de produtos).

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
