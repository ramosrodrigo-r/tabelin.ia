---
phase: 21-export-persistencia-da-planilha-conversa
plan: 03
subsystem: database
tags: [zod, prisma, react, persistence, round-trip, regression-tests]

# Dependency graph
requires:
  - phase: 21-export-persistencia-da-planilha-conversa
    provides: "saveActiveSpreadsheetSpec/getActiveSpreadsheetSpec, seedToGridState + auto-save debancado, tableSpecPayloadSchema (21-01/21-02)"
provides:
  - "deriveColumnKey exportado de @tabelin/shared (normalização canônica de key compartilhada schema↔provider)"
  - "tableSpecPayloadSchema com superRefine de unicidade de key efetiva (rejeita colunas colidentes)"
  - "MAX_ACTIVE_SPEC_BYTES + guardActiveSpecSize que LANÇA em oversize (sem placeholder descartável)"
  - "saveActiveSpreadsheetSpec falha-em-voz-alta (propaga erro → rota 500)"
  - "seedToGridState com dedupe de key na escrita (round-trip de colisão sem perda)"
  - "resetToSeed que suprime o auto-save (Nova conversa não ressuscita a linha unified_table)"
affects: [persistencia-da-planilha, export, unified-chat]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Key efetiva canônica única (deriveColumnKey) compartilhada entre validação de schema e escrita de grid — evita drift"
    - "Guard dedicado por domínio: spec ativo (fonte de verdade) lança em oversize; histórico de chat tolera truncamento"
    - "Supressão de auto-save por pré-marcação de lastSavedRef (coordenação reset↔persistência sem POST de delete)"
    - "Regressão contra helper real mockando apenas a fronteira de banco (Prisma), nunca o helper sob teste"

key-files:
  created:
    - apps/web/tests/conversation-repository-active-spec.test.ts
  modified:
    - packages/shared/src/unified-chat/schema.ts
    - apps/web/src/server/tools/conversation-repository.ts
    - apps/web/src/components/app/workspace-state-context.tsx
    - apps/web/tests/unified-schema.test.ts
    - apps/web/tests/workspace-state-route.test.ts
    - apps/web/tests/workspace-state-context.test.tsx
    - apps/web/tests/unified-chat-tool.test.tsx

key-decisions:
  - "Dedupe de key na ESCRITA (seedToGridState: Set + sufixo de índice) é a garantia primária de round-trip; o superRefine do schema é a segunda linha (só pega colisões que a própria normalização produz)"
  - "MAX_ACTIVE_SPEC_BYTES = 512 KB: folga ampla sobre o pior caso legítimo 200×26 pt-BR; mantém 32 KB para o histórico de chat (caminhos distintos)"
  - "Schema test cobre @tabelin/shared a partir do pacote web (packages/shared não tem test runner próprio)"

patterns-established:
  - "Persistência fonte-de-verdade falha-em-voz-alta; persistência tolerante-a-perda trunca silenciosamente — guards separados"
  - "Testes de regressão de helper exercitam o modo de falha REAL (sem mock que mascare o comportamento do helper)"

requirements-completed: [PERS-03, PERS-04]

# Metrics
duration: 18min
completed: 2026-06-14
status: complete
---

# Phase 21 Plan 03: Gap-closure de round-trip e reset coerente da planilha Summary

**Fecha os 4 defeitos de perda de dados da Phase 21 (CR-01/CR-02/WR-03/WR-04): spec ativo persiste sem placeholder, save falho propaga para 500, keys colidentes fazem round-trip sem perda, e "Nova conversa" não ressuscita o SAMPLE_SPEC via auto-save.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-06-14T22:17Z
- **Completed:** 2026-06-14T22:23Z
- **Tasks:** 3
- **Files modified:** 8 (1 criado, 7 modificados)

