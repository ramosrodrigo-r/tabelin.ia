---
phase: 17-desligar-monetiza-o-cota
plan: 01
subsystem: api
tags: [chat, streaming, quota-removal, entitlements-removal, vitest]

# Dependency graph
requires:
  - phase: 13-clarificacao-multi-turn
    provides: loop de clarificação unified_table (CLAR-01..05) e o roteamento que esta tarefa preserva
provides:
  - Rota POST /api/chat/unified sem nenhum gate de cota/Pro (reserveToolUse/confirmToolUse/releaseToolUse/ensureProUser/getUserEntitlement removidos)
  - unified-route.test.ts atualizado e verde, sem mocks/asserts de cota/billing
affects: [18-remover-tools-avulsos, 19-ingestao-anexos, 20-protocolo-mutacao]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Streams create*EventStream agora recebem `undefined` no lugar de quotaCheck.lastFreeUse (parametro opcional preservado para Phase 18)"

key-files:
  created: []
  modified:
    - apps/web/src/app/api/chat/unified/route.ts
    - apps/web/tests/unified-route.test.ts

key-decisions:
  - "quota-service.ts e entitlements.ts NÃO foram deletados nesta fatia (exceção de escopo documentada na PLAN) — ainda usados pelas rotas api/tools/* de propriedade da Phase 18"
  - "lastFreeUse trocado por `undefined` (parametro opcional) em vez de `false`, sem mudar assinatura de createXEventStream"

patterns-established:
  - "Remoção de gate transversal mantendo auth/classificação/switch-cases intactos, com edição lockstep do teste no mesmo commit"

requirements-completed: [CLEAN-04]

# Metrics
duration: 12min
completed: 2026-06-11
---

# Phase 17 Plan 01: Desligar gate de cota/entitlement da rota de chat unificada Summary

**Removido o pré-check de cota (429), os gates Pro de anexo e template (403) e todas as ~9 chamadas confirmToolUse/releaseToolUse/ensureProUser/getUserEntitlement de `POST /api/chat/unified`, com `quotaCheck.lastFreeUse` substituído por `undefined`; auth, classificação de intent, switch-cases e loop de clarificação preservados intactos e a suíte de 20 testes verde no mesmo commit.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-11T17:20:00Z
- **Completed:** 2026-06-11T17:32:00Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments
- Rota `apps/web/src/app/api/chat/unified/route.ts` não importa mais `getUserEntitlement` nem `reserveToolUse`/`confirmToolUse`/`releaseToolUse`; função local `ensureProUser` removida
- Removidos: pré-check 429 `quota_exceeded`, gate 403 `pro_required` (anexo) e gate 403 `pro_required` (template)
- Todas as chamadas `confirmToolUse`/`releaseToolUse` removidas (ingestão de arquivo, needs_file, file_analysis/ocr, switch de tools, loop de clarificação unified_table, catch final)
- `quotaCheck.lastFreeUse` substituído por `undefined` nas 5 chamadas `createXEventStream` (formula/sql/regex/script/template) — assinatura das funções não alterada
- `unified-route.test.ts` editado em lockstep: mocks de `quota-service`/`billing/entitlements` removidos, 2 testes de gate deletados (`returns quota 429...`, `blocks free multipart attachments...`), asserts de cota/Pro removidos dos testes sobreviventes — 20/20 testes verdes

## Task Commits

1. **Task 1: Remover o gate de cota/entitlement da rota de chat unificada** - `8a31ba2` (refactor)
2. **Task 2: Editar unified-route.test.ts para refletir a remoção do gate** - `4ce9b4b` (test)

**Plan metadata:** (commit a seguir)

## Files Created/Modified
- `apps/web/src/app/api/chat/unified/route.ts` - rota de chat sem gate de cota/Pro; auth, classificação, switch-cases e clarificação preservados (-48/+7 linhas)
- `apps/web/tests/unified-route.test.ts` - suíte sem mocks/asserts de cota/entitlement, 20 testes verdes (-96/+10 linhas)

## Decisions Made
- `quota-service.ts` e `entitlements.ts` permanecem no repo (exceção de escopo da PLAN): ainda consumidos pelas 10 rotas `api/tools/*` de propriedade da Phase 18; deletar agora quebraria `pnpm -r typecheck`. Removidos apenas como gate NA ROTA DE CHAT (escopo de SC#4 desta fatia).
- `quotaCheck.lastFreeUse` (boolean) substituído por `undefined` no 2º argumento opcional de `createXEventStream` — confirmado via leitura de `formula-stream.ts` que o parâmetro é `lastFreeUse?: boolean`.

## Deviations from Plan

None - plan executado exatamente como escrito.

## LOC (linhas de código) — wave 17-01

- `apps/web/src/app/api/chat/unified/route.ts`: +7 / -48 (líquido -41)
- `apps/web/tests/unified-route.test.ts`: +10 / -96 (líquido -86)
- **Total da wave:** +17 / -144 (líquido -127)

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Rota de chat sem nenhum símbolo de cota/Pro; `pnpm exec prisma generate` + typecheck do arquivo sem erros relacionados
- `quota-service.ts`/`entitlements.ts` permanecem como símbolos compartilhados até a Phase 18 remover as rotas `api/tools/*` que ainda os consomem
- Sem bloqueios para a próxima plan da Phase 17

---
*Phase: 17-desligar-monetiza-o-cota*
*Completed: 2026-06-11*

## Self-Check: PASSED
