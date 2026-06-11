---
phase: 17
slug: desligar-monetiza-o-cota
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-11
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Esta fase é regressão-guard: a remoção da monetização/cota NÃO pode quebrar o chat sobrevivente.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit/integração) + Playwright (e2e) |
| **Config file** | `apps/web/vitest.config.*` (presente) / `apps/web/playwright` (e2e) |
| **Quick run command** | `pnpm --filter web test` |
| **Full suite command** | `pnpm -r typecheck && pnpm -r test` |
| **Estimated runtime** | ~60–120 segundos |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter web test <arquivo-afetado>`
- **After every plan wave:** Run `pnpm --filter web test`
- **Before `/gsd:verify-work`:** `pnpm -r typecheck && pnpm -r test` verdes
- **Max feedback latency:** ~120 segundos

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (planner fills) | — | — | CLEAN-04 | — | Chat streama sem gate de cota/entitlement | integração | `pnpm --filter web test unified-route` | ✅ (editar) | ⬜ pending |
| (planner fills) | — | — | CLEAN-04 | — | Zero UI de upsell/badge Pro/limite | componente | `pnpm --filter web test unified-chat-tool.test.tsx topbar.test.tsx` | ✅ (editar) | ⬜ pending |
| (planner fills) | — | — | CLEAN-04 | — | Rotas billing/webhook/return = 404 (removidas) | integração/grep | grep de rota + remoção de arquivo | ❌ W0 (opcional) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] (opcional) teste leve confirmando 404/ausência das rotas `api/billing/*` — substituível por grep na verificação (remoção do arquivo já gera 404 no Next App Router)
- *Nenhum novo framework necessário — Vitest + Playwright já cobrem.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Busca por `reserve/confirm/release`, `entitlement`-como-gate, `quota`, `mercadopago` retorna zero (exceto exceção documentada) | CLEAN-04 / SC#4 | Verificação de superfície via grep dirigido, não asserção de teste | `grep -rn` dirigido na rota de chat; `getUserEntitlement`/`getCachedEntitlement` permanecem (consumidos por páginas vivas da Phase 18) e são a exceção documentada |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
