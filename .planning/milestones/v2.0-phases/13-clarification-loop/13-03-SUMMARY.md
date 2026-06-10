---
phase: 13-clarification-loop
plan: "03"
subsystem: api
tags: [clarification-loop, quota, route, table-spec, vitest, server-side-validation]

dependency_graph:
  requires:
    - phase: 13-clarification-loop/13-02
      provides: "askClarificationQuestion, buildTableSpec (table-clarifier.ts), tableClarQuestionPayloadSchema, tableSpecPayloadSchema (@tabelin/shared)"
    - phase: 12-intent-classifier-unified-route
      provides: "route.ts com case unified_table (table_stub) — ponto de bifurcação"
  provides:
    - apps/web/src/app/api/chat/unified/route.ts — case unified_table bifurcado com clarification e generation path
    - apps/web/tests/unified-route.test.ts — 8 novos cenários cobrindo CLAR-01..05 com assertions negativas
  affects:
    - Plan 04 (UI) usa os events table_clar_question e table_spec emitidos por esta rota
    - Plan 14 (geração de tabela interativa) recebe o table_spec payload desta rota

tech-stack:
  added: []
  patterns:
    - "Bifurcação determinística clarification/generation: clarTurnCount derivado exclusivamente de PostgreSQL (findConversationExchanges), nunca de campo client-side"
    - "releaseToolUse imediato no clarification path (antes do LLM), confirmToolUse apenas no generation path — CLAR-05"
    - "overrideGenerate validado server-side como asString(input.overrideGenerate) === 'true' — T-13-07"
    - "specOverride re-validado com tableSpecPayloadSchema.safeParse no servidor — T-13-10"
    - "conservativeClarTurnCount: histórico vazio + prompt sem tabela → MAX (fallback anti-loop infinito)"
    - "resolveOverrideSpec: JSON.parse em try/catch + safeParse — retorna null se ausente/inválido"

key-files:
  created: []
  modified:
    - apps/web/src/app/api/chat/unified/route.ts
    - apps/web/tests/unified-route.test.ts

key-decisions:
  - "clarTurnCount derivado exclusivamente de findConversationExchanges — nunca de campo client-side (T-13-08)"
  - "releaseToolUse chamado IMEDIATAMENTE ao entrar no clarification path, antes de qualquer LLM call — CLAR-05, T-13-09"
  - "specOverride é campo DEDICADO no body (não derivado de prompt); re-validado com tableSpecPayloadSchema.safeParse — T-13-10"
  - "fallback conservativo: histórico vazio + prompt sem variação de 'tabela' → tratado como MAX_CLAR_TURNS (evita loop infinito em falha silenciosa do banco)"
  - "overrideGenerate comparado literalmente a string 'true' via asString() — nunca booleano do client — T-13-07"
  - "teste existente table_stub atualizado para refletir novo behavior do generation path (updated behavior comentado)"

patterns-established:
  - "Campos opcionais de override no body (overrideGenerate, specOverride) lidos via asString() — mesmo padrão de overrideIntent"
  - "Helpers locais de domínio (countClarTurns, mergeSpecFromHistory, conservativeClarTurnCount, resolveOverrideSpec) definidos antes do switch/case"
  - "Mock de serviços de AI (table-clarifier) adicionado ao vi.hoisted para testes de rota — mesmo padrão dos outros serviços"

requirements-completed: [CLAR-01, CLAR-02, CLAR-03, CLAR-05]

duration: ~25min
completed: "2026-06-08"
---

# Phase 13 Plan 03: Wave 2 — Bifurcação do case unified_table (clarification e generation path) Summary

**route.ts bifurcado com quota correta em cada path: releaseToolUse no clarification path (CLAR-05), confirmToolUse no generation path; 18 testes passam incluindo 8 cenários novos com assertions negativas de confirmToolUse**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-08T19:50:00Z
- **Completed:** 2026-06-08T19:55:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `case "unified_table"` bifurcado em dois sub-caminhos mutuamente exclusivos: clarification path (`clarTurnCount < MAX_CLAR_TURNS` e sem `overrideGenerate`) e generation path (teto atingido ou `overrideGenerate="true"`)
- Cota correta em cada path: `releaseToolUse` imediato no clarification path (CLAR-05, T-13-09); `confirmToolUse` apenas no generation path
- `clarTurnCount` derivado exclusivamente de `findConversationExchanges` — campo client-side não existe na lógica do servidor (T-13-08)
- `overrideGenerate` validado server-side como string literal `"true"` via `asString()` (T-13-07)
- `specOverride` lido do campo dedicado do body, re-validado com `tableSpecPayloadSchema.safeParse` antes de usar; fallback para `buildTableSpec` se ausente/inválido (T-13-10)
- Fallback conservativo implementado: histórico vazio + prompt sem variação de "tabela" → `clarTurnCount = MAX_CLAR_TURNS` (evita loop infinito em falha silenciosa do banco — Armadilha 2)
- 8 novos cenários de teste cobrindo CLAR-01..05: cenários A (clarificação turno 0), B (geração turno 2), C (overrideGenerate), D (turno 1), E (regressão CLAR-05), F (fallback conservativo), G (specOverride válida), G-variante (specOverride inválida)

