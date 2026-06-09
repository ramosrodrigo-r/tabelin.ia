---
phase: 14
slug: tabela-viva
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-09
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 14-RESEARCH.md §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.7 + jsdom |
| **Config file** | `apps/web/vitest.config.ts` |
| **Setup** | `apps/web/tests/setup.ts` |
| **Quick run command** | `pnpm test --filter web -- run tests/formula-engine.test.ts tests/unified-schema.test.ts` |
| **Full suite command** | `pnpm test --filter web -- run` |
| **Estimated runtime** | ~20 seconds (quick); full suite ~minutos |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --filter web -- run tests/formula-engine.test.ts tests/unified-schema.test.ts`
- **After every plan wave:** Run `pnpm test --filter web -- run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~20 seconds (quick run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | LOC-01 | T-14-FORMULA | PROCV→VLOOKUP, SOMASE→SUMIF, SE→IF avaliam corretamente | unit (crítico) | `pnpm test --filter web -- run tests/formula-engine.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | LOC-02 | — | `;` argumento, `,` decimal parseados antes de delegar ao formulajs | unit | `pnpm test --filter web -- run tests/formula-engine.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | TAB-02 | — | Célula com fórmula recalcula em cascata ao editar dependência | unit | `pnpm test --filter web -- run tests/formula-engine.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | Schema | T-14-INPUT | `tableSpecPayloadSchema` aceita rows + colunas formula (retrocompat) | unit | `pnpm test --filter web -- run tests/unified-schema.test.ts` | ✅ (modificar) | ⬜ pending |
| TBD | TBD | 1+ | buildTableSpec | — | fixture estendida retorna rows + fórmulas | unit | `pnpm test --filter web -- run tests/table-clarifier.test.ts` | ✅ (modificar) | ⬜ pending |
| TBD | TBD | 1+ | TAB-01 | — | Grid renderiza com keyboard nav (Tab/Enter/setas) | unit + render | `pnpm test --filter web -- run tests/table-grid-panel.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1+ | TAB-03 | — | Add/remove linhas e colunas | unit | `pnpm test --filter web -- run tests/table-grid-panel.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1+ | TAB-04 | — | Copy/paste nativo DSG; undo/redo Ctrl+Z/Y | unit (keyboard events) | `pnpm test --filter web -- run tests/table-grid-panel.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1+ | TAB-05 | — | Sort por coluna (asc/desc) sem mutar rows originais | unit | `pnpm test --filter web -- run tests/table-grid-panel.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1+ | TAB-06 | T-14-DOS | ≤200 linhas virtualizadas sem jank | smoke (render 200 rows) | `pnpm test --filter web -- run tests/table-grid-panel.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1+ | LOC-03 | — | R$ 1.500,00 e 31/12/2025 (display-only sobre valor cru) | unit | `pnpm test --filter web -- run tests/table-grid-panel.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1+ | SEC-05 | T-14-XSS | Conteúdo `<script>` não executa (só textContent) | unit | `pnpm test --filter web -- run tests/table-grid-panel.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs are TBD until the planner assigns them; the planner MUST bind each requirement row to a concrete task.*

---

## Wave 0 Requirements

- [ ] `apps/web/tests/formula-engine.test.ts` — cobre LOC-01, LOC-02, TAB-02. **CRÍTICO: validar PT_BR_TO_EN empiricamente com formulajs real.** Casos: `=PROCV("x";[["x",1]];2;0)`, `=SOMASE(...)`, `=SE(...)`. (Endereça o concern carregado do STATE.md.)
- [ ] `apps/web/tests/table-grid-panel.test.tsx` — cobre TAB-01, TAB-03, TAB-04, TAB-05, TAB-06, LOC-03, SEC-05
- [ ] Modificar `apps/web/tests/unified-schema.test.ts` — adicionar testes do schema estendido (rows, formula col; retrocompatibilidade)
- [ ] Modificar `apps/web/tests/table-clarifier.test.ts` — adicionar test da fixture estendida

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rolagem suave percebida do grid de 200 linhas (sem jank visual) | TAB-06 | Performance percebida é subjetiva; teste smoke confirma render mas não a fluidez visual | Abrir o workspace, gerar tabela com 200 linhas, rolar rapidamente e confirmar ausência de travamento perceptível |
| "Sem delay perceptível" no recálculo ao editar célula | TAB-02 | Latência percebida (<16ms alvo) não é capturada por asserção unit | Editar B2 numa tabela com fórmulas e confirmar recálculo instantâneo a olho nu |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
