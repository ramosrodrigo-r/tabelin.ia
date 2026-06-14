---
phase: 21-export-persistencia-da-planilha-conversa
plan: 02
subsystem: workspace-ui
tags: [nextjs-app-router, server-components, react-context, persistence, hydration, reset-coerente]

# Dependency graph
requires:
  - phase: 21-export-persistencia-da-planilha-conversa
    plan: 01
    provides: "getActiveSpreadsheetSpec, findUnifiedConversationExchanges, WorkspaceStateProvider initialSpec prop"
  - phase: 20-validacao
    provides: "getSessionFromCookieHeader, WorkspaceStateProvider/seedToGridState, SAMPLE_SPEC"
provides:
  - "WorkspaceLayout carrega o spec ativo server-side e passa initialSpec ao WorkspaceShell"
  - "WorkspaceShell encaminha initialSpec ao WorkspaceStateProvider"
  - "WorkspacePage hidrata UnifiedChatTool com initialExchanges (historico persistido)"
  - "Reset coerente: handleNewConversation reseta a planilha viva para SAMPLE_SPEC"
affects: [UX sem flash na inicializacao, reset sincronizado conversa+planilha]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component carrega estado persistido (Prisma) e injeta como prop serializada no Client Component (sem flash)"
    - "Mapeamento ConversationExchange[] -> PersistedExchange[] atravessando a fronteira RSC (Date/Json serializados pelo Next.js)"
    - "Reset coerente: limpar conversa dispara workspaceState.resetToSeed() (planilha volta a SAMPLE_SPEC)"

key-files:
  created: []
  modified:
    - apps/web/src/app/(workspace)/workspace/layout.tsx
    - apps/web/src/components/app/workspace-shell.tsx
    - apps/web/src/app/(workspace)/workspace/page.tsx
    - apps/web/src/features/unified-chat/unified-chat-tool.tsx
    - apps/web/tests/unified-chat-tool.test.tsx

key-decisions:
  - "WorkspacePage obtem o usuario via getCachedUser (React cache) — sem custo extra de query, reusa a sessao ja resolvida pelo layout"
  - "getActiveSpreadsheetSpec(user.id) ?? undefined: null vira undefined para casar com a prop opcional initialSpec (provider faz fallback a SAMPLE_SPEC)"
  - "initialExchanges mapeado explicitamente campo-a-campo (id, userPrompt, assistantPayload, mode, platform, dialect, createdAt) — nao repassa o row Prisma cru"

patterns-established:
  - "Hidratacao server-side de estado de UI via props serializadas (planilha + chat)"
  - "Reset sincronizado conversa->planilha no callback de nova conversa"

requirements-completed: [PERS-03, PERS-04]

# Metrics
duration: ~2min
completed: 2026-06-14
status: complete
---

# Phase 21 Plan 02: Server Component Loading & UI Integration Summary

**Fiacao server-side do estado persistido nos Server Components do workspace (layout + page), hidratando planilha e chat sem flash, mais reset coerente que devolve a planilha viva a semente ao iniciar nova conversa.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-14T20:54:44Z
- **Completed:** 2026-06-14T20:57:00Z
- **Tasks:** 4
- **Files modified:** 5 (todos modificados, 0 criados)

## Accomplishments
- `WorkspaceLayout` (Server Component) carrega `getActiveSpreadsheetSpec(user.id)` e passa `initialSpec` para `<WorkspaceShell>` — inicializacao da planilha sem flash (D-03).
- `WorkspaceShell` aceita `initialSpec?: TableSpecPayload` e o encaminha a `<WorkspaceStateProvider initialSpec={...}>`.
- `WorkspacePage` (Server Component) carrega `findUnifiedConversationExchanges(user.id)`, mapeia `ConversationExchange[]` -> `PersistedExchange[]` e passa `initialExchanges` para `<UnifiedChatTool>` — chat hidratado server-side (D-03).
- `handleNewConversation` chama `workspaceState.resetToSeed()`: ao limpar a conversa, a planilha viva volta a `SAMPLE_SPEC` (D-04, reset coerente).
- 3 testes novos no `unified-chat-tool.test.tsx` (reset da grade para a semente; hidratacao de `initialExchanges`), suite completa verde.

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: WorkspaceLayout carrega spec ativo (server-side)** - `8301348` (feat)
2. **Task 2: WorkspaceShell repassa initialSpec** - `c1b83ea` (feat)
3. **Task 3: WorkspacePage hidrata UnifiedChatTool com historico** - `f299c73` (feat)
4. **Task 4: Reset coerente da planilha + testes** - `63330c4` (feat, inclui testes)

