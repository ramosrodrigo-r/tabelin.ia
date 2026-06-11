---
phase: 16-tela-nica-fim-da-navega-o-multi-ferramenta
plan: 01
subsystem: ui
tags: [next.config, redirects, topbar, react, table-spec]

# Dependency graph
requires: []
provides:
  - "redirects() em next.config.ts: 6 rotas antigas de tool -> /workspace (308, sem editar page.tsx)"
  - "Topbar enxuta sem deteccao de toolKind por rota, com link /privacidade"
  - "SAMPLE_SPEC (TableSpecPayload) pronto para a TableGridPanel persistente"
affects: [16-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "redirects() centralizado em next.config.ts com destination estatico (D-07/D-08)"
    - "toolKind fixo em vez de derivado de usePathname"

key-files:
  created:
    - apps/web/src/features/unified-chat/lib/sample-spec.ts
  modified:
    - apps/web/next.config.ts
    - apps/web/src/components/app/topbar.tsx
    - apps/web/tests/topbar.test.tsx

key-decisions:
  - "toolKind fixo \"unified\" preserva o fluxo Nova conversa/Apagar historico (DELETE /api/conversations/unified) sem nova logica de roteamento"
  - "Teste obsoleto de deep-link SQL removido (rota nao existe mais apos D-08); substituido por teste do link /privacidade"

patterns-established:
  - "SAMPLE_SPEC reaproveita fixture pt-BR de table-clarifier.ts como fonte unica da planilha-amostra"

requirements-completed: [SHELL-02, SHELL-03]

# Metrics
duration: 12min
completed: 2026-06-11
---

# Phase 16 Plan 01: Redirects, Topbar enxuta e SAMPLE_SPEC Summary

**redirects() 308 das 6 rotas antigas de tool para /workspace, Topbar sem deteccao de rota com link /privacidade, e SAMPLE_SPEC tipado pronto para a TableGridPanel persistente**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-11T13:50:00Z
- **Completed:** 2026-06-11T14:02:42Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- `next.config.ts` agora redireciona `/workspace/{sql,regex,scripts,templates,file-analysis,ocr}` para `/workspace` com 308 permanente, sem tocar nos `page.tsx` de tool (D-07/D-08)
- `Topbar` removeu `useWorkspaceToolKind()`/`usePathname` (codigo morto); `toolKind` agora fixo `"unified"`, preservando "Nova conversa"/"Apagar historico"; adicionado link `/privacidade` em `topbar-actions` (SHELL-03/D-11)
- Criado `apps/web/src/features/unified-chat/lib/sample-spec.ts` exportando `SAMPLE_SPEC: TableSpecPayload` ("Controle de Gastos", 5 colunas incl. coluna formula, 5 linhas, pt-BR), pronto para `<TableGridPanel spec={SAMPLE_SPEC} />` na Plan 02

## Task Commits

1. **Task 1: Configurar redirects 308 das rotas antigas de tool** - `2fef864` (feat)
2. **Task 2: Enxugar Topbar (remover deteccao de rota, adicionar link /privacidade)** - `9c9272b` (refactor)
3. **Task 3: Extrair SAMPLE_SPEC para o painel principal** - `08040ea` (feat)
4. **Fix de teste decorrente da Task 2** - `1334726` (test)

## Files Created/Modified
- `apps/web/next.config.ts` - adiciona `redirects()` com 6 entradas estaticas para `/workspace`
- `apps/web/src/components/app/topbar.tsx` - remove deteccao de toolKind por rota, adiciona link `/privacidade`
- `apps/web/src/features/unified-chat/lib/sample-spec.ts` - novo arquivo, exporta `SAMPLE_SPEC: TableSpecPayload`
- `apps/web/tests/topbar.test.tsx` - remove teste obsoleto de deep-link SQL, adiciona teste do link `/privacidade`

## Decisions Made
- `toolKind` fixo `"unified"` em vez de prop opcional sem fallback — mantem `handleDeleteHistory` chamando `DELETE /api/conversations/unified` sem mudar o endpoint (ja existente, autenticado)
- Teste `"keeps SQL conversation deletion on the SQL deep link"` removido por testar uma rota que nao existe mais apos o corte de navegacao (D-08); o mock `usePathname`/`navigationMock.pathname` tambem foi removido por nao ser mais consumido pelo componente

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Teste de Topbar quebrado pela mudanca de toolKind fixo**
- **Found during:** Task 2 (Enxugar Topbar)
- **Issue:** `tests/topbar.test.tsx` tinha um teste (`"keeps SQL conversation deletion on the SQL deep link"`) que dependia de `usePathname()` retornar `/workspace/sql` para derivar `toolKind: "sql"` — comportamento removido pelo proprio plano (D-08, toolKind fixo "unified")
- **Fix:** Removido o teste obsoleto e o mock de `usePathname`/`navigationMock.pathname` (nao mais usado pelo Topbar); adicionado teste cobrindo o novo link `/privacidade`
- **Files modified:** `apps/web/tests/topbar.test.tsx`
- **Verification:** `pnpm exec vitest run tests/topbar.test.tsx` -> 5/5 passed
- **Committed in:** `1334726`

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug em teste decorrente da mudanca planejada)
**Impact on plan:** Esperado — o plano explicitamente remove a deteccao de toolKind por rota; o teste testava exatamente o comportamento removido. Sem scope creep.

## Issues Encountered
- `pnpm exec tsc --noEmit` inicialmente falhava com erros `@prisma/client` ("ConversationExchange"/"PrismaClient" nao exportados) — falso-positivo conhecido em worktrees (ver memoria "Prisma generate em worktree"). Resolvido rodando `pnpm exec prisma generate --schema=<worktree-root>/prisma/schema.prisma` antes do typecheck. Nao e uma deviation do plano (ambiente, nao codigo).
- `pnpm -r test` apontou falha em `tests/unified-chat-tool.test.tsx > "corrupt NDJSON enters the error state"` — teste flaky conhecido (ver memoria "Teste flaky NDJSON"), passa isolado (`pnpm exec vitest run tests/unified-chat-tool.test.tsx -t "corrupt NDJSON"` -> 1/1 passed). Pre-existente, fora do escopo deste plano.
- `pnpm exec vitest run --reporter=basic -t topbar` (comando exato do `<verify>`) falha por um erro de carregamento do reporter `basic` no vitest 4.1.7 (`ERR_LOAD_URL`), independente das mudancas deste plano. Verificado com `pnpm exec vitest run -t topbar` e `pnpm exec vitest run tests/topbar.test.tsx`, ambos verdes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `SAMPLE_SPEC` pronto para a Plan 02 montar `<TableGridPanel spec={SAMPLE_SPEC} />` no painel principal da tela unica
- Redirects 308 prontos; verificacao manual com `next dev` + `curl -I http://localhost:3000/workspace/sql` fica para o gate final da fase (apos Plan 02)
- Topbar enxuta sem dependencia de rota, compativel com o layout de tela unica da Plan 02

---
*Phase: 16-tela-nica-fim-da-navega-o-multi-ferramenta*
*Completed: 2026-06-11*
