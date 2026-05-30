---
phase: 08-multi-turn-llm-context
plan: "03"
subsystem: api
tags: [multi-turn, history, conversation, openai, vitest, integration-test]

requires:
  - phase: 08-02
    provides: resolve*Payload com parâmetro history opcional nos 4 stream modules

provides:
  - "4 route handlers (sql/regex/scripts/template) lendo histórico via findConversationExchanges antes de resolve*Payload"
  - "Suite de integração vitest (multi-turn-context.test.ts) com 11 testes cobrindo toolKind correto, isolamento e skip-on-error"
  - "Multi-turn end-to-end funcional: history lido → injetado → LLM (MULTI-01/MULTI-02/MULTI-03)"

affects:
  - future-phases
  - multi-turn-llm-context

tech-stack:
  added: []
  patterns:
    - "findConversationExchanges(user.id, toolKind) dentro do try, antes de resolve*Payload — padrão de wiring multi-turn"
    - "toolKind literal fixo por route — garante isolamento MULTI-03 (scripts usa 'script' singular)"
    - "Pro gate de template vem antes da leitura de histórico — T-08-10"

key-files:
  created:
    - apps/web/tests/multi-turn-context.test.ts
  modified:
    - apps/web/src/app/api/tools/sql/generate/route.ts
    - apps/web/src/app/api/tools/regex/generate/route.ts
    - apps/web/src/app/api/tools/scripts/generate/route.ts
    - apps/web/src/app/api/tools/template/generate/route.ts

key-decisions:
  - "toolKind 'script' singular em scripts/generate para casar com saveConversationExchange existente (MULTI-03)"
  - "Leitura do histórico no template entra DEPOIS do Pro gate (T-08-10 — usuário não-Pro recebe 403 antes de qualquer IO)"
  - "Nenhum try/catch extra ao redor de findConversationExchanges — skip-on-error já embutido no repository (D-09)"
  - "Regex passa history apenas no branch generate; explain permanece inalterado (D-03)"

patterns-established:
  - "Wiring multi-turn: const history = await findConversationExchanges(user.id, toolKind) → resolve*Payload({ request, history })"
  - "Teste de isolamento: chamar dois routes e assertar toolKinds distintos nas chamadas mock"
  - "Regressão toolKind singular: vi.fn expectation not.toHaveBeenCalledWith(..., 'scripts')"

requirements-completed: [MULTI-01, MULTI-02, MULTI-03]

duration: 12min
completed: 2026-05-30
---

# Phase 8 Plan 03: Wire Route Handlers Multi-turn Summary

**4 routes (sql/regex/scripts/template) agora leem histórico via `findConversationExchanges(user.id, toolKind)` dentro do try antes do resolve*Payload, fechando o multi-turn end-to-end com isolamento por tool e suite de integração verde (11 testes)**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-30T12:30:00Z
- **Completed:** 2026-05-30T12:42:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Wiring multi-turn completo nos 4 route handlers: `findConversationExchanges(user.id, toolKind)` inserido dentro do try como primeira linha antes de `resolve*Payload`, passando `history` adiante
- `scripts/generate` usa toolKind `"script"` singular — casar com o `saveConversationExchange` existente garante isolamento MULTI-03
- Template: leitura de histórico posicionada APÓS o Pro gate e dentro do try, cumprindo T-08-10 (usuário não-Pro recebe 403 sem qualquer IO de histórico)
- Suite de integração (`multi-turn-context.test.ts`) com 11 testes cobrindo: chamada com toolKind correto para cada tool, isolamento sql vs scripts, regressão "script" singular, skip-on-error 200, Pro gate antes da leitura

## Task Commits

1. **Task 1: Wire leitura de history nos 4 route handlers** — `198ce81` (feat)
2. **Task 2: Teste de integração — leitura por toolKind + isolamento** — `016bd43` (test)

**Metadados do plano:** (incluído no commit final do SUMMARY)

## Files Created/Modified

- `apps/web/src/app/api/tools/sql/generate/route.ts` — importa `findConversationExchanges`; lê history com toolKind `"sql"` antes de `resolveSqlPayload`
- `apps/web/src/app/api/tools/regex/generate/route.ts` — lê history com toolKind `"regex"`; passa ao `resolveRegexPayload({ mode: "generate", history })`
- `apps/web/src/app/api/tools/scripts/generate/route.ts` — lê history com toolKind `"script"` (SINGULAR — MULTI-03)
- `apps/web/src/app/api/tools/template/generate/route.ts` — lê history com toolKind `"template"` APÓS Pro gate, dentro do try
- `apps/web/tests/multi-turn-context.test.ts` — 11 testes de integração: toolKind correto por route, isolamento sql↔scripts, regressão "script" singular, skip-on-error D-09, Pro gate T-08-10

## Decisions Made

- `"script"` singular no scripts/generate para casar com o `saveConversationExchange` existente (que usa `toolKind: "script"`) — sem esta correspondência, leitura e escrita usariam chaves diferentes e o contexto seria sempre vazio (isolamento quebrado silenciosamente)
- Pro gate vem antes da leitura de histórico no template — seguiu a ordem existente da rota; não foi movido nada
- Sem tratamento de erro extra para `findConversationExchanges` — o repository já absorve erros e retorna `[]` (D-09); adicionar try/catch seria redundante
- Regex passa `history` apenas no modo `generate`; `explain` não foi alterado (D-03)

## Deviations from Plan

Nenhuma — plano executado exatamente como escrito.

## Issues Encountered

Nenhum — todos os 4 routes tinham estrutura auth→quota→try idêntica, facilitando a inserção uniforme da leitura de histórico.

## Known Stubs

Nenhum — a leitura do histórico é real (via repository mock nos testes); nenhum valor hardcoded ou placeholder foi introduzido.

## Threat Flags

Nenhuma nova superfície de segurança foi introduzida. Mitigações T-08-07/T-08-08/T-08-09/T-08-10 do threat model do plano estão cobertas:
- T-08-07 (IDOR): `findConversationExchanges(user.id, ...)` — `user.id` sempre vem da sessão autenticada
- T-08-08 (cross-tool): toolKind literal fixo por route; "script" singular validado por teste de regressão
- T-08-09 (DoS via falha de leitura): skip-on-error embutido no repository; `response.status === 200` com history `[]` coberto por 4 testes
- T-08-10 (Pro gate bypass): `findConversationExchanges` no template só é chamado após o Pro gate; coberto por teste

## Self-Check

**Arquivos criados:**

- `apps/web/tests/multi-turn-context.test.ts`: FOUND

**Commits:**

- `198ce81`: FOUND
- `016bd43`: FOUND

**Verificação automatizada:**

- `pnpm typecheck`: saiu com código 0
- `pnpm vitest run tests/multi-turn-context.test.ts`: 11/11 testes passaram

## Self-Check: PASSED

## Next Phase Readiness

- Multi-turn end-to-end completo: history lido (Wave 3) → injetado nos messages (Wave 2) → context-messages.ts serializa (Wave 1)
- MULTI-01 (follow-ups funcionais), MULTI-02 (truncagem), MULTI-03 (isolamento por tool) todos atendidos
- Phase 08 concluída — 3 planos executados, todos os requirements da fase satisfeitos

---
*Phase: 08-multi-turn-llm-context*
*Completed: 2026-05-30*