## Task Commits

1. **Task 1: Bifurcar case unified_table — clarification path e generation path** - `136a5e8` (feat)
2. **Task 2: Tests de rota — CLAR-01..05 com assertions negativas de confirmToolUse** - `a1d7d10` (feat)

## Files Created/Modified

- `apps/web/src/app/api/chat/unified/route.ts` — `overrideGenerate` e `specOverride` adicionados a `UnifiedFields`; imports de `askClarificationQuestion`, `buildTableSpec`, `TableSpecPayload`, `tableSpecPayloadSchema`; helpers `countClarTurns`, `mergeSpecFromHistory`, `promptLooksLikeNewTableRequest`, `conservativeClarTurnCount`, `resolveOverrideSpec`; case `unified_table` bifurcado com dois sub-caminhos determinísticos
- `apps/web/tests/unified-route.test.ts` — mock de `@/server/ai/table-clarifier` adicionado; `tableSpecFixture` no `routeMocks`; `askClarificationQuestion` e `buildTableSpec` mockados no `beforeEach`; teste existente de `table_stub` atualizado para `table_spec` (updated behavior); novo describe block com 8 cenários de clarification loop

## Decisions Made

- `overrideGenerate === "true"` como string literal — nunca booleano do client; mesma filosofia de `asString()` já em uso para outros campos override
- `specOverride` é campo dedicado no body (não sobrescreve `prompt`) — campo separado evita conflito com o texto do usuário
- Teste de `table_stub` atualizado para refletir o novo behavior (generation path com clarTurnCount >= 2) em vez de remover o teste

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Teste existente de table_stub precisou de atualização**
- **Found during:** Task 1 (bifurcação do route.ts)
- **Issue:** O teste pré-existente `"returns a table stub payload and saves it under unified_table"` esperava `kind: "table_stub"`. Com a bifurcação, `kind: "table_stub"` não é mais emitido — o behavior foi substituído pelo clarification/generation path. O smoke test da Task 1 falhava.
- **Fix:** Atualizado o teste para simular `clarTurnCount >= 2` (mockando `findConversationExchanges` com 2 exchanges de clarificação) e assertar `kind: "table_spec"` com comentário `// updated behavior (Plan 13-03)`.
- **Files modified:** apps/web/tests/unified-route.test.ts
- **Verification:** `pnpm exec vitest run tests/unified-route.test.ts` — 10/10 testes passam após a correção
- **Committed in:** 136a5e8 (Task 1 commit — atualização do mock incluída junto com o commit de implementação)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug — teste desatualizado após mudança de behavior)
**Impact on plan:** Correção necessária e esperada — o behavior antigo (table_stub) foi intencionalmente substituído pelo loop de clarificação. O teste atualizado reflete o behavior correto do sistema.

## Issues Encountered

- Nenhum problema além da atualização do teste existente (documentado como desvio acima).
- Erros de TypeScript pré-existentes no worktree (Prisma não gerado) continuam presentes mas não são novos — confirmado via `grep "route.ts"` no output do typecheck.

## Known Stubs

Nenhum — toda a lógica de bifurcação é funcional; `buildTableSpec` e `askClarificationQuestion` são implementações reais (Plan 02).

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-13-07 (mitigado) | route.ts | `overrideGenerate` validado como string literal "true" via asString() — não confia em booleano do client |
| T-13-08 (mitigado) | route.ts | `clarTurnCount` derivado exclusivamente de PostgreSQL — campo client-side não existe |
| T-13-09 (mitigado) | route.ts | `releaseToolUse` chamado ANTES do LLM no clarification path; testado com `confirmToolUse.not.toHaveBeenCalled()` |
| T-13-10 (mitigado) | route.ts | `specOverride` re-validado com `tableSpecPayloadSchema.safeParse` — fallback para `buildTableSpec` se inválido |

## Next Phase Readiness

- Plan 04 (UI) pode importar os eventos `table_clar_question` e `table_spec` emitidos por esta rota
- `ClarificationCard` receberá payload com `kind: "table_clar_question"`, `question`, `turnIndex`, `totalTurns`, `canSkip`
- `ConfirmationCard` receberá payload com `kind: "table_spec"`, podendo serializar como `specOverride` no body do request de confirmação
- `overrideGenerate: "true"` deve ser enviado no body ao clicar "Gerar mesmo assim" ou "Confirmar"

## Self-Check: PASSED

- [x] `apps/web/src/app/api/chat/unified/route.ts` tem `releaseToolUse` (7 ocorrências), `table_clar_question` (3), `table_spec` (3), `MAX_CLAR_TURNS` (4), `overrideGenerate` (4), `specOverride` (8), `tableSpecPayloadSchema` (3)
- [x] `apps/web/tests/unified-route.test.ts` tem 18 testes passando (10 existentes + 8 novos)
- [x] `confirmToolUse.not.toHaveBeenCalled()` presente em ao menos 3 cenários de clarificação
- [x] `releaseToolUse` assertions positivas em ao menos 3 cenários
- [x] Commit 136a5e8 existe (Task 1)
- [x] Commit a1d7d10 existe (Task 2)
- [x] Nenhum erro TypeScript novo em route.ts
- [x] Nenhum stub presente nos arquivos modificados
