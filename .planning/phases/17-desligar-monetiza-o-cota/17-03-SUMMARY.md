---
phase: 17-desligar-monetiza-o-cota
plan: 03
subsystem: payments
tags: [mercadopago, billing, entitlements, prisma, vitest]

# Dependency graph
requires:
  - phase: 17-desligar-monetiza-o-cota (Plan 01)
    provides: remoção dos consumidores de checkout/upsell que chamavam a camada de billing
provides:
  - Camada de provedor de pagamento Mercado Pago totalmente removida (mercado-pago-client, checkout-service, webhook-service)
  - Rotas api/billing/checkout e api/billing/mercado-pago/webhook removidas (404)
  - Página (billing)/billing/return e route group removidos
  - entitlements.ts podado (activateProEntitlement/revokeProEntitlement removidos, getUserEntitlement preservado)
  - Dependência mercadopago removida do package.json e lockfile
  - Env vars MERCADO_PAGO_ACCESS_TOKEN/MERCADO_PAGO_WEBHOOK_SECRET/PRO_MONTHLY_PRICE_BRL/PRO_ANNUAL_PRICE_BRL removidas de .env.example (raiz)
  - Testes de billing OUT (billing-checkout.test.ts, mercado-pago-webhook.test.ts, e2e/billing.spec.ts) deletados
affects: [18-tabela-viva-tools, 22-cleanup-final]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - apps/web/src/server/billing/entitlements.ts
    - apps/web/package.json
    - .env.example
    - pnpm-lock.yaml

key-decisions:
  - "Cabeçalho '# Billing' em .env.example mantido (não ficou órfão — NEXT_PUBLIC_PRO_SUPPORT_EMAIL/WHATSAPP_URL permanecem sob ele para a Phase 18)"
  - "getUserEntitlement preservado integralmente em entitlements.ts; apenas activateProEntitlement/revokeProEntitlement e o type ActivateProOptions removidos, junto com o import não utilizado de PlanCycle"
  - "Migration Prisma destrutiva NÃO criada (CLEAN-08 fica para Phase 22); tabelas Entitlement/UsageLedger/BillingCheckout/PaymentEvent ficam órfãs no schema por enquanto"

patterns-established: []

requirements-completed: [CLEAN-04]

# Metrics
duration: 12min
completed: 2026-06-11
---

# Phase 17 Plan 03: Desligar camada Mercado Pago Summary

**Remoção completa do provedor de pagamento Mercado Pago (3 serviços + 2 rotas + página de retorno), poda de entitlements.ts preservando getUserEntitlement, remoção da dep mercadopago e das 4 env vars MP/PRO_PRICE, e exclusão dos 3 testes de billing OUT — typecheck e suite vitest verdes.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-11T20:16:00Z (aprox)
- **Completed:** 2026-06-11T20:27:59Z
- **Tasks:** 2
- **Files modified:** 13 (7 deletados na Task 1, 3 deletados + 3 modificados na Task 2)

