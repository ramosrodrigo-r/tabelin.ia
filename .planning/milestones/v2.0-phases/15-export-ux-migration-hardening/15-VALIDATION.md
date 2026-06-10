---
phase: 15
slug: export-ux-migration-hardening
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-09
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.7 |
| **Config file** | apps/web/vitest.config.ts |
| **Quick run command** | `pnpm --filter web test` |
| **Full suite command** | `pnpm --filter web test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter web test`
- **After every plan wave:** Run `pnpm --filter web test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-xx | 01 | 1 | SEC-04 | T-15-01 | Célula iniciada por `=`/`+`/`-`/`@`/`\t`/`\r` recebe prefixo `'` no CSV | unit | `pnpm --filter web test` | ❌ W0 | ⬜ pending |
| 15-01-xx | 01 | 1 | EXP-01 | — | CSV gerado com separador `;`, BOM UTF-8, linhas = displayRows | unit | `pnpm --filter web test` | ❌ W0 | ⬜ pending |
| 15-01-xx | 01 | 1 | EXP-02 / SEC-04 | T-15-01 | XLSX grava todas as células como `{t:"s"}` (texto, nunca fórmula) | unit | `pnpm --filter web test` | ❌ W0 | ⬜ pending |
| 15-02-xx | 02 | 2 | EXP-01/EXP-02 | — | Botões Exportar CSV/XLSX disparam download dos displayRows atuais | unit/component | `pnpm --filter web test` | ❌ W0 | ⬜ pending |
| 15-03-xx | 03 | 2 | — | — | `buildTableSpec` retorna fixture determinística sem `OPENAI_API_KEY` | unit | `pnpm --filter web test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · Task IDs finalized by planner*

---

## Wave 0 Requirements

- [ ] `apps/web/src/**/table-export.test.ts` — testes unitários da utilidade pura de export (sanitização CSV, separador/BOM, tipagem de célula XLSX)
- [ ] `apps/web/src/**/table-clarifier.test.ts` (ou existente) — caso de fixture fallback sem `OPENAI_API_KEY`

*Infraestrutura vitest já existe; Wave 0 cobre apenas os arquivos de teste novos.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Arquivo CSV abre em colunas no Excel pt-BR com acentos corretos | EXP-01 | Comportamento do Excel não automatizável em CI | Exportar, abrir o `.csv` no Excel/LibreOffice, conferir colunas e acentos |
| Célula `=1+1` aparece como texto literal (não executa) no Excel | SEC-04 | Execução de macro é comportamento do app externo | Editar célula para `=1+1`, exportar CSV e XLSX, abrir no Excel, confirmar que mostra `=1+1` como texto |
| `/workspace` mostra chat unificado sem ToolNav; tools alcançáveis via sidebar | UX migration | Layout visual / navegação | Abrir `/workspace`, confirmar ausência do ToolNav e presença da sidebar com tools |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-09 (plan-checker PASS — every auto/tdd task has an automated verify; Wave 0 tests created in-plan via TDD before implementation; latency <30s)
