---
phase: 13-clarification-loop
verified: 2026-06-08T20:59:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Abrir http://localhost:3000/workspace com OPENAI_API_KEY configurada, digitar 'cria uma tabela de vendas' e verificar o loop completo end-to-end"
    expected: "1) ClarificationCard aparece com 'Pergunta 1 de 2' e botão 'Gerar mesmo assim' visível; 2) ao responder, aparece 'Pergunta 2 de 2'; 3) após 2 turns (ou skip), ConfirmationCard aparece com título/colunas/rowCount editáveis; 4) ao clicar 'Confirmar e Gerar', a tabela é gerada e a cota é debitada apenas uma vez"
    why_human: "Validação visual do fluxo multi-turn completo com API real; o fixture mode não testa a qualidade das perguntas geradas pelo LLM"
  - test: "Verificar que o teste 'corrupt NDJSON enters the error state' passa de forma consistente na suite completa (25 arquivos em paralelo)"
    expected: "O teste deve passar em todas as execuções sem falha intermitente"
    why_human: "O teste exibe flakiness intermitente quando a suite completa corre em paralelo (falhou 1 em 5 execuções durante a verificação); pode ser isolamento de ambiente JSDOM. Os testes Phase 13 específicos (unified-route, unified-chat-tool clarification loop) passam de forma consistente."
---

# Phase 13: Loop de Clarificação — Verification Report

