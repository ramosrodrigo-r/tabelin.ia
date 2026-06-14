---
phase: 21-export-persistencia-da-planilha-conversa
plan: 01
subsystem: database
tags: [prisma, nextjs-app-router, zod, react-context, persistence, debounce]

# Dependency graph
requires:
  - phase: 18-chat-unificado
    provides: ConversationExchange model + saveConversationExchange/findConversationExchanges helpers, toolKind/mode (GENERATE_MODE) conventions
  - phase: 20-validacao
    provides: tableSpecPayloadSchema, getSessionFromCookieHeader, WorkspaceStateProvider/seedToGridState
provides:
  - "Repository helpers: getActiveSpreadsheetSpec, saveActiveSpreadsheetSpec, findUnifiedConversationExchanges"
  - "POST /api/workspace/state route (session auth + schema validation)"
  - "WorkspaceStateProvider initialSpec prop + debounced/deduplicated auto-save"
affects: [21-02, server-side workspace initialization, reset-coerente]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Spec ativo single-row por usuario via Serializable delete+create transaction (toolKind=unified_table, mode=active_spec)"
    - "Auto-save debancado (1.5s) deduplicado por useRef comparando JSON serializado; skip no mount inicial"
    - "Fail-closed na leitura de payload persistido (safeParse -> null -> SAMPLE_SPEC)"

key-files:
  created:
    - apps/web/src/app/api/workspace/state/route.ts
    - apps/web/tests/workspace-state-route.test.ts
    - apps/web/tests/workspace-state-context.test.tsx
  modified:
    - apps/web/src/server/tools/conversation-repository.ts
    - apps/web/src/components/app/workspace-state-context.tsx

key-decisions:
  - "mode=active_spec (nao GENERATE_MODE) para o spec persistido nao contaminar o historico multi-turn"
  - "Leitura do payload persistido validada com tableSpecPayloadSchema; payload invalido tratado como ausencia (fail-closed)"
  - "Auto-save reusa guardPayloadSize (teto 32 KB/linha) via saveActiveSpreadsheetSpec"

patterns-established:
  - "Persistencia idempotente single-row: delete+create em transaction Serializable"
  - "Debounce de efeito client-side com lastSavedRef para dedupe e mount-skip"

requirements-completed: [PERS-01, PERS-02]

# Metrics
duration: ~10min
completed: 2026-06-14
status: complete
---

# Phase 21 Plan 01: Banco de Dados, API Endpoint & Workspace State Provider Summary

**Persistencia do estado da planilha viva: helpers Prisma single-row, rota POST /api/workspace/state com auth+validacao, e auto-save debancado (1.5s) deduplicado no WorkspaceStateProvider.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-14T17:49:00Z
- **Completed:** 2026-06-14T17:51:50Z
- **Tasks:** 3
- **Files modified:** 5 (2 modificados, 3 criados)

## Accomplishments
- `conversation-repository.ts` exporta `getActiveSpreadsheetSpec`, `saveActiveSpreadsheetSpec` (delete+create transacional) e `findUnifiedConversationExchanges` (kinds sheet_operation/qa, mode generate, asc).
- Rota `POST /api/workspace/state` valida sessao via `getSessionFromCookieHeader` e corpo via `tableSpecPayloadSchema`, retornando 401/400/422/200/500.
- `WorkspaceStateProvider` aceita `initialSpec` opcional (seed a partir dele, fallback `SAMPLE_SPEC`) e dispara auto-save debancado/deduplicado sem POST no mount inicial.
- Cobertura de testes nova: 9 casos (5 da rota + 4 do provider), suite completa verde.

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Helpers no repositorio de conversas** - `33ff557` (feat)
2. **Task 2: Rota /api/workspace/state** - `c59042e` (feat, inclui testes da rota)
3. **Task 3: WorkspaceStateProvider initialSpec + auto-save** - `0cfa6bb` (feat, inclui testes do provider)

**Plan metadata:** (commit docs final desta entrega)

## Files Created/Modified
- `apps/web/src/server/tools/conversation-repository.ts` - 3 novos helpers de leitura/gravacao do spec ativo e leitura do historico unificado.
- `apps/web/src/app/api/workspace/state/route.ts` - endpoint POST de persistencia do estado da planilha.
- `apps/web/src/components/app/workspace-state-context.tsx` - prop `initialSpec` + `useEffect` de auto-save debancado com `lastSavedRef`.
- `apps/web/tests/workspace-state-route.test.ts` - testes da rota (auth, JSON invalido, schema invalido, sucesso, erro 500).
- `apps/web/tests/workspace-state-context.test.tsx` - testes do provider (init via initialSpec, fallback, skip no mount, POST debancado).

## Decisions Made
- **mode=active_spec** para o spec persistido: distinto de `GENERATE_MODE`, evitando que a planilha persistida entre no historico multi-turn lido por `findConversationExchanges`. Constantes `ACTIVE_SPEC_TOOL_KIND`/`ACTIVE_SPEC_MODE` centralizadas no repositorio (evita drift stringly-typed, mesmo padrao do GENERATE_MODE).
- **Fail-closed na leitura:** `getActiveSpreadsheetSpec` valida o payload persistido com `tableSpecPayloadSchema` e trata payload malformado como ausencia de spec, permitindo fallback seguro ao `SAMPLE_SPEC`.
- **Reuso de guardPayloadSize:** o auto-save respeita o teto de 32 KB/linha existente sem codigo novo de guarda.

## Deviations from Plan

None - plan executed exactly as written. A "Verification Plan" foi atendida criando `tests/workspace-state-route.test.ts` e `tests/workspace-state-context.test.tsx` (nomes equivalentes aos sugeridos no plano).

## Issues Encountered
- Teste do provider com fake timers inicialmente travava em `waitFor` (que depende de timers reais). Resolvido trocando por `await act(async () => vi.advanceTimersByTime(...))` para drenar o microtask do fetch deterministicamente.

## Requirements Coverage
- **PERS-01** (persistencia do estado da planilha): coberto pela camada de repositorio + rota + auto-save.
- **PERS-02** (auto-save debancado/deduplicado): coberto pelo `useEffect` com `lastSavedRef`.
- PERS-03 (inicializacao server-side sem flash) e PERS-04 (reset coerente) dependem da fiacao em layout/page e `unified-chat-tool` — escopo do Plan 21-02.

## User Setup Required
None - nenhuma configuracao de servico externo necessaria. Usa modelo Prisma existente (`ConversationExchange`), sem migration.

## Next Phase Readiness
- Camada de persistencia e provider prontos para serem fiados nos Server Components (D-03) e no reset coerente (D-04) no Plan 21-02.
- `pnpm -r typecheck` limpo; suite web verde (276 passed, 1 skipped).

## Self-Check: PASSED

- FOUND: apps/web/src/server/tools/conversation-repository.ts (helpers exportados)
- FOUND: apps/web/src/app/api/workspace/state/route.ts
- FOUND: apps/web/src/components/app/workspace-state-context.tsx (initialSpec + auto-save)
- FOUND: apps/web/tests/workspace-state-route.test.ts
- FOUND: apps/web/tests/workspace-state-context.test.tsx
- FOUND commits: 33ff557, c59042e, 0cfa6bb

---
*Phase: 21-export-persistencia-da-planilha-conversa*
*Completed: 2026-06-14*
