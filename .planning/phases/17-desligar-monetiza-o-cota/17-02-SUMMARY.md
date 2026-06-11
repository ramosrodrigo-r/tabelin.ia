---
phase: 17-desligar-monetiza-o-cota
plan: 02
subsystem: ui
tags: [react, nextjs, vitest, playwright, css]

requires:
  - phase: 16-shell-split
    provides: shell split em painéis grid+chat sem sidebar/tool-nav

provides:
  - Topbar sem badge Pro (Sparkles/.pro-badge), seção "Suporte Pro" e prop entitlement
  - UnifiedChatTool sem prop entitlement, sem gating Pro de anexo/drop e sem os 3 banners de cota/Pro
  - use-unified-chat-stream sem estados quotaBlocked/proBlocked/lastFreeUse e sem branches 403 pro_required/429 quota_exceeded/evento quota_warning
  - layout.tsx e page.tsx do workspace sem chamadas a getCachedEntitlement (guard de auth via getCachedUser preservado)
  - globals.css sem .quota-warning/.quota-blocked/.pro-badge
  - Suíte vitest (371 testes) e typecheck verdes

affects: [18-classificador-router, 19-anexos]

tech-stack:
  added: []
  patterns:
    - "AttachmentButton mantém prop isPro obrigatória (Phase 19); chamador agora passa isPro={true} fixo até o componente ser revisitado"

key-files:
  created: []
  modified:
    - apps/web/src/components/app/topbar.tsx
    - apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts
    - apps/web/src/features/unified-chat/unified-chat-tool.tsx
    - apps/web/src/app/(workspace)/workspace/layout.tsx
    - apps/web/src/app/(workspace)/workspace/page.tsx
    - apps/web/src/styles/globals.css
    - apps/web/tests/topbar.test.tsx
    - apps/web/tests/unified-chat-tool.test.tsx
    - apps/web/src/app/(workspace)/workspace/__tests__/layout.test.tsx
    - apps/web/tests/e2e/smoke.spec.ts

key-decisions:
  - "AttachmentButton.isPro fixado em true no chamador (UnifiedChatTool) — símbolo/prop sobrevivem para Phase 19, sem invadir escopo de anexos"
  - "Teste 'free user drag-and-drop is ignored' reescrito para 'drag-and-drop attaches a valid file' — o gating Pro foi removido, então o comportamento esperado mudou de bloqueio para sucesso"
  - "supportLinks permanece na assinatura de tipos do Topbar (TypeScript) mas não é mais desestruturado no corpo — evita warning de variável não usada sob eslint --max-warnings=0"

patterns-established: []

requirements-completed: [CLEAN-04]

duration: 12min
completed: 2026-06-11
---

# Phase 17 Plan 02: Desligar UI de upsell/cota Summary

**Removida toda a UI de monetização (badge Pro, Suporte Pro, banners de cota/upgrade) do Topbar e do UnifiedChatTool, e os estados/branches de cota/Pro do hook de stream e dos layouts do workspace — suíte de 371 testes vitest e typecheck verdes no mesmo commit.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-11T20:19:00Z
- **Completed:** 2026-06-11T20:31:32Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Topbar enxuta: sem `entitlement`, `isPro`, badge `.pro-badge` (Sparkles) e seção "Suporte Pro" no account-menu; mantém Sair/Nova conversa/Privacidade
- `use-unified-chat-stream` sem `quotaBlocked`/`proBlocked`/`lastFreeUse` e sem os branches 403 `pro_required`/429 `quota_exceeded`/evento `quota_warning`; mantém 413/422 e parse NDJSON
- `UnifiedChatTool` sem prop `entitlement`/`isPro`; guarda de submit simplificada para `if (pending) return`; drop de arquivo liberado para todos; 3 blocos JSX de upsell removidos
- `layout.tsx`/`page.tsx` do workspace sem `getCachedEntitlement`; guard de auth (`getCachedUser` + redirect) preservado e coberto por teste
- `globals.css` sem `.quota-warning`, `.quota-blocked`, `.quota-blocked p`, `.pro-badge`
- 4 arquivos de teste (topbar, unified-chat-tool, layout, smoke e2e) ajustados em lockstep — 371 testes vitest passando

## Task Commits

1. **Task 1: Remover badge/Suporte Pro do Topbar e estados/branches de cota/Pro do hook de stream (+ testes topbar)** - `f3277a7` (feat)
2. **Task 2: Remover blocos de upsell do UnifiedChatTool e desfazer prop entitlement no layout/page (+ CSS + testes)** - `2923fd8` (feat)

