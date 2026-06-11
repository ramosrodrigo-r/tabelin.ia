---
phase: 16-tela-nica-fim-da-navega-o-multi-ferramenta
plan: 02
subsystem: ui
tags: [layout, css, workspace, split-panel, responsive]

# Dependency graph
requires: ["16-01"]
provides:
  - "WorkspaceLayout reescrito: TableGridPanel(SAMPLE_SPEC) + chat lado a lado, sem Sidebar"
  - "WorkspaceSplit: client component com toggle responsivo Planilha/Chat (data-hidden)"
  - ".workspace-grid-panel/.workspace-chat-panel/.workspace-mobile-toggle no globals.css"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "data-hidden (em vez de display inline) para alternancia mobile sem desmontar"
    - "split flex 7/3 desktop, column + toggle <900px"

key-files:
  created:
    - apps/web/src/components/app/workspace-split.tsx
    - apps/web/src/app/(workspace)/workspace/__tests__/layout.test.tsx
  modified:
    - apps/web/src/app/(workspace)/workspace/layout.tsx
    - apps/web/src/styles/globals.css
  deleted:
    - apps/web/src/components/app/sidebar.tsx
    - apps/web/src/components/app/tool-nav.tsx

key-decisions:
  - "WorkspaceSplit recebe grid/chat como props e renderiza toggle+paineis dentro do .workspace-body existente do layout (sem wrapper extra)"
  - "Breakpoint 900px novo, separado do @media 600px existente (que mantem .topbar/.tool-nav/.tool-pill top-level usados por intent-pill.tsx)"

requirements-completed: [SHELL-01, SHELL-02, CLEAN-05]

# Metrics
duration: 14min
completed: 2026-06-11
---

# Phase 16 Plan 02: Split TableGridPanel + Chat, Sidebar removida Summary

**WorkspaceLayout reescrito para tela única: TableGridPanel(SAMPLE_SPEC) ~70% + UnifiedChatTool ~30% lado a lado via novo WorkspaceSplit, com toggle Planilha/Chat em <900px (data-hidden, sem desmontar); Sidebar e ToolNav removidos do código e CSS**

## Performance

- **Duration:** 14 min
- **Started:** 2026-06-11T14:08:00Z
- **Completed:** 2026-06-11T14:22:00Z
- **Tasks:** 3
- **Files modified:** 6 (2 criados, 2 modificados, 2 deletados)

## Accomplishments

- Criado `apps/web/src/components/app/workspace-split.tsx`: client component `WorkspaceSplit({ grid, chat })` com `useState<"grid"|"chat">("grid")`, renderiza `.workspace-mobile-toggle` (botões "Planilha"/"Chat" com `data-active`) + `.workspace-grid-panel`/`.workspace-chat-panel` com `data-hidden` — ambos os painéis sempre montados, preservando estado de edição/undo do grid e do histórico do chat ao alternar (D-03)
- Reescrito `apps/web/src/app/(workspace)/workspace/layout.tsx` (TDD): removido import/uso de `Sidebar`; adicionados imports de `TableGridPanel`, `SAMPLE_SPEC`, `WorkspaceSplit`; `.workspace-body` agora monta `<WorkspaceSplit grid={<TableGridPanel spec={SAMPLE_SPEC} />} chat={children} />`; guard `redirect("/sign-in")` preservado
- Novo `apps/web/src/app/(workspace)/workspace/__tests__/layout.test.tsx` com 4 casos: planilha + chat simultâneos no DOM, ausência de `aria-label="Ferramentas"`, presença de `.workspace-grid-panel`/`.workspace-chat-panel`, e redirect para `/sign-in` sem usuário — RED confirmado (Sidebar ainda montada chamava `usePathname` não mockado), GREEN após reescrita
- `globals.css`: `.workspace-content`/`.workspace-center` e bloco `.sidebar*` removidos; adicionados `.workspace-grid-panel` (flex:7), `.workspace-chat-panel` (flex:3, border-left), `.workspace-mobile-toggle`; novo `@media (max-width: 900px)` com toggle visível (peso 400/700, conforme UI-SPEC) e `data-hidden` escondendo painéis; `@media (max-width: 600px)` simplificado mantendo `.topbar`/`.tool-nav`/`.tool-pill` top-level (usados por `intent-pill.tsx`); removido CSS morto `.chat-input-bottom-nav .tool-nav`/`.tool-pill`
- Deletados `apps/web/src/components/app/sidebar.tsx` e `apps/web/src/components/app/tool-nav.tsx` — zero imports restantes confirmado por grep

