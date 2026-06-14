---
phase: 20-protocolo-de-muta-o-chat-grade-q-a
plan: 01
subsystem: api
tags: [openai, structured-outputs, ndjson, streaming, formula-locale, fixture, vitest]

requires:
  - phase: 14-tabela-viva
    provides: "PT_BR_TO_EN (formula-locale) e TableSpecPayload usados pela tradução e pelo contexto da planilha"
  - phase: 18
    provides: "Eixo binário sheet_operation/qa no classificador e no schema do chat unificado"
provides:
  - "Tradutor bidirecional de fórmulas EN <-> pt-BR (translateEnToPtBr / translatePtBrToEn) seguro quanto a strings e separadores"
  - "Provedor unificado (unified-provider): prompt builder com contexto da planilha, mutação via Structured Outputs e Q&A streaming"
  - "Fixtures determinísticas de mutação (coluna 'Total IA') e Q&A para o modo sem OPENAI_API_KEY"
  - "Rota /api/chat/unified que valida specOverride e roteia mutação vs Q&A emitindo NDJSON"
affects: [20-02, protocolo-de-mutacao, planilha-viva, chat-unificado]

tech-stack:
  added: []
  patterns:
    - "BFF traduz fórmulas geradas pelo modelo (EN/,) para o dialeto da grade (pt-BR/;) antes de devolver o table_spec"
    - "Provider único com ramo fixture determinístico (sem chave) vs OpenAI real (com chave), espelhando o padrão do intent-classifier"
    - "Eventos NDJSON coletados antes de persistir para que assistantPayload reflita o payload final do stream"

key-files:
  created:
    - apps/web/src/server/ai/formula-translator.ts
    - apps/web/src/server/ai/unified-provider.ts
    - apps/web/tests/formula-translator.test.ts
  modified:
    - apps/web/src/app/api/chat/unified/route.ts
    - apps/web/tests/unified-route.test.ts

key-decisions:
  - "EN_TO_PT_BR derivado por inversão de PT_BR_TO_EN (fonte única da verdade), com a primeira ocorrência vencendo para resolver aliases (COUNTIF)"
  - "Troca de separador respeita aspas duplas e profundidade de parênteses — vírgulas em decimais e strings são preservadas"
  - "Fixture de mutação adiciona coluna 'Total IA' somando colunas numéricas/currency — determinística e independente do texto do prompt"
  - "Eventos do stream agregados antes da persistência para gravar o table_spec/qa_response final em assistantPayload"

patterns-established:
  - "Tradução de fórmulas no BFF: o modelo trabalha em EN/, e a grade recebe pt-BR/; via translateEnToPtBr"
  - "Provider com ramo fixture vs OpenAI selecionado por hasOpenAiKey()"

requirements-completed: [CHAT-01, CHAT-02, CHAT-04, CHAT-05, CHAT-06, LOC-01]

duration: 12min
completed: 2026-06-14
status: complete
---

# Phase 20 Plan 01: Protocolo de Mutação Chat→Grade e Q&A (backend) Summary

**Tradutor de fórmulas EN↔pt-BR + provedor unificado (Structured Outputs para mutação, streaming para Q&A) com fixtures determinísticas, ligado à rota /api/chat/unified que recebe o contexto completo da planilha via specOverride.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-14T17:00:00Z
- **Completed:** 2026-06-14T17:07:00Z
- **Tasks:** 3
- **Files modified/created:** 5

## Accomplishments
- Tradutor de fórmulas `formula-translator.ts` bidirecional, seguro quanto a strings e separadores, derivado de `PT_BR_TO_EN`.
- Provedor `unified-provider.ts`: prompt builder enriquecido com colunas/tipos/linhas da planilha, mutação estruturada (`table_spec`) com fórmulas traduzidas para pt-BR, e Q&A em deltas de texto.
- Fixtures determinísticas (mutação "Total IA" e Q&A citando as colunas) que servem o stream NDJSON sem `OPENAI_API_KEY`.
- Rota `/api/chat/unified` valida `specOverride` (`tableSpecPayloadSchema`), roteia sheet_operation vs qa pelo provider e persiste o payload final.

## Task Commits

1. **Task 1 (RED): testes do tradutor** - `bbec97e` (test)
2. **Task 1 (GREEN): tradutor de fórmulas** - `5b0f492` (feat)
3. **Task 2: contexto da planilha + OpenAI + fixtures na rota** - `4f2a8fe` (feat)
4. **Task 3: alinhar testes de rota com o provider** - `3793dbd` (test)

## Files Created/Modified
- `apps/web/src/server/ai/formula-translator.ts` - Tradução EN↔pt-BR de nomes de função e separadores.
- `apps/web/src/server/ai/unified-provider.ts` - Prompt builder, mutação via Structured Outputs, Q&A streaming e fixtures.
- `apps/web/src/app/api/chat/unified/route.ts` - Validação de specOverride, roteamento mutação/Q&A, NDJSON.
- `apps/web/tests/formula-translator.test.ts` - 9 testes do tradutor (funções, separadores, strings, round-trip).
- `apps/web/tests/unified-route.test.ts` - Casos de mutação table_spec, Q&A com contexto e specOverride malformado.

## Decisions Made
- `EN_TO_PT_BR` por inversão de `PT_BR_TO_EN` (primeira ocorrência vence nos aliases de COUNTIF).
- Troca de separador sensível a aspas e parênteses para não corromper decimais/strings.
- Stream agregado antes da persistência para gravar o payload final.

## Deviations from Plan
None - plan executed exactly as written.

(O plano descreve a tradução/contexto/roteamento direto na `route.ts`; a lógica de provider foi extraída para `unified-provider.ts` por coesão e testabilidade, sem alterar o comportamento nem o contrato da rota — refinamento de organização, não desvio de escopo.)

## Issues Encountered
- `pnpm -r typecheck` exige `prisma generate` prévio em worktree/CI limpo (falso-positivo `.prisma/client/default`); resolvido rodando `prisma generate` antes de typecheck/test, conforme memória do projeto.

## User Setup Required
None - o caminho sem `OPENAI_API_KEY` usa fixtures determinísticas; a chave real (produção) vai em `apps/web/.env.local`.

## LOC (wave)
- Adicionadas: 601 · Removidas: 44 · **Líquido: +557** (apps/web: tradutor, provider, rota e testes).

## Next Phase Readiness
- Backend do protocolo de mutação/Q&A pronto para o Plan 20-02 (integração de UI/grade e UAT do eixo binário operação-na-planilha vs Q&A).
- Suite completa do web verde (22 arquivos, 260 passados, 1 skip).

## Self-Check: PASSED

Todos os arquivos criados/modificados existem em disco e todos os commits de tarefa (bbec97e, 5b0f492, 4f2a8fe, 3793dbd) estão presentes no histórico.

---
*Phase: 20-protocolo-de-muta-o-chat-grade-q-a*
*Completed: 2026-06-14*