## Accomplishments
- **WR-04:** `guardActiveSpecSize` + `MAX_ACTIVE_SPEC_BYTES` (512 KB) — spec ativo oversize LANÇA em vez de virar `{truncated:true}`; uma sheet 200×26 pt-BR persiste intacta.
- **WR-03:** `saveActiveSpreadsheetSpec` deixou de engolir o erro; agora propaga → `POST /api/workspace/state` responde 500 → cliente não avança `lastSavedRef`.
- **CR-02:** `deriveColumnKey` exportado de `@tabelin/shared`; `tableSpecPayloadSchema.superRefine` rejeita keys colidentes; `seedToGridState` desambigua keys na escrita (Set + sufixo) → round-trip de colisão preserva os dados de ambas as colunas.
- **CR-01:** `resetToSeed` pré-marca `lastSavedRef` → o auto-save é suprimido no reset → "Nova conversa" deixa a linha `unified_table` apagada (sem re-semear SAMPLE_SPEC).
- Cada gap tem regressão dedicada exercitando o modo de falha real (a nova suíte `conversation-repository-active-spec.test.ts` mocka só o Prisma, nunca o helper).

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Persistência falha-em-voz-alta + schema garante key única** - `60f92d8` (fix)
2. **Task 2: Dedupe de key no grid + supressão do auto-save no reset** - `ca03d1d` (fix)
3. **Task 3: "Nova conversa" não dispara auto-save de estado (end-to-end)** - `42671e8` (test)

_TDD: a implementação e os testes de regressão foram entregues juntos por task; cada commit deixa a verify da task verde._

## Files Created/Modified
- `packages/shared/src/unified-chat/schema.ts` — `deriveColumnKey` + `superRefine` de unicidade de key efetiva.
- `apps/web/src/server/tools/conversation-repository.ts` — `MAX_ACTIVE_SPEC_BYTES`, `guardActiveSpecSize` (lança em oversize), `saveActiveSpreadsheetSpec` propaga falha.
- `apps/web/src/components/app/workspace-state-context.tsx` — dedupe de key em `seedToGridState`, helper `gridStateToSpecJson`, `resetToSeed` suprime auto-save.
- `apps/web/tests/conversation-repository-active-spec.test.ts` (novo) — regressões do helper real: oversize rejeitado, propagação de erro, 200×26 pt-BR persiste intacto.
- `apps/web/tests/unified-schema.test.ts` — testes de colisão/unicidade de key + `deriveColumnKey`.
- `apps/web/tests/workspace-state-route.test.ts` — 500 reflete propagação real + rejeição de colisão (422).
- `apps/web/tests/workspace-state-context.test.tsx` — round-trip de colisão + supressão do auto-save no reset.
- `apps/web/tests/unified-chat-tool.test.tsx` — fluxo "Nova conversa" assertando zero POST de estado.

## Decisions Made
- A dedupe de escrita (`seedToGridState`) é a garantia primária de round-trip; o `superRefine` do schema é defesa secundária — conforme nota do plan-checker (ponto 2), uma vez que a normalização do schema só detecta colisões que ela própria produz.
- A supressão da Task 2 vive em `resetToSeed` (useCallback), portanto cobre TODOS os callers de `resetToSeed` — incluindo o reset por botão da grade (WR-01), não só o "Nova conversa" (plan-checker ponto 1).
- O mock de fetch da Task 3 filtra por URL+method (`/api/workspace/state` POST) para distinguir o POST de estado do stream `/api/chat/unified` (plan-checker ponto 3); a asserção é "zero POSTs de estado".

## Deviations from Plan

None - plan executed exactly as written.

(Observação não-desviante: os testes de schema de `@tabelin/shared` foram adicionados ao pacote `web` em `unified-schema.test.ts` porque `packages/shared` não tem test runner — `pnpm --filter @tabelin/shared test` não existe; a cobertura de schema roda via `pnpm --filter web test`. O contrato exportado de `@tabelin/shared` é exercitado igual.)

## Issues Encountered
- A primeira versão do teste end-to-end da Task 3 usava fake timers + `userEvent` async, o que contaminou os timers de testes subsequentes (5 timeouts). Reescrito para timers reais (padrão do teste D-04 já no arquivo) com espera real de 1,7s além do debounce de 1,5s — suíte completa verde.

## User Setup Required
None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness
- SC3 (round-trip de persistência) e SC5 (reset coerente) passam para casos realistas: sheets grandes, nomes de coluna duplicados, falha de gravação, fluxo "Nova conversa".
- `pnpm -r typecheck` limpo; suíte web 291 passed / 1 skipped; sem regressão do flaky NDJSON.
- Pronto para nova verificação da Phase 21.

## Self-Check: PASSED

- Arquivos criados/modificados confirmados em disco (5/5 verificados).
- Commits confirmados: `60f92d8`, `ca03d1d`, `42671e8`.

---
*Phase: 21-export-persistencia-da-planilha-conversa*
*Completed: 2026-06-14*
