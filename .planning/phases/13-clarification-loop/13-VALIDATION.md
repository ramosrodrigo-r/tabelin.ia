---
phase: 13
slug: clarification-loop
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-08
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `apps/web/vitest.config.ts` |
| **Quick run command** | `pnpm --filter web test -- tests/unified-route.test.ts tests/unified-chat-tool.test.tsx` |
| **Full suite command** | `pnpm --filter web test` |
| **Estimated runtime** | ~30 seconds (quick) / ~90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter web test -- tests/unified-route.test.ts tests/unified-chat-tool.test.tsx`
- **After every plan wave:** Run `pnpm --filter web test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 0 | CLAR-04 | — | N/A | unit | `pnpm --filter web test -- tests/unified-chat-tool.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | — | 1 | CLAR-01 | — | Rota emite `table_clar_question` com `question` único quando `clarTurnCount < 2` | unit | `pnpm --filter web test -- tests/unified-route.test.ts` | ✅ (estender) | ⬜ pending |
| TBD | — | 1 | CLAR-01 | — | `ClarificationCard` renderiza a pergunta | unit | `pnpm --filter web test -- tests/unified-chat-tool.test.tsx` | ✅ (estender) | ⬜ pending |
| TBD | — | 1 | CLAR-02 | T-elevation | Quando `clarTurnCount >= 2`, rota emite `table_spec` (não outra pergunta) | unit | `pnpm --filter web test -- tests/unified-route.test.ts` | ✅ (estender) | ⬜ pending |
| TBD | — | 1 | CLAR-02 | — | Indicador "Pergunta N de 2" renderizado no `ClarificationCard` | unit | `pnpm --filter web test -- tests/unified-chat-tool.test.tsx` | ✅ (estender) | ⬜ pending |
| TBD | — | 1 | CLAR-02 | T-elevation | `clarTurnCount` derivado do histórico (PostgreSQL), não de campo client-side | unit | `pnpm --filter web test -- tests/unified-route.test.ts` | ✅ (estender) | ⬜ pending |
| TBD | — | 1 | CLAR-03 | — | Botão "Gerar mesmo assim" presente desde o turno 1 | unit | `pnpm --filter web test -- tests/unified-chat-tool.test.tsx` | ✅ (estender) | ⬜ pending |
| TBD | — | 1 | CLAR-03 | — | Click em "Gerar mesmo assim" resubmete com `overrideGenerate` | unit | `pnpm --filter web test -- tests/unified-chat-tool.test.tsx` | ✅ (estender) | ⬜ pending |
| TBD | — | 1 | CLAR-04 | T-tampering | `ConfirmationCard` renderiza colunas/linhas/título do `table_spec` payload | unit | `pnpm --filter web test -- tests/unified-chat-tool.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | — | 1 | CLAR-05 | T-abuse | `confirmToolUse` NÃO é chamado em turn de clarificação | unit | `pnpm --filter web test -- tests/unified-route.test.ts` | ✅ (estender) | ⬜ pending |
| TBD | — | 1 | CLAR-05 | T-abuse | `releaseToolUse` É chamado imediatamente em turn de clarificação | unit | `pnpm --filter web test -- tests/unified-route.test.ts` | ✅ (estender) | ⬜ pending |
| TBD | — | 1 | CLAR-05 | — | `confirmToolUse` É chamado no turn de geração | unit | `pnpm --filter web test -- tests/unified-route.test.ts` | ✅ (estender) | ⬜ pending |

*Task IDs filled by planner once plans are written. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/web/tests/table-clarifier.test.ts` — cobre fixture mode, uma pergunta por turn, spec final (CLAR-01, CLAR-02)
- [ ] `apps/web/tests/unified-schema.test.ts` — estender com cases `table_clar_question` e `table_spec`
- [ ] `apps/web/src/features/unified-chat/components/clarification-card.tsx` — novo componente (CLAR-01, CLAR-02, CLAR-03)
- [ ] `apps/web/src/features/unified-chat/components/confirmation-card.tsx` — novo componente (CLAR-04)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Streaming fluido da pergunta de clarificação no browser real | CLAR-01 | UX percebida (latência/fluidez) não capturável em unit test | Pedir "cria uma tabela de vendas" no `/workspace`; observar pergunta chegando uma por vez |
| Fluxo end-to-end de 2 turns → ConfirmationCard → confirmar → geração | CLAR-02, CLAR-04 | Integração multi-turn com persistência real do histórico | UAT ao vivo: dois turns de clarificação, confirmar spec, ver cota debitada apenas na geração |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