## Accomplishments
- Camada de provedor de pagamento Mercado Pago (mercado-pago-client.ts, checkout-service.ts, webhook-service.ts) totalmente removida
- Rotas POST /api/billing/checkout e POST /api/billing/mercado-pago/webhook removidas (retornam 404 — SC#1)
- Route group `(billing)/billing/return` removido inteiro (página + diretório)
- entitlements.ts podado: activateProEntitlement, revokeProEntitlement e type ActivateProOptions removidos; getUserEntitlement preservado intacto para as 6 páginas de tool da Phase 18
- Dependência `mercadopago` removida de apps/web/package.json e do lockfile (pnpm install rodado, sem download de novos pacotes)
- 4 env vars MP/PRO_PRICE removidas de .env.example (raiz); NEXT_PUBLIC_PRO_SUPPORT_EMAIL/WHATSAPP_URL preservados
- 3 arquivos de teste de billing OUT deletados (billing-checkout.test.ts, mercado-pago-webhook.test.ts, e2e/billing.spec.ts)
- `pnpm -r typecheck` e `pnpm -r test` (374 passed, 1 skipped) verdes no mesmo conjunto de mudanças

## Task Commits

Each task was committed atomically:

1. **Task 1: Deletar a camada de provedor de pagamento (serviços, rotas, página) e podar entitlements.ts** - `2779711` (feat)
2. **Task 2: Remover a dependência mercadopago e as env vars MP/PRO_PRICE; deletar os testes de billing OUT** - `242174c` (chore)

_Nenhuma tarefa TDD neste plano (type="auto" puro, sem `<behavior>`)._

## Files Created/Modified

**Deletados (Task 1):**
- `apps/web/src/server/billing/mercado-pago-client.ts`
- `apps/web/src/server/billing/checkout-service.ts`
- `apps/web/src/server/billing/webhook-service.ts`
- `apps/web/src/app/api/billing/checkout/route.ts`
- `apps/web/src/app/api/billing/mercado-pago/webhook/route.ts`
- `apps/web/src/app/(billing)/billing/return/page.tsx` (e o route group `(billing)` inteiro, ficou vazio)

**Modificados (Task 1):**
- `apps/web/src/server/billing/entitlements.ts` - removidos ActivateProOptions/activateProEntitlement/revokeProEntitlement e import não usado de PlanCycle; getUserEntitlement preservado

**Deletados (Task 2):**
- `apps/web/tests/billing-checkout.test.ts`
- `apps/web/tests/mercado-pago-webhook.test.ts`
- `apps/web/tests/e2e/billing.spec.ts`

**Modificados (Task 2):**
- `apps/web/package.json` - removida dependência `mercadopago`
- `.env.example` (raiz do repo) - removidas 4 env vars MP/PRO_PRICE
- `pnpm-lock.yaml` - atualizado via `pnpm install`

## Decisions Made
- Cabeçalho "# Billing" em .env.example mantido (não ficou órfão — linhas NEXT_PUBLIC_PRO_SUPPORT_* permanecem sob ele)
- getUserEntitlement preservado conforme exceção de escopo documentada no plano (consumido por 6 páginas de tool da Phase 18 e request-cache.ts)
- Nenhuma migration Prisma criada — tabelas Entitlement/UsageLedger/BillingCheckout/PaymentEvent ficam órfãs no schema, conforme CLEAN-08 (Phase 22)

## Deviations from Plan

None - plan executado exatamente como escrito.

## Issues Encountered

Durante a execução, alguns comandos `cd /home/rodrigo/tabelin.ia` causaram drift temporário de cwd para o repositório principal (fora do worktree) ao validar `pnpm install`/`typecheck`/`test`. Antes de cada commit, foi feita a verificação de sentinela (`git rev-parse --show-toplevel` comparado ao toplevel de spawn) confirmando que o HEAD e o índice usados nos commits `2779711` e `242174c` pertencem corretamente ao branch `worktree-agent-aca0e0eff943610ef` do worktree. Nenhuma alteração foi commitada no repositório principal.

## User Setup Required

None - nenhuma configuração externa necessária. Recomendação operacional (não bloqueante, T-17-06): desativar o webhook configurado no painel Mercado Pago pós-deploy, já que a rota agora retorna 404.

## Next Phase Readiness

- Superfície de pagamento Mercado Pago (rotas, serviços, página, dep, env vars, testes) totalmente fora do código e da suite verde
- getUserEntitlement disponível e intacto para a Phase 18 consumir nas páginas de tool
- Subconjuntos MP/billing de CLEAN-09, CLEAN-10 e CLEAN-11 satisfeitos antecipadamente — Phase 22 deve marcá-los como done sem re-executar
- Migration destrutiva das tabelas Entitlement/UsageLedger/BillingCheckout/PaymentEvent permanece pendente para Phase 22 (CLEAN-08)

---
*Phase: 17-desligar-monetiza-o-cota*
*Completed: 2026-06-11*

## Self-Check: PASSED

- FOUND: .planning/phases/17-desligar-monetiza-o-cota/17-03-SUMMARY.md
- FOUND commit: 2779711
- FOUND commit: 242174c
- FOUND: apps/web/src/app/api/billing/checkout/route.ts removido (test ! -f)
- FOUND: apps/web/src/server/billing/mercado-pago-client.ts removido (test ! -f)
- FOUND: apps/web/tests/e2e/billing.spec.ts removido (test ! -f)