## Task Commits

1. **Task 1: Criar WorkspaceSplit (toggle responsivo grade/chat, client component)** - `9e2ed6a` (feat)
2. **Task 2 (RED): Teste falhando para WorkspaceLayout sem Sidebar** - `82ceac7` (test)
3. **Task 2 (GREEN): Reescrever WorkspaceLayout (split TableGridPanel + UnifiedChatTool, sem Sidebar)** - `87459a9` (feat)
4. **Task 3: Atualizar CSS do shell e remover Sidebar/ToolNav órfãos** - `c0cb683` (refactor)

## Files Created/Modified

- `apps/web/src/components/app/workspace-split.tsx` - novo client component, toggle Planilha/Chat + painéis sempre montados
- `apps/web/src/app/(workspace)/workspace/layout.tsx` - reescrito: TableGridPanel(SAMPLE_SPEC) + children via WorkspaceSplit, sem Sidebar
- `apps/web/src/app/(workspace)/workspace/__tests__/layout.test.tsx` - novo, 4 casos (planilha+chat, sem Sidebar, painéis grid/chat, redirect auth)
- `apps/web/src/styles/globals.css` - split panels + toggle mobile (900px), remoção de `.sidebar*`/`.workspace-content`/`.workspace-center`/CSS morto do bottom-nav tool-nav
- `apps/web/src/components/app/sidebar.tsx` - deletado
- `apps/web/src/components/app/tool-nav.tsx` - deletado

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] ResizeObserver não definido em jsdom no novo teste de layout**
- **Found during:** Task 2 (GREEN — primeira execução do teste após render real do `TableGridPanel`)
- **Issue:** `react-datasheet-grid` (usado por `TableGridPanel`) chama `useResizeDetector` (react-resize-detector), que requer `window.ResizeObserver`; jsdom não implementa, causando `TypeError: window.ResizeObserver is not a constructor` em 3/4 testes
- **Fix:** Adicionado o mesmo polyfill mínimo já usado em `apps/web/tests/table-grid-panel.test.tsx` (`window.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} }`) no novo arquivo de teste
- **Files modified:** `apps/web/src/app/(workspace)/workspace/__tests__/layout.test.tsx`
- **Verification:** `pnpm exec vitest run "src/app/(workspace)/workspace/__tests__/layout.test.tsx"` -> 4/4 passed
- **Committed in:** `87459a9`

---

**Total deviations:** 1 auto-fixed (Rule 3 - polyfill de ambiente de teste, padrão já estabelecido no projeto)
**Impact on plan:** Nenhum — fix segue padrão existente, sem mudança de escopo.

## Issues Encountered

- `pnpm exec tsc --noEmit` exigiu `pnpm exec prisma generate --schema=<worktree-root>/prisma/schema.prisma` antes (falso-positivo conhecido de worktrees, ver memória "Prisma generate em worktree"). Não é deviation de código.
- `pnpm -r test` rodou limpo (374 passed, 1 skipped) — o teste flaky de NDJSON conhecido não falhou nesta execução.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `/workspace` agora monta `TableGridPanel(SAMPLE_SPEC)` (~70%, esquerda) + `UnifiedChatTool` (~30%, direita), sem Sidebar/ToolNav — SHELL-01/SHELL-02/CLEAN-05 completos para esta fase
- Verificação manual completa da fase (toggle mobile interativo, persistência de estado ao alternar, `curl -I /workspace/sql` -> 308) fica pendente para o gate final, conforme `<verification>` do plano
- Endpoints `/api/tools/*` permanecem órfãos intencionalmente (Phase 18, CLEAN-01/02/03/06) — nota de sequenciamento do CONTEXT.md, sem ação nesta plan

---
*Phase: 16-tela-nica-fim-da-navega-o-multi-ferramenta*
*Completed: 2026-06-11*

## Self-Check: PASSED

All created/modified/deleted files and commit hashes verified present.
