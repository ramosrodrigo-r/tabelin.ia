---
phase: 07-frontend-history
plan: "04"
subsystem: frontend/client-components
tags: [tool-components, history, seed, context-api, topbar, usePathname, onNewConversation]
dependency_graph:
  requires:
    - "07-02"  # Topbar com toolKind/onNewConversation props disponíveis
    - "07-03"  # initialExchanges sendo passado pelas pages
  provides:
    - seed de exchanges nos 5 tool components (HIST-03)
    - restauração de seletores do exchange mais recente (D-08)
    - onNewConversation limpa estado local após hard delete (HIST-05)
    - WorkspaceConversationContext (bridge Topbar ↔ tool component)
  affects:
    - apps/web/src/features/formula/formula-tool.tsx
    - apps/web/src/features/sql/sql-tool.tsx
    - apps/web/src/features/regex/regex-tool.tsx
    - apps/web/src/features/scripts/scripts-tool.tsx
    - apps/web/src/features/template/template-tool.tsx
    - apps/web/src/components/app/topbar.tsx
    - apps/web/src/app/(workspace)/workspace/layout.tsx
tech_stack:
  added: []
  patterns:
    - React Context API mínimo (register/invoke ref pattern) para bridge Topbar ↔ tool component
    - usePathname para derivar toolKind da rota atual no Topbar (sem alterar layout server)
    - useState lazy initializer (() => array.map) para seed de exchanges sem re-render extra
    - useCallback para estabilizar handleNewConversation antes de register no contexto
    - toolKind canônico script/template singular derivado da rota /workspace/scripts e /workspace/templates
key_files:
  created:
    - apps/web/src/components/app/workspace-conversation-context.tsx
    - apps/web/src/components/app/workspace-shell.tsx
  modified:
    - apps/web/src/features/formula/formula-tool.tsx
    - apps/web/src/features/sql/sql-tool.tsx
    - apps/web/src/features/regex/regex-tool.tsx
    - apps/web/src/features/scripts/scripts-tool.tsx
    - apps/web/src/features/template/template-tool.tsx
    - apps/web/src/components/app/topbar.tsx
    - apps/web/src/app/(workspace)/workspace/layout.tsx
decisions:
  - "Estratégia de wiring (Tarefa 0): Context API + usePathname. O Topbar usa usePathname para derivar toolKind da rota sem props do layout. WorkspaceConversationContext faz bridge do onNewConversation do tool component ao Topbar via register/invoke com useRef — sem alterar layout server nem pages."
  - "scriptType salvo em campo dialect no route handler de scripts — restauração de seletor usa lastEx?.dialect, não platform"
  - "useCallback estabiliza handleNewConversation antes de register para evitar re-registros desnecessários"
  - "WorkspaceShell wrapping o layout para prover o contexto dentro do server component"
metrics:
  duration: "18 min"
  completed: "2026-05-29"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 7
  files_created: 2
---

# Phase 07 Plan 04: Seed de Exchanges e Seletores nos Tool Components Summary

Cinco tool components modificados para aceitar `initialExchanges` do server prefetch, fazer seed lazy do estado de exchanges e restaurar seletores do exchange mais recente (D-08); `handleNewConversation` implementado e conectado ao Topbar via `WorkspaceConversationContext` sem alterar o layout server component ou as pages — TypeScript compila limpo (tsc exit 0, todos os 5 erros TS2322 resolvidos).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 0 | Investigar layout + criar infra de wiring (Context + WorkspaceShell + Topbar usePathname) | 4360eb5 | workspace-conversation-context.tsx, workspace-shell.tsx, layout.tsx, topbar.tsx |
| 1 | Seed de exchanges e seletores nos 5 tool components + onNewConversation | 5aeae3e | formula-tool.tsx, sql-tool.tsx, regex-tool.tsx, scripts-tool.tsx, template-tool.tsx |

## Deviations from Plan

### Auto-added Infrastructure