## Files Created/Modified
- `apps/web/src/components/app/topbar.tsx` - remove entitlement/isPro/Sparkles/Mail/MessageCircle, pro-badge e seção Suporte Pro; supportLinks mantido só no tipo
- `apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts` - remove quotaBlocked/proBlocked/lastFreeUse, branches 403/429 de cota e handler quota_warning
- `apps/web/src/features/unified-chat/unified-chat-tool.tsx` - remove entitlement/isPro, gating de drop/anexo e os 3 banners de upsell; AttachmentButton recebe isPro={true} fixo
- `apps/web/src/app/(workspace)/workspace/layout.tsx` - remove getCachedEntitlement e prop entitlement do Topbar; guard de auth preservado
- `apps/web/src/app/(workspace)/workspace/page.tsx` - remove getCachedEntitlement/getCachedUser; UnifiedChatTool sem props
- `apps/web/src/styles/globals.css` - remove .quota-warning/.quota-blocked/.quota-blocked p/.pro-badge
- `apps/web/tests/topbar.test.tsx` - remove 3 testes de Suporte Pro/badge Pro dependentes de entitlement
- `apps/web/tests/unified-chat-tool.test.tsx` - remove fixtures freeEntitlement/proEntitlement; reescreve teste de drag-and-drop
- `apps/web/src/app/(workspace)/workspace/__tests__/layout.test.tsx` - remove mock getCachedEntitlement/freeEntitlement
- `apps/web/tests/e2e/smoke.spec.ts` - remove suites "smoke: quota block após 4 uses" e "smoke: checkout Pix" e o fixture formulaLastFreeUseBody

## Decisions Made
- AttachmentButton.isPro continua obrigatória na assinatura (Phase 19 ainda não revisitada); UnifiedChatTool agora passa `isPro={true}` fixo, conforme exceção de escopo documentada no plano (ler attachment-button.tsx antes confirmou a obrigatoriedade)
- supportLinks permanece no tipo de props do Topbar (interface estável para o layout) mas deixou de ser desestruturado no corpo, evitando warning de var não usada sob `--max-warnings=0`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Teste de drag-and-drop ficou incoerente com o novo comportamento**
- **Found during:** Task 2 (verificação `pnpm --filter web test unified-chat-tool layout`)
- **Issue:** O teste "free user drag-and-drop is ignored" assumia o gating `if (!isPro) return` no onDrop, removido pelo plano; com a remoção, o drop passa a anexar o arquivo, e a asserção `not.toBeInTheDocument()` falha
- **Fix:** Reescrito como "drag-and-drop attaches a valid file", asserindo que o chip de anexo aparece — reflete o comportamento correto pós-remoção do gating Pro
- **Files modified:** apps/web/tests/unified-chat-tool.test.tsx
- **Verification:** `pnpm --filter web test unified-chat-tool layout` verde (23/23)
- **Committed in:** 2923fd8 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Ajuste necessário para a suíte ficar verde após a remoção do gating, conforme exigido pela `<verification>` do plano. Sem scope creep.

## Issues Encountered
- O grep de aceite da Task 2 (`isPro|quotaBlocked|...` deve retornar 0 matches em unified-chat-tool.tsx) conflita com a própria instrução de `<action>`/`<interfaces>` do plano, que manda passar `isPro={true}` ao AttachmentButton porque a prop é obrigatória nesse componente (Phase 19 ainda não revisitada). Resolução: seguiu-se a instrução mais específica (`<interfaces>`/`<action>`), deixando `isPro={true}` como literal fixo — único uso remanescente do token `isPro` no arquivo, sem estado/lógica de Pro associada. `quotaBlocked`, `proBlocked`, `stream.lastFreeUse` e `UserEntitlement` têm 0 matches conforme exigido.
- Teste "corrupt NDJSON enters the error state" é conhecido como flaky em suíte completa (memória do projeto: passa isolado, falha intermitente em conjunto) — passou isolado (`vitest run unified-chat-tool -t "corrupt NDJSON"`) e na corrida completa final dos 371 testes.
- `pnpm exec tsc --noEmit` inicialmente reportou erros `.prisma/client` (falso-positivo conhecido em worktree) — resolvido rodando `pnpm exec prisma generate --schema ./prisma/schema.prisma` na raiz do worktree antes do typecheck.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Topbar/UnifiedChatTool/hook/layout/page/CSS livres de UI e estado de monetização/cota (SC#3 cumprido para esta fatia)
- `getCachedEntitlement`/`getUserEntitlement` preservados em `request-cache.ts`/`entitlements.ts` para Phase 18 (exceção SC#4 documentada)
- `tests/e2e/smoke.spec.ts` editado mas não exercitado pelo gate vitest (tests/e2e/** excluído); correctness validada via typecheck + 371 testes vitest verdes
- Próxima fatia (Plan 03 / Phase 18) pode prosseguir com a remoção das rotas de billing/checkout/webhooks sem dependências pendentes desta fatia de UI

---
*Phase: 17-desligar-monetiza-o-cota*
*Completed: 2026-06-11*

## Self-Check: PASSED