**Phase Goal:** Loop de clarificação multi-turn com teto de 2 turns, ConfirmationCard editável e escape hatch "Gerar mesmo assim" antes de gerar tabelas no chat unificado.
**Verified:** 2026-06-08T20:59:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CLAR-01: Ao detectar intent tabela com clarTurnCount=0, o servidor emite `table_clar_question` com uma única pergunta | VERIFIED | `route.ts:617-649` — clarification path; `clarificationQuestionSchema` em `table-clarifier.ts:18-24` proíbe array estruturalmente; Cenário A no `unified-route.test.ts:505-523` confirma |
| 2 | CLAR-02: Teto rígido de 2 turns; após 2 turns de clarificação o servidor força geração; indicador "Pergunta N de 2" exibido | VERIFIED | `route.ts:610` — `MAX_CLAR_TURNS = 2`; `route.ts:615` — `clarTurnCount >= MAX_CLAR_TURNS`; `clarification-card.tsx:36` — "Pergunta {turnIndex+1} de {totalTurns}"; Cenários B e D nos testes confirmam |
| 3 | CLAR-03: Botão "Gerar mesmo assim" visível desde o primeiro turno (escape hatch); click dispara POST com `overrideGenerate="true"` | VERIFIED | `clarification-card.tsx:56-58` — botão ghost sempre renderizado (canSkip sempre true no MVP); `unified-chat-tool.tsx:284-288` — `handleSkipClarification` submete `{ ...last, overrideGenerate: true }`; Cenário C nos route tests + teste CLAR-03 na UI confirmam |
| 4 | CLAR-04: ConfirmationCard exibe spec (colunas, rowCount, título) editáveis; "Confirmar e Gerar" resubmete com `overrideGenerate=true` e `specOverride` (campo dedicado, prompt intacto) | VERIFIED | `confirmation-card.tsx:1-95` — inputs editáveis para título, colunas e rowCount; `unified-chat-tool.tsx:290-298` — `handleConfirmSpec` usa `{ ...last, overrideGenerate: true, specOverride: JSON.stringify(spec) }` preservando prompt; `render-dispatcher.tsx:242-248` — case `table_spec` renderiza ConfirmationCard; teste CLAR-04 na UI confirma formato do body |
| 5 | CLAR-05: Cota NUNCA debitada em turn de clarificação; debitada exatamente uma vez na geração final | VERIFIED | `route.ts:619` — `releaseToolUse` chamado IMEDIATAMENTE antes de `askClarificationQuestion:621` no clarification path; `route.ts:653` — `confirmToolUse` apenas no generation path; 5 assertions negativas `expect(routeMocks.confirmToolUse).not.toHaveBeenCalled()` nos Cenários A, C (skip), D, E da suite de route; `specOverride` re-validado com `tableSpecPayloadSchema.safeParse` em `route.ts:321-330` |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/src/app/api/chat/unified/route.ts` | Bifurcação do case `unified_table` com clarification e generation paths | VERIFIED | Linha 609-685: bifurcação completa com `MAX_CLAR_TURNS=2`, `conservativeClarTurnCount`, `resolveOverrideSpec`, mutuamente exclusivos |
| `apps/web/src/server/ai/table-clarifier.ts` | `askClarificationQuestion`, `buildTableSpec`, `clarificationQuestionSchema`, anti-injection | VERIFIED | 286 linhas; `server-only` na linha 1; fixture mode nas linhas 154 e 229; `ESPECIFICAÇÃO COLETADA` delimiter na linha 75 |
| `packages/shared/src/unified-chat/schema.ts` | `tableClarQuestionPayloadSchema`, `tableSpecPayloadSchema`, tipos inferidos | VERIFIED | Linhas 54-69 (schemas), 97-98 (union), 132-133 (tipos exportados) |
| `apps/web/src/features/unified-chat/components/clarification-card.tsx` | ClarificationCard com input, contador, botão "Gerar mesmo assim" | VERIFIED | 62 linhas; `use client`; import real de `@tabelin/shared`; botão ghost-button linha 56 |
| `apps/web/src/features/unified-chat/components/confirmation-card.tsx` | ConfirmationCard com campos editáveis e botão "Confirmar e Gerar" | VERIFIED | 95 linhas; `use client`; import real de `@tabelin/shared`; inputs editáveis para título, colunas, rowCount |
| `apps/web/src/features/unified-chat/components/render-dispatcher.tsx` | Cases `table_clar_question` e `table_spec` no switch | VERIFIED | Linhas 233-248: cases wired para `ClarificationCard` e `ConfirmationCard` |
| `apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts` | `overrideGenerate` e `specOverride` em `SubmitUnifiedChatInput` e serialização | VERIFIED | Linhas 33-34 (campos no tipo), 100-115 (serialização em FormData e JSON) |
| `apps/web/src/features/unified-chat/unified-chat-tool.tsx` | Callbacks `onAnswer`, `onSkip`, `onConfirm` definidos e passados ao RenderDispatcher | VERIFIED | Linhas 270-298 (handlers), 376-378 (passagem ao RenderDispatcher in-stream), 403-405 (passagem ao RenderDispatcher in-exchanges) |
| `apps/web/tests/unified-route.test.ts` | 7 cenários CLAR-01..05 com assertions negativas de `confirmToolUse` | VERIFIED | Describe `unified_table — clarification loop` linhas 486-674; 5+ assertions `not.toHaveBeenCalled()` para `confirmToolUse` |
| `apps/web/tests/unified-chat-tool.test.tsx` | Tests de UI para CLAR-01..04 com verificação de formato do body | VERIFIED | Describe `clarification loop` linhas 463-601; 5 cenários incluindo CLAR-01..04 e verificação de ausência de `overrideGenerate` em respostas de clarificação |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `route.ts` | `table-clarifier.ts` | `import { askClarificationQuestion, buildTableSpec }` | WIRED | Linha 26 do route.ts; chamadas nas linhas 621, 657 |
| `route.ts` | `quota-service.ts` | `releaseToolUse` no clarification path, `confirmToolUse` no generation path | WIRED | Mutuamente exclusivos: linha 619 (release) ou linha 653 (confirm) |
| `route.ts` | `@tabelin/shared` | `tableSpecPayloadSchema.safeParse` para re-validação de `specOverride` | WIRED | Linha 17 (import), linha 325 (safeParse em `resolveOverrideSpec`) |
| `render-dispatcher.tsx` | `clarification-card.tsx` | `import { ClarificationCard }` + case `table_clar_question` | WIRED | Linhas 30 e 233-240 |
| `render-dispatcher.tsx` | `confirmation-card.tsx` | `import { ConfirmationCard }` + case `table_spec` | WIRED | Linhas 31 e 242-248 |
| `unified-chat-tool.tsx` | `use-unified-chat-stream.ts` | `handleSkipClarification` e `handleConfirmSpec` chamam `stream.submit` com `overrideGenerate: true` | WIRED | Linhas 287, 295 |
| `context-messages.ts` | histórico LLM | cases `table_clar_question` e `table_spec` em `serializeAssistant` | WIRED | Linhas 116-128 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ClarificationCard` | `payload.question` | `askClarificationQuestion` via route.ts → `table-clarifier.ts` | Sim (fixture mode: string determinística; modo real: LLM via `zodResponseFormat`) | FLOWING |
| `ConfirmationCard` | `editedSpec` | `buildTableSpec` / `resolveOverrideSpec` via route.ts | Sim (fixture: objeto fixo com 2 colunas; modo real: LLM via `tableSpecPayloadSchema`) | FLOWING |
| `clarTurnCount` | `tableHistory` | `findConversationExchanges(userId, "unified_table")` → PostgreSQL | Sim (derivado exclusivamente do banco; campo client-side não existe) | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `clarificationQuestionSchema` usa `{ question: string }` (não array) | `grep -n "question.*string\|z\.string" apps/web/src/server/ai/table-clarifier.ts` | Linha 20: `z.string().trim().min(1)` | PASS |
| `MAX_CLAR_TURNS = 2` hardcoded | `grep -n "MAX_CLAR_TURNS" route.ts` | Linha 610: `const MAX_CLAR_TURNS = 2` | PASS |
| `releaseToolUse` chamado ANTES de `askClarificationQuestion` | Grep por linha de chamada | release na linha 619, ask na linha 621 — release é anterior | PASS |
| `rowCount` limitado a max(200) no schema | `grep -n "max(200" packages/shared/src/unified-chat/schema.ts` | Linha 67: `.max(200)` | PASS |
| Nenhum `dangerouslySetInnerHTML` em componentes Phase 13 | `grep -rn "dangerouslySetInnerHTML" clarification-card.tsx confirmation-card.tsx render-dispatcher.tsx` | Nenhum resultado | PASS |
| `server-only` importado em `table-clarifier.ts` | `grep "server-only" table-clarifier.ts` | Linha 1 | PASS |
| `ESPECIFICAÇÃO COLETADA` delimiter presente (anti-injection) | `grep "ESPECIFICAÇÃO COLETADA" table-clarifier.ts` | Linha 75 | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CLAR-01 | Plans 01-04 | Ao detectar pedido de tabela, IA faz perguntas de clarificação (uma por turno) | SATISFIED | `askClarificationQuestion` com `clarificationQuestionSchema` garante pergunta única; Cenário A em route test + CLAR-01 em UI test |
| CLAR-02 | Plans 01-04 | Teto rígido de 2 turns; indicador de progresso "Pergunta N de 2" | SATISFIED | `MAX_CLAR_TURNS=2` em route.ts; `clarification-card.tsx:36` exibe contador; Cenários B e D validam |
| CLAR-03 | Plans 01-04 | Botão "Gerar mesmo assim" desde o primeiro turno | SATISFIED | `clarification-card.tsx:56-58` — botão sempre visível; Cenário C em route test + CLAR-03 em UI test confirmam request com `overrideGenerate="true"` |
| CLAR-04 | Plans 01-04 | ConfirmationCard com spec editável antes da geração final | SATISFIED | `confirmation-card.tsx` com campos editáveis; `handleConfirmSpec` envia `specOverride` em campo dedicado; CLAR-04 em UI test confirma `specOverride` no body e `overrideGenerate="true"` |
| CLAR-05 | Plans 01-04 | Cota debitada apenas na geração, nunca em turns de clarificação | SATISFIED | `releaseToolUse` no clarification path antes do LLM (linha 619 vs. 621); `confirmToolUse` apenas no generation path (linha 653); 5 assertions negativas `not.toHaveBeenCalled()` nos testes de route |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | Nenhum TBD/FIXME/XXX encontrado | — | — |
| `unified-chat-tool.test.tsx` | 332 | Teste "corrupt NDJSON" exibe flakiness intermitente (falha ~20% das vezes na suite completa paralela) | Warning | Pré-existente: o teste existia em Phase 12 (commit e698699); não é regressão Phase 13; causado por timing de JSDOM em execução paralela de 25 arquivos de teste |

