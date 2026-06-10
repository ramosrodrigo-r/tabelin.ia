---
phase: 15-export-ux-migration-hardening
plan: 01
subsystem: ui
tags: [export, csv, xlsx, sheetjs, owasp, sanitization, vitest, tdd]

# Dependency graph
requires: []
provides:
  - "table-export.ts: sanitizeCellForExport, buildCsv, buildXlsx, downloadCsv, downloadXlsx (puros + efeitos DOM separados)"
  - "Suíte de testes table-export.test.ts cobrindo SEC-04, EXP-01, EXP-02"
affects: [15-02, 15-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sanitização de injeção de fórmula CSV/Excel (OWASP): prefixo ' em células iniciadas por = + - @ TAB CR LF"
    - "XLSX cell-objects {t:'s'} forçando tipo string explícito em todas as células de dados"
    - "BOM UTF-8 ownership único em buildCsv (downloadCsv não re-prepende)"
    - "Funções puras module-scope separadas dos efeitos DOM (download), seguindo anatomia de use-formula-engine.ts"

key-files:
  created:
    - apps/web/src/features/unified-chat/lib/table-export.ts
    - apps/web/tests/table-export.test.ts
  modified: []

key-decisions:
  - "Export usa displayRows (valores calculados pelo useFormulaEngine), nunca templates {row} brutos"
  - "CSV usa separador ';' + BOM UTF-8 (locale pt-BR)"
  - "BOM incluído uma única vez em buildCsv; downloadCsv não duplica"

patterns-established:
  - "table-export.ts: módulo puro sem 'use client', testável em jsdom sem tocar document/fs"

requirements-completed: [EXP-01, EXP-02, SEC-04]

# Metrics
duration: 12min
completed: 2026-06-10
---

# Phase 15 Plan 01: Export utility (sanitization + CSV/XLSX builders) Summary

**Utilidade pura `table-export.ts` com sanitização anti-injeção de fórmula (OWASP), geradores CSV (BOM + `;` + RFC 4180) e XLSX (cell-objects `{t:"s"}`), cobertos por 18 testes vitest.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-10T03:56:00Z
- **Completed:** 2026-06-10T04:08:03Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- `sanitizeCellForExport` implementa a regra OWASP canônica (prefixo `'` para `= + - @ \t \r \n`)
- `buildCsv` gera CSV com BOM UTF-8 (uma vez), separador `;`, quoting RFC 4180 por célula
- `buildXlsx` grava todas as células de dados como `{t:"s"}` via `aoa_to_sheet`, prevenindo fórmulas vivas
- Suíte `table-export.test.ts` com 18 testes cobrindo todo o Test Map do RESEARCH (SEC-04, EXP-01, EXP-02), TDD RED→GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: Escrever testes RED para sanitização + CSV + XLSX** - `45177c8` (test)
2. **Task 2: Implementar table-export.ts (GREEN)** - `c91ec5d` (feat)

_TDD: RED commit (45177c8) confirmado falhando por módulo ausente; GREEN commit (c91ec5d) com 18/18 testes passando._

## Files Created/Modified
- `apps/web/src/features/unified-chat/lib/table-export.ts` - Módulo puro: sanitizeCellForExport, buildCsv, buildXlsx (puras) + downloadCsv, downloadXlsx (efeitos DOM)
- `apps/web/tests/table-export.test.ts` - 18 testes vitest cobrindo sanitização, CSV (BOM/separador/quoting/displayRows) e XLSX (cell-objects t:"s")

## Decisions Made
- BOM UTF-8 incluído uma única vez em `buildCsv`; `downloadCsv` recebe o conteúdo já com BOM e não re-prepende (evita double-BOM, conforme nota do plan-checker)
- Export usa `displayRows` (valores calculados), nunca os templates de fórmula `{row}`
- Separador `;` + BOM para abrir corretamente no Excel pt-BR

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `pnpm --filter web test -- table-export` não filtra por nome de arquivo neste setup (roda a suíte inteira via pnpm recursive); usado `npx vitest run table-export` diretamente para confirmar RED (módulo ausente) e GREEN (18/18 passando). A suíte completa tem 2 falhas pré-existentes em `tests/file-parser.test.ts` (erro de geração do `@prisma/client` — `Cannot find module '.prisma/client/default'`), fora do escopo desta task; documentado mas não corrigido (Scope Boundary).
- `pnpm --filter web typecheck` reporta erros pré-existentes em `src/server/**` relacionados ao mesmo problema de geração do Prisma Client; nenhum erro em `table-export.ts` (verificado via grep — nenhuma linha do novo arquivo aparece na saída do typecheck).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `table-export.ts` pronto para ser consumido pelo botão "Exportar" no `TableGridPanel` (slot reservado linha 446-447), a ser conectado em 15-02/15-03
- `downloadCsv`/`downloadXlsx` (efeitos DOM) ainda não testados automaticamente — smoke manual recomendado na fase de verificação (editar célula com `=1+1`, exportar, abrir no Excel/Sheets)
- Issue pré-existente do Prisma Client (`Cannot find module '.prisma/client/default'`) bloqueia 2 testes e o typecheck completo — fora do escopo deste plano, mas pode impactar verificação de fase se não resolvido antes

---
*Phase: 15-export-ux-migration-hardening*
*Completed: 2026-06-10*