**1. [Rule 2 - Missing Critical Functionality] WorkspaceConversationContext criado**
- **Found during:** Tarefa 0 — investigação do layout
- **Issue:** O layout do workspace é server component e renderiza o Topbar com props estáticas. Não há mecanismo para passar `onNewConversation` de um tool component (client, filho via `children`) ao Topbar (client, irmão no layout server). O plano previa investigar a estratégia antes de implementar.
- **Fix:** Criados `WorkspaceConversationContext` (register/invoke via useRef, sem re-render) e `WorkspaceShell` (client wrapper). O layout foi atualizado para envolver tudo no WorkspaceShell. O Topbar usa `usePathname` para derivar `toolKind` internamente — sem alterar nenhuma page.
- **Files created:** workspace-conversation-context.tsx, workspace-shell.tsx
- **Files modified:** layout.tsx, topbar.tsx
- **Commit:** 4360eb5

### Implementation Detail — scriptType em dialect

O route handler de scripts (`/api/tools/scripts/generate/route.ts`) salva `scriptType` no campo `dialect` do `ConversationExchange` (não em `platform`). Verificado antes de implementar. `ScriptsTool` restaura o seletor via `lastEx?.dialect as ScriptType`.

## Verification Results

**Tarefa 0 — infra de wiring:**
- WorkspaceConversationContext criado com register/invoke via useRef (sem re-render)
- WorkspaceShell wrapping o layout com WorkspaceConversationProvider
- Topbar derivando toolKind via usePathname com mapeamento correto:
  - /workspace/scripts → "script" (singular, canônico)
  - /workspace/templates → "template" (singular, canônico)
  - /workspace/sql → "sql"
  - /workspace/regex → "regex"
  - /workspace (raiz) → "formula"
- Props toolKind/onNewConversation legadas preservadas no Topbar

**Tarefa 1 — 5 tool components:**
- `grep -rn "initialExchanges" apps/web/src/features/ | grep tool.tsx` — 5 arquivos, múltiplos matches cada
- `grep "initialExchanges.map"` — 5 matches (lazy initializer em cada tool)
- `grep "lastEx"` — 4 matches (Formula, SQL, Regex, Scripts — Template sem seletores)
- `grep "handleNewConversation"` — 5 matches
- `grep "setExchanges\(\[\]\)"` — 5 matches (limpar estado no handleNewConversation)
- `grep "useRegisterNewConversation"` — 5 matches
- `grep "status.*complete.*as const"` — 5 matches (exchanges históricos com status correto)
- `tsc --noEmit` — exit 0, sem erros (todos os 5 TS2322 resolvidos)

## Known Stubs

None. O assistantPayload é cast direto para o tipo de payload de cada tool — confia nos dados salvos pela Phase 6 (D-02). O render dos output panels usa os mesmos campos que o streaming, então exchanges históricos são renderizados fielmente.

## Threat Flags

Nenhuma superfície nova fora do threat model do PLAN.md.
- T-07-10 (Information Disclosure — seed no client): aceito; dados já autorizados no server
- T-07-11 (Tampering — assistantPayload cast): aceito; dados do próprio banco do usuário
- T-07-12 (onNewConversation via contexto): aceito; apenas limpa estado local

## Self-Check: PASSED

- [x] workspace-conversation-context.tsx criado
- [x] workspace-shell.tsx criado
- [x] layout.tsx atualizado com WorkspaceShell
- [x] topbar.tsx atualizado com usePathname + useInvokeNewConversation
- [x] formula-tool.tsx modificado com initialExchanges, seed, seletores, handleNewConversation
- [x] sql-tool.tsx modificado com initialExchanges, seed, dialect, handleNewConversation
- [x] regex-tool.tsx modificado com initialExchanges, seed, mode, handleNewConversation
- [x] scripts-tool.tsx modificado com initialExchanges, seed, scriptType (via dialect), handleNewConversation
- [x] template-tool.tsx modificado com initialExchanges, seed, handleNewConversation
- [x] Commit 4360eb5 existe (Tarefa 0)
- [x] Commit 5aeae3e existe (Tarefa 1)
- [x] TypeScript compila limpo (tsc --noEmit exit 0)
- [x] toolKind canônico: "script" e "template" singular via usePathname
