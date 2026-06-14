---
phase: 18-remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher
plan: 07
subsystem: cleanup
tags: [unified-chat, context-messages, stream-hook, session-context, tests]
requires:
  - phase: 18-06
    provides: reduced payload schema (table_spec/qa_response) and render-dispatcher
provides:
  - unified-chat-tool.tsx reduced to the binary sheet_operation/qa axis, no session context or clarification handlers
  - use-unified-chat-stream.ts SubmitUnifiedChatInput reduced to { prompt, file, overrideIntent, lastIntent }
  - context-messages.ts serializeAssistant reduced to table_spec + qa_response (+ default null)
  - session-context-selector.tsx deleted
affects: [unified-chat, context-messages, stream-hook, tests]
tech-stack:
  added: []
  patterns:
    - intentFromPayload binary mapping (table_spec->sheet_operation, qa_response->qa, default null)
    - Multi-turn serialization limited to the two surviving payload kinds (D-09 default null preserved)
key-files:
  created: []
  modified:
    - apps/web/src/features/unified-chat/unified-chat-tool.tsx
    - apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts
    - apps/web/src/server/ai/context-messages.ts
    - apps/web/tests/context-messages.test.ts
    - apps/web/tests/unified-chat-tool.test.tsx
  deleted:
    - apps/web/src/features/unified-chat/components/session-context-selector.tsx
key-decisions:
  - "Removido o type UnifiedContext, defaultContext() e todo o estado de contexto de sessão (platform/formulaLanguage/separator/sqlDialect/scriptType) — não há mais ferramentas avulsas para parametrizar; o eixo binário sheet_operation/qa não precisa desses campos."
  - "intentFromPayload reduzido ao binário: table_spec->sheet_operation, qa_response->qa, default null (kinds legados de histórico antigo viram intent null, IntentPill não renderiza — T-18-19)."
  - "Campo context removido de UnifiedExchange; o gate do effect de append passou a depender só de submittedText (submittedContext eliminado)."
  - "SubmitUnifiedChatInput reduzido a { prompt, file, overrideIntent, lastIntent }; imports FormulaLanguage/FormulaPlatform/ScriptType/SqlDialect e os campos de body/FormData de tools avulsos removidos."
  - "serializeAssistant em context-messages.ts mantém só table_spec + qa_response + default null (D-09); cases sql/regex_generate/script/template/table_stub/table_clar_question/formula removidos."
  - "Copy do empty-state e placeholder reescritos para o eixo binário (operação na planilha vs pergunta sobre os dados), sem menção a fórmula/SQL/regex/script/OCR."
requirements-completed: [CLEAN-06, CLEAN-07]
requirements-progress: []
duration: ~20 min
completed: 2026-06-14
---

# Phase 18 Plan 07: Redução do Cliente do Chat Unificado ao Eixo Binário (Summary)

**`unified-chat-tool.tsx`, `use-unified-chat-stream.ts` e `context-messages.ts` foram reduzidos ao eixo binário `sheet_operation`/`qa`: removido todo o estado de contexto de sessão de tools avulsos e os handlers de clarificação/geração-do-zero, deletado o `SessionContextSelector`, e a serialização multi-turn colapsada para os dois kinds sobreviventes (`table_spec`, `qa_response`).**

## Desempenho

- **Duração:** ~20 min
- **Concluído em:** 2026-06-14
- **Arquivos modificados:** 5 modificados + 1 deletado
- **Líquido:** +80 / −519 linhas

## Conquistas

- **Cliente binário:** `unified-chat-tool.tsx` sem `UnifiedContext`/`defaultContext()`/estado de contexto; `intentFromPayload` reduzido ao binário; `UnifiedExchange.context` removido; `submitInput` agora é `{ prompt, file, overrideIntent, lastIntent }`.
- **Hook de stream enxuto:** `SubmitUnifiedChatInput` reduzido aos 4 campos binários; imports e campos de body/FormData de tools avulsos (`platform`/`formulaLanguage`/`separator`/`sqlDialect`/`scriptType`/`overrideGenerate`/`specOverride`) removidos.
- **Contexto multi-turn reduzido:** `serializeAssistant` mantém apenas `table_spec` (spec da grade) e `qa_response` (`[Resposta anterior]\n${content}`), com `default: return null` preservado (D-09).
- **Componente deletado:** `session-context-selector.tsx` removido (98 linhas); zero referências restantes na fonte.
- **UI alinhada:** copy do empty-state e placeholder reescritos para o eixo "operação na planilha vs pergunta sobre os dados".
- **Testes atualizados:** `context-messages.test.ts` reescrito para os kinds binários (27 testes); `unified-chat-tool.test.tsx` sem o describe do `SessionContextSelector` e com o teste de body JSON ajustado (sem campos de tools avulsos) + novo teste de `lastIntent` herdado entre submits.

## Decisões Tomadas

- **Handlers de clarificação já removidos no Plan 06:** `handleAnswerClarification`/`handleSkipClarification`/`handleConfirmSpec` e os props `onAnswer`/`onSkip`/`onConfirm`/`attachmentMeta` do `RenderDispatcher` foram removidos no Plan 06 (necessário para destravar o typecheck do `web`). Este plano apenas confirmou a ausência — sem retrabalho.
- **`RenderDispatcher` sem `attachmentMeta`:** a nota de interface do plano assumia que o Plan 06 preservaria a prop `attachmentMeta` no `RenderDispatcher`; na implementação real ela já fora removida no Plan 06 (o componente reduzido só aceita `status/draft/payload/metadata/warnings/error/onRetry`). Nenhuma ação extra necessária.
- **Teste de persistência de contexto substituído:** o teste "persists selected context across two submits" dependia do seletor de Dialeto SQL (removido); reescrito como "carries lastIntent from the previous exchange into the next submit", preservando cobertura da lógica `resolvedLastIntent`.

## Issues Encontrados

- Nenhum erro fora do escopo. `smoke.spec.ts`/`unified-schema.test.ts` não acusaram referências a kinds antigos no typecheck/test desta wave — o Plan 08 cuida da reescrita dos smokes (WR-02 da Phase 17).

## Verificação

- `pnpm exec prisma generate` -> OK
- `pnpm -r typecheck` -> OK (shared + web)
- `pnpm --filter web exec vitest run context-messages.test.ts unified-chat-tool.test.tsx` -> OK (27 + 13)
- `pnpm --filter web test` -> OK, 21 files, 244 passed, 1 skipped (NDJSON flaky conhecido)
- Greps de aceitação (forbidden symbols == 0, intentFromPayload binário, selector deletado) -> OK
