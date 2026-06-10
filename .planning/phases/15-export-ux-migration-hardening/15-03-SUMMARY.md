---
phase: 15-export-ux-migration-hardening
plan: 03
subsystem: ui
tags: [nextjs, react, sidebar, navigation, vitest, fixture-mode]

# Dependency graph
requires:
  - phase: 12
    provides: chat unificado como entry point default em /workspace
provides:
  - Sidebar (apps/web/src/components/app/sidebar.tsx) montada no workspace layout, visível em todas as rotas /workspace/*
  - ToolNav removido do mount raiz do chat unificado (prop bottomNav + import)
  - Estilos .sidebar/.sidebar-nav/.sidebar-brand + .workspace-body em globals.css
  - Cobertura de teste do branch fixture de buildTableSpec (title, coluna formula =SOMA, schema válido)
affects: [15-export-ux-migration-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sidebar como navegação primária do workspace (substitui ToolNav na raiz; ToolNav permanece como componente não usado mas não removido do repo)"

key-files:
  created: []
  modified:
    - "apps/web/src/app/(workspace)/workspace/layout.tsx"
    - "apps/web/src/features/unified-chat/unified-chat-tool.tsx"
    - "apps/web/src/styles/globals.css"
    - "apps/web/tests/table-clarifier.test.ts"

key-decisions:
  - "Sidebar montada em novo wrapper .workspace-body (flex horizontal), irmão do Topbar dentro de .workspace-page; Sidebar oculta em telas <600px via media query existente"
  - "ToolNav (componente em src/components/app/tool-nav.tsx) não foi deletado do repo — apenas removido do mount raiz; nenhuma outra referência encontrada"
  - "Reutilizado Prisma client gerado a partir de prisma/schema.prisma na raiz do monorepo (artefato ausente bloqueava typecheck; gerado via pnpm exec prisma generate, não commitado)"

patterns-established:
  - "Classes CSS .sidebar/.sidebar-nav .nav-item[data-active] seguem convenção visual do tema claro do workspace (var(--primary), var(--border), var(--surface))"

requirements-completed: [UNI-07]

# Metrics
duration: 18min
completed: 2026-06-10
---

# Phase 15 Plan 03: Sidebar como navegação do workspace + cobertura fixture buildTableSpec Summary

**Sidebar montada no workspace layout como navegação primária (ToolNav removido do chat unificado), com nova cobertura de teste do branch fixture determinístico de `buildTableSpec`**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-06-10T03:51:00Z
- **Completed:** 2026-06-10T04:09:35Z
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify auto-aprovado)
- **Files modified:** 4

## Accomplishments
- Sidebar (já existente, com links para Formula/Scripts/SQL/Regex/Templates/File Analysis/OCR) agora montada em todas as rotas `/workspace/*`, incluindo a raiz
- ToolNav removido do mount do chat unificado (prop `bottomNav` + import órfão), sem regressão de acesso aos tools
- Estilos do tema claro adicionados para a Sidebar (`.sidebar`, `.sidebar-nav`, `.sidebar-brand`, novo wrapper `.workspace-body`)
- Branch fixture de `buildTableSpec` (sem `OPENAI_API_KEY`) coberto com asserts de schema válido, `title === "Controle de Gastos"` e coluna `formula` contendo `=SOMA`

## Task Commits

Each task was committed atomically:

1. **Task 1: Montar Sidebar no workspace layout + remover ToolNav do mount raiz** - `65a6e0b` (feat)
2. **Task 2: Cobrir fixture fallback de buildTableSpec sem OPENAI_API_KEY** - `7f1897d` (test)
3. **Task 3: Verificação humana da navegação pós-migração** - checkpoint:human-verify, auto-aprovado sob AUTO_MODE (nenhum arquivo modificado, nenhum commit)

**Plan metadata:** (commit deste arquivo SUMMARY)

## Files Created/Modified
- `apps/web/src/app/(workspace)/workspace/layout.tsx` - importa e renderiza `Sidebar`; novo wrapper `.workspace-body` (flex horizontal) envolvendo Sidebar + main
- `apps/web/src/features/unified-chat/unified-chat-tool.tsx` - removida prop `bottomNav={<ToolNav />}` e import órfão de `ToolNav`
- `apps/web/src/styles/globals.css` - adicionado `.workspace-body`, `.sidebar`, `.sidebar-brand`, `.sidebar-nav .nav-item` (+variantes active/disabled), `.sidebar { display: none }` em mobile (<600px)
- `apps/web/tests/table-clarifier.test.ts` - novo teste em "buildTableSpec — fixture mode": `tableSpecPayloadSchema.safeParse(...).success === true`, `title === "Controle de Gastos"`, coluna `type: "formula"` com `formula` contendo `"=SOMA"`

## Decisions Made
- Sidebar renderizada como irmã do `<main>` dentro de um novo container `.workspace-body` (flex), preservando `.workspace-page > Topbar + workspace-body` como estrutura geral do layout.
- Em mobile (<600px) a Sidebar é ocultada via `display: none` — navegação por tools em telas pequenas fica restrita a deep links/URL direta nesta plan; não fazia parte do escopo (UNI-07 foca em desktop/raiz).
- `ToolNav` (`src/components/app/tool-nav.tsx`) permanece no repo como componente não utilizado — não fazia parte do escopo desta plan removê-lo do filesystem, apenas do mount raiz. Nenhuma outra referência ativa encontrada via grep.
- Cliente Prisma (artefato `node_modules/.prisma/client` / `@prisma/client`) estava ausente no worktree, causando ~10 erros de typecheck em arquivos não relacionados a esta plan (`server/ai/*`, `server/db/client.ts`, etc.). Rodado `pnpm exec prisma generate` na raiz do monorepo (schema em `prisma/schema.prisma`) para regenerar o artefato — não é mudança de código-fonte, não commitado.

## Deviations from Plan

None - plan executado conforme especificado. A geração do cliente Prisma foi necessária apenas para destravar `pnpm --filter web typecheck` (artefato de build ausente no worktree, Rule 3), sem alteração de arquivos versionados além dos 4 listados no `files_modified`.

## Issues Encountered
- `pnpm --filter web test -- table-clarifier` na suíte completa (27 arquivos) reporta 1 falha em `tests/unified-chat-tool.test.tsx:341` ("Resposta corrompida. Tente novamente" / NDJSON corrompido). Esse teste passa isoladamente (`pnpm exec vitest run tests/unified-chat-tool.test.tsx` → 19/19 passed) e é o teste flaky já documentado na memória do projeto ("corrupt NDJSON enters the error state" falha na suite completa, passa isolado) — não relacionado às mudanças desta plan. `pnpm exec vitest run tests/table-clarifier.test.ts` isolado → 14/14 passed.
- `pnpm --filter web typecheck` passou limpo (exit 0) após geração do cliente Prisma.

## User Setup Required

None - no external service configuration required.

## Task 3 — Verificação Humana (auto-aprovada sob AUTO_MODE)

Task 3 (`checkpoint:human-verify`, gate="blocking") foi auto-aprovada sob AUTO_MODE conforme política do executor. Nenhum arquivo foi modificado por esta task.

**Recomenda-se verificação manual pelo usuário antes de considerar a fase 15 totalmente fechada:**
1. Rodar `pnpm --filter web dev` e abrir `http://localhost:3000/workspace`
2. Confirmar que o chat unificado aparece como entry point e que NÃO há mais o ToolNav (barra de pills) abaixo do input
3. Confirmar que a Sidebar (Formula, Scripts, SQL, Regex, Templates, File Analysis, OCR) está visível à esquerda
4. Clicar em "SQL" na Sidebar -> deve navegar para `/workspace/sql` e abrir o tool de SQL
5. Voltar para `/workspace` -> chat unificado novamente

## Next Phase Readiness
- Sidebar é agora a navegação primária do workspace; deep links por tool seguem funcionando
- Fixture fallback de `buildTableSpec` coberto por teste determinístico (UNI-07 atendido)
- Pendência: verificação manual da navegação (Task 3) recomendada ao usuário pós-merge

---
*Phase: 15-export-ux-migration-hardening*
*Completed: 2026-06-10*

## Self-Check: PASSED

All created/modified files and commit hashes verified present.