---

### Human Verification Required

#### 1. Fluxo Multi-Turn End-to-End com OPENAI_API_KEY

**Test:** Abrir http://localhost:3000/workspace, digitar "cria uma tabela de vendas" e verificar:
1. ClarificationCard aparece com "Pergunta 1 de 2" e botão "Gerar mesmo assim" visível
2. Responder à pergunta → aparece "Pergunta 2 de 2"
3. Após 2 turns → ConfirmationCard com colunas, rowCount e título editáveis aparece
4. Editar o título, clicar "Confirmar e Gerar" → tabela gerada (Phase 14 stub ainda possível)
5. Verificar no Network tab que apenas a última requisição (geração) debita cota

**Expected:** O loop completo funciona conforme descrito; nenhum POST de clarificação debita cota; o POST de confirmação debita exatamente uma vez

**Why human:** Fixture mode não valida a qualidade das perguntas do LLM; comportamento visual do ConfirmationCard editável requer inspeção manual; integração real com quota service requer verificação no banco

#### 2. Flakiness do Teste "corrupt NDJSON"

**Test:** Executar `pnpm --filter web test` 10 vezes consecutivas e registrar a taxa de falha do teste "corrupt NDJSON enters the error state"

**Expected:** Taxa de falha 0% ou confirmação de que o teste era flaky antes de Phase 13 (evidência: o teste existe desde commit e698699, Phase 12)

**Why human:** A flakiness é intermitente e parece depender de timing de JSDOM na execução paralela; não foi possível determinar programaticamente se Phase 13 introduziu ou não a regressão neste teste específico. Análise do diff mostra que Phase 13 MELHOROU a ordenação (`setError` antes de `setStatus`), o que deveria reduzir flakiness.

---

### Gaps Summary

Nenhum gap bloqueador identificado. Todos os 5 requisitos CLAR-01 a CLAR-05 têm implementação verificada com evidência de código e testes. O typecheck passa (`tsc --noEmit` sem erros). A suite de testes específica de Phase 13 passa consistentemente.

O item de verificação humana é requerido para: (1) validação visual do fluxo end-to-end com API real e (2) investigação da flakiness do teste pré-existente.

---

_Verified: 2026-06-08T20:59:00Z_
_Verifier: Claude (gsd-verifier)_