## Files Created/Modified
- `apps/web/src/app/(workspace)/workspace/layout.tsx` - importa e chama `getActiveSpreadsheetSpec(user.id)`; passa `initialSpec` ao `WorkspaceShell`.
- `apps/web/src/components/app/workspace-shell.tsx` - prop `initialSpec?: TableSpecPayload` encaminhada ao `WorkspaceStateProvider`.
- `apps/web/src/app/(workspace)/workspace/page.tsx` - resolve usuario (`getCachedUser`), carrega historico unificado, mapeia para `PersistedExchange[]` e injeta `initialExchanges`.
- `apps/web/src/features/unified-chat/unified-chat-tool.tsx` - `handleNewConversation` chama `workspaceState.resetToSeed()`; dependencia `workspaceState` adicionada ao `useCallback`.
- `apps/web/tests/unified-chat-tool.test.tsx` - cobertura do reset coerente e da hidratacao server-side.

## Decisions Made
- **getCachedUser no WorkspacePage:** o page reusa a sessao via `cache(getCurrentUser)`, evitando segunda query de auth; redireciona a `/sign-in` se ausente (mesmo guard do layout).
- **null -> undefined na prop:** `getActiveSpreadsheetSpec` retorna `TableSpecPayload | null`; converte-se `?? undefined` para casar com a prop opcional `initialSpec`, deixando o provider fazer o fallback a `SAMPLE_SPEC`.
- **Mapeamento explicito ConversationExchange -> PersistedExchange:** evita vazar campos Prisma nao usados pela UI e deixa explicita a serializacao de `createdAt` (Date) e `assistantPayload` (Json) na fronteira RSC.

## Deviations from Plan

None - plano executado exatamente como escrito. A "Verification Plan" foi atendida estendendo `tests/unified-chat-tool.test.tsx` (reset coerente + hidratacao de props iniciais). Nao foi necessario alterar `tests/topbar.test.tsx`: o fluxo de "Apagar historico" do topbar ja era coberto, e o comportamento novo de reset da planilha e responsabilidade do `UnifiedChatTool` (testado la). Os itens de UAT manual (recarregar, exportar CSV/XLSX) sao verificacao humana — codigo de suporte ja presente.

## Issues Encountered
None. Typecheck limpo de primeira; suite completa verde (278 passed, 1 skipped) sem disparar o flake conhecido do NDJSON corrompido.

## Requirements Coverage
- **PERS-03** (inicializacao server-side sem flash): coberto pela fiacao de `initialSpec` (layout->shell->provider) e `initialExchanges` (page->UnifiedChatTool).
- **PERS-04** (reset coerente conversa+planilha): coberto por `handleNewConversation` chamando `resetToSeed()`.
- PERS-01/PERS-02 ja entregues no Plan 21-01.

## User Setup Required
None - nenhuma configuracao externa. Reusa modelo Prisma e helpers existentes do Plan 21-01.

## Next Phase Readiness
- Persistencia ponta-a-ponta fiada: estado da planilha e historico do chat inicializam server-side e o reset e coerente.
- `pnpm -r typecheck` limpo; suite web verde (278 passed, 1 skipped).

## Self-Check: PASSED

- FOUND: apps/web/src/app/(workspace)/workspace/layout.tsx (getActiveSpreadsheetSpec + initialSpec)
- FOUND: apps/web/src/components/app/workspace-shell.tsx (initialSpec encaminhado)
- FOUND: apps/web/src/app/(workspace)/workspace/page.tsx (findUnifiedConversationExchanges + initialExchanges)
- FOUND: apps/web/src/features/unified-chat/unified-chat-tool.tsx (resetToSeed em handleNewConversation)
- FOUND: apps/web/tests/unified-chat-tool.test.tsx (testes novos)
- FOUND commits: 8301348, c1b83ea, f299c73, 63330c4

---
*Phase: 21-export-persistencia-da-planilha-conversa*
*Completed: 2026-06-14*
