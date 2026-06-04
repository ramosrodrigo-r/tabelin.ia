---
status: partial
phase: 10-persistence-llm-context
source: [10-01-SUMMARY.md, 10-02-SUMMARY.md, 10-03-SUMMARY.md, 10-04-SUMMARY.md]
started: 2026-06-04T00:00:00Z
updated: 2026-06-04T12:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Servidor sobe do zero sem erro; migration aplicada; workspace carrega e um tool de texto responde normalmente (sem regressão da Phase 8/9).
result: pass
note: "`next dev` subiu em 442ms; GET /workspace 200; migration 20260604143213_add_attachment_context aplicada (migrate status OK). Warning de múltiplos lockfiles é pré-existente/não-bloqueante."

### 2. Pro-gate bloqueia anexo de usuário free (PRO-02)
expected: |
  Como usuário FREE, enviar um POST multipart/form-data com um arquivo para um tool de texto
  retorna HTTP 403 {code:"pro_required", feature:"attachment", cta:"pro_checkout"} ANTES de qualquer extração.
result: pass
note: "Smoke ao vivo: POST multipart e JSON sem cookie → HTTP 401 'Autenticacao obrigatoria.' (auth guard dispara antes de tudo). O caminho free-autenticado→403 pro_required é coberto verde pela Suite 1 do 10-04 (5 tools: 403 + reserveToolUse não chamado). Verificação manual com sessão free deferida à Phase 11."

### 3. Geração com anexo é contextualizada (Pro) (CTX-01)
expected: |
  Como PRO, anexar um CSV e pedir algo sobre o conteúdo; a resposta referencia os dados reais do documento,
  provando injeção do conteúdo extraído no system prompt.
result: blocked
blocked_by: prior-phase
reason: "Requer a UI de anexo (Phase 11) ou sessão Pro autenticada para verificação manual ao vivo. Comportamento coberto por 10-04 Suite 2 (extractContent chamado + attachmentContext no system prompt) e verifier SC-1."

### 4. Persistência guarda só o texto extraído, nunca o arquivo (CTX-02 / D-07)
expected: |
  Após geração com anexo, ConversationExchange.attachmentContext tem o TEXTO extraído; nenhum arquivo bruto persistido.
result: blocked
blocked_by: prior-phase
reason: "Criar a linha exige request autenticado (UI Phase 11). Coberto por 10-04 Suite 2 (saveConversationExchange com attachmentContext) e verifier SC-2 (schema String? @db.Text, nenhum byte de arquivo persistido)."

### 5. Follow-up reutiliza o documento sem reanexar (CTX-03)
expected: |
  Segunda mensagem sem anexar reutiliza o conteúdo do documento da troca anterior (inclui formula, gap Phase 8 fechado).
result: blocked
blocked_by: prior-phase
reason: "Fluxo multi-turn ao vivo precisa da UI (Phase 11) ou sessão autenticada. Coberto por 10-04 Suite 3 (latestWithAttachment + case formula) e verifier SC-3."

### 6. Cota: débito na geração, liberação em falha de extração (PRO-03)
expected: |
  Geração com anexo debita 1 uso (reserve→confirm); falha de extração (422/413) chama releaseToolUse e não debita.
result: blocked
blocked_by: prior-phase
reason: "Requer sessão autenticada + arquivos de teste (PDF escaneado / >5MB) via UI (Phase 11). Coberto por 10-04 Suite 5 (releaseToolUse em falha, confirmToolUse não chamado) e verifier SC-5."

## Summary

total: 6
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 4

## Gaps

[none — 0 issues. 4 testes blocked aguardam a UI da Phase 11 para verificação manual ao vivo; comportamentos cobertos por testes automatizados verdes.]
