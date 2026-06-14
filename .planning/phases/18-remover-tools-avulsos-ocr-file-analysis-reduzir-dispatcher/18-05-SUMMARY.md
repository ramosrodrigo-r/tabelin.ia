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
    - apps/web/tests/intent-classifier.test.ts
    - apps/web/tests/unified-route.test.ts
    - apps/web/tests/unified-schema.test.ts
key-decisions:
  - "Reduzido UNIFIED_INTENTS e OVERRIDE_INTENTS para remover os 9 intents antigos e introduzir o eixo binário (sheet_operation, qa, unknown)."
  - "Preservada temporariamente a definição de FileDependentIntent e needs_file no schema para compatibilidade de tipos no frontend, que serão limpos na Phase 18-06/18-07."
  - "Decisão de produto: pedidos ambíguos baseados em 'soma' ou verbos similares (ex. 'some a coluna Valor') são classificados como 'qa' com confiança 'low', prevenindo mutações indesejadas na planilha."
requirements-completed: [CLEAN-06]
duration: 5 min
completed: 2026-06-14
---

# Phase 18 Plan 05: Redução do Classificador de Intent para Eixo Binário (Summary)

**O classificador de intents e os esquemas unificados foram reduzidos dos 9 intents legados para o novo eixo binário: `sheet_operation` (operações estruturadas na planilha) e `qa` (perguntas analíticas e Q&A textual), além do fallback `unknown`.**

## Desempenho

- **Duração:** 5 min
- **Concluído em:** 2026-06-14T12:25:17-03:00 (Commit `a8be2a2`)
- **Tarefas:** 2 concluídas
- **Arquivos modificados:** 6

## Conquistas

- **Esquema de Chat Unificado Simplificado:** Reduziu `UNIFIED_INTENTS` e `OVERRIDE_INTENTS` em `packages/shared/src/unified-chat/schema.ts`, removendo `FILE_DEPENDENT_INTENTS` e a antiga validação dependente de arquivo de intents de 9 vias.
- **Classificador Binário de Intent:** Reescreveu `fixtureClassify()` e `buildClassifierSystemPrompt()` em `intent-classifier.ts` focando inteiramente no eixo binário, com novas heurísticas baseadas em expressões regulares em português.
- **Roteamento Binário de Rotas:** Substituiu o fallback temporário `unified_table` em `apps/web/src/app/api/chat/unified/route.ts` pelo roteamento definitivo com base em `sheet_operation` e `qa`.
- **Suíte de Testes Atualizada:** Reescreveu os asserts em `intent-classifier.test.ts` para testar os casos representativos de mutação e Q&A do novo eixo binário. Atualizou `unified-route.test.ts` e `unified-schema.test.ts` para refletir os novos rótulos de intent.

## Decisões Tomadas

- **Tratamento de Pedidos Ambíguos:** Estabeleceu-se que solicitações de "soma" ambíguas (ex.: "some a coluna Valor") são classificadas como `qa` com confiança `low` (decisão de produto visando prevenir mutações acidentais na planilha). O eval completo do checkpoint 17→18 com 6-8 prompts representativos foi adicionado ao arquivo de testes. O UAT completo com 20 prompts será executado na Phase 20.
- **Manutenção de Tipos do Frontend:** Manteve-se temporariamente `FileDependentIntent` mapeado para `OverrideIntent` no arquivo `schema.ts` para garantir que o build do front-end (`render-dispatcher.tsx`, `use-unified-chat-stream.ts`) continue funcionando até que esses arquivos sejam limpos nos planos 06 e 07.

## Verificação

- `pnpm exec prisma generate` -> OK
- `pnpm -r typecheck` -> OK
- `pnpm test` -> Todos os 261 testes passando com sucesso.
