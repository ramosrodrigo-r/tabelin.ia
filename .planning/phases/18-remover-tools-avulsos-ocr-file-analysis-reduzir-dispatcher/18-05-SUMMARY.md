---
phase: 18-remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher
plan: 05
subsystem: cleanup
tags: [unified-chat, intent-classifier, schemas, route, tests]
requires:
  - phase: 18-04
    provides: unified chat route no longer dispatches to removed tools
provides:
  - intent-classifier.ts classifying only as sheet_operation, qa, and unknown
  - packages/shared/src/unified-chat/schema.ts reduced to binary intents
  - route.ts dispatches using new binary labels, legacy fallback replaced
  - intent-classifier.test.ts suite rewritten to verify the binary intent axis
affects: [unified-chat, intent-classifier, route, schemas, tests]
tech-stack:
  added: []
  patterns:
    - Binary intent classifier axis (sheet_operation vs qa vs unknown)
    - Ambiguous sum prompts default to non-mutating qa intent
key-files:
  created: []
  modified:
    - apps/web/src/server/ai/intent-classifier.ts
    - packages/shared/src/unified-chat/schema.ts
    - apps/web/src/app/api/chat/unified/route.ts
    - apps/web/src/app/api/conversations/[tool]/route.ts
    - apps/web/src/app/api/conversations/unified/route.ts
    - apps/web/src/features/unified-chat/components/intent-pill.tsx
    - apps/web/src/features/unified-chat/components/render-dispatcher.tsx
    - apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts
    - apps/web/src/features/unified-chat/unified-chat-tool.tsx
    - apps/web/tests/conversations-route.test.ts
    - apps/web/tests/intent-classifier.test.ts
    - apps/web/tests/unified-route.test.ts
    - apps/web/tests/unified-schema.test.ts
    - apps/web/tests/unified-chat-tool.test.tsx
key-decisions:
  - "Reduzido UNIFIED_INTENTS e OVERRIDE_INTENTS para remover os 9 intents antigos e introduzir o eixo binário (sheet_operation, qa, unknown)."
  - "Preservada temporariamente a definição de FileDependentIntent e needs_file no schema para compatibilidade de tipos no frontend, que serão limpos na Phase 18-06/18-07."
  - "Decisão de produto: pedidos ambíguos baseados em 'soma' ou verbos similares (ex. 'some a coluna Valor') são classificados como 'qa' com confiança 'low', prevenindo mutações indesejadas na planilha."
requirements-completed: []
requirements-progress: [CLEAN-06]
duration: 13 min
completed: 2026-06-14
---

# Phase 18 Plan 05: Redução do Classificador de Intent para Eixo Binário (Summary)

**O classificador de intents e os esquemas unificados foram reduzidos dos 9 intents legados para o novo eixo binário: `sheet_operation` (operações estruturadas na planilha) e `qa` (perguntas analíticas e Q&A textual), além do fallback `unknown`.**

## Desempenho

- **Duração:** 13 min
- **Concluído em:** 2026-06-14T12:28:15-03:00 (Commits `a8be2a2`, `d3906e0`)
- **Tarefas:** 2 concluídas
- **Arquivos modificados:** 14

## Conquistas

- **Esquema de Chat Unificado Simplificado:** Reduziu `UNIFIED_INTENTS` e `OVERRIDE_INTENTS` em `packages/shared/src/unified-chat/schema.ts`, removendo `FILE_DEPENDENT_INTENTS` e a antiga validação dependente de arquivo de intents de 9 vias.
- **Classificador Binário de Intent:** Reescreveu `fixtureClassify()` e `buildClassifierSystemPrompt()` em `intent-classifier.ts` focando inteiramente no eixo binário, com novas heurísticas baseadas em expressões regulares em português.
- **Roteamento Binário de Rotas:** Substituiu o fallback temporário `unified_table` em `apps/web/src/app/api/chat/unified/route.ts` pelo roteamento definitivo com base em `sheet_operation` e `qa`.
- **Suíte de Testes Atualizada:** Reescreveu os asserts em `intent-classifier.test.ts` para testar os casos representativos de mutação e Q&A do novo eixo binário. Atualizou `unified-route.test.ts` e `unified-schema.test.ts` para refletir os novos rótulos de intent.
- **Persistência e Limpeza de Histórico:** `saveConversationExchange` agora grava `toolKind` como `sheet_operation` ou `qa`, e as rotas de limpeza aceitam esses novos labels preservando os labels legados.

## Decisões Tomadas

- **Tratamento de Pedidos Ambíguos:** Estabeleceu-se que solicitações de "soma" ambíguas (ex.: "some a coluna Valor") são classificadas como `qa` com confiança `low` (decisão de produto visando prevenir mutações acidentais na planilha). O eval completo do checkpoint 17→18 com 6-8 prompts representativos foi adicionado ao arquivo de testes. O UAT completo com 20 prompts será executado na Phase 20.
- **Manutenção de Tipos do Frontend:** Manteve-se temporariamente `FileDependentIntent` mapeado para `OverrideIntent` no arquivo `schema.ts` para garantir que o build do front-end (`render-dispatcher.tsx`, `use-unified-chat-stream.ts`) continue funcionando até que esses arquivos sejam limpos nos planos 06 e 07.
- **CLEAN-06 ainda em progresso:** Este plano concluiu a redução do classificador/route labels. A remoção final de payloads legados, branches do `render-dispatcher` e componentes de stub/clarificação/spec permanece nos planos 18-06 e 18-07.

## Issues Encontrados

- O `pnpm -r test` reproduziu uma falha de timing no teste de NDJSON corrompido apenas sob suite completa. A asserção foi estabilizada com `waitFor(..., { timeout: 5_000 })`, mantendo o mesmo comportamento testado.

## Verificação

- `pnpm exec prisma generate` -> OK
- `pnpm --filter web test intent-classifier.test.ts unified-schema.test.ts unified-route.test.ts unified-chat-tool.test.tsx conversations-route.test.ts` -> OK
- `pnpm -r typecheck` -> OK
- `pnpm -r test` -> OK, 21 files, 261 passed, 1 skipped
