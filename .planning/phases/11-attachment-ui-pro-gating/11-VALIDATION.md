---
phase: 11
slug: attachment-ui-pro-gating
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-05
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstructed retroactively from artifacts (State B) on 2026-06-05.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.7 + @testing-library/react (jsdom) |
| **Config file** | `apps/web/vitest.config.ts` |
| **Quick run command** | `pnpm --filter web exec vitest run tests/formula-ui.test.tsx` |
| **Full suite command** | `pnpm --filter web test` |
| **Estimated runtime** | ~4s (quick) · ~30s (full, 206 tests / 19 files) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter web exec vitest run tests/formula-ui.test.tsx`
- **After every plan wave:** Run `pnpm --filter web test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| ATT-01 | 02,03,04 | — | Botão paperclip anexa (Formula + componente) | — | Free não anexa | unit/integration | `vitest run tests/formula-ui.test.tsx` / `attachment-button.test.tsx` | ✅ | ✅ green |
| ATT-02 | 03,04 | — | Drag-and-drop anexa para Pro | T-11-03-02 | Free drop ignorado (anti-elevação) | integration | `vitest run tests/formula-ui.test.tsx` | ✅ | ✅ green |
| ATT-03 | 02,03,04 | — | Chip de preview (ícone/nome/tamanho + remover) | — | N/A | integration | `vitest run tests/formula-ui.test.tsx` / `attachment-components.test.tsx` | ✅ | ✅ green |
| ATT-04 | 02,03,04 | — | Validação client-side (tipo + >5MB) | — | Rejeita tipo/size antes do envio | unit/integration | `vitest run tests/formula-ui.test.tsx` | ✅ | ✅ green |
| ATT-05 | 01,03,04 | — | Feedback de dois estágios (upload → extração) | — | N/A | integration | `vitest run tests/formula-ui.test.tsx` | ✅ | ✅ green |
| ATT-06 | 01,03,04 | — | Badge de grounding na resposta | — | N/A | integration | `vitest run tests/formula-ui.test.tsx` | ✅ | ✅ green |
| ATT-07 | 02,03,04 | — | Painel expansível com texto extraído | — | N/A | integration | `vitest run tests/formula-ui.test.tsx` | ✅ | ✅ green |
| ATT-08 | 02,03,04 | — | Aviso de extração parcial (truncagem) | — | N/A | integration | `vitest run tests/formula-ui.test.tsx` | ✅ | ✅ green |
| PRO-01 | 02,03,04,05 | — | Botão desabilitado para free + guard DnD | T-11-03-02 / T-11-04-02 | Free não anexa (botão + drop) | integration | `vitest run tests/formula-ui.test.tsx` | ✅ | ✅ green |
| SEC-01 | 01,02,05 | — | UI sem dangerouslySetInnerHTML | T-11-02-01 | extractedText como JSX text node | structural | `vitest run tests/formula-ui.test.tsx` | ✅ | ✅ green |
| SEC-03 | 02,03,04,05 | — | Aviso LGPD (Nova conversa) | — | N/A | integration | `vitest run tests/formula-ui.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> **Cobertura cross-tool:** Os 5 tools (Formula, SQL, Regex, Scripts, Template) compartilham os componentes
> (`AttachmentButton`, `AttachmentChip`, `AttachmentPanel`, `PrivacyNotice` — testados em
> `attachment-button.test.tsx` + `attachment-components.test.tsx`) e replicam o mesmo padrão de hook/wiring.
> O **Formula** é a amostra Nyquist representativa com testes de render completos. O wiring de UI específico
> de SQL/Regex/Scripts/Template é verificado por code review + grep (ver 11-VERIFICATION.md) — ver Manual-Only.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Nenhum framework novo instalado — vitest + @testing-library/react já presentes.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CTA de upgrade visível/adequado para free | PRO-01 | Adequação de UX do tooltip vs. popover/modal é julgamento de produto | Abrir tool com usuário free, hover no botão paperclip; confirmar "Recurso exclusivo Pro" e ausência de ação ao clicar |
| Drag-and-drop nativo (timing/comportamento de browser) | ATT-02 | JSDOM não simula DnD nativo de forma fiel (guard `!isPro` já coberto por teste) | Pro: arrastar CSV nos 5 tools → chip + LGPD aparecem. Free: drop silenciosamente ignorado |
| Perceptibilidade do timing dos dois estágios | ATT-05 | Transição uploading→extracting depende de latência real (render já coberto por teste) | Pro: anexar PDF/CSV e submeter; observar "Enviando documento..." → "Extraindo conteúdo..." antes da resposta |
| Wiring de UI cross-tool (SQL/Regex/Scripts/Template) | ATT-01,03,05,06,07,08 / SEC-03 | Apenas Formula tem testes de render; os 4 tools usam componentes compartilhados (testados) + padrão idêntico, verificados por code review/grep | Exercitar anexo end-to-end em SQL, Regex, Scripts e Template; confirmar paridade com Formula |

---

## Validation Sign-Off

- [x] All tasks have automated verify or are documented Manual-Only
- [x] Sampling continuity: no 3 consecutive requirements without automated verify
- [x] Wave 0 covers all MISSING references (none — existing infra)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-05

---

## Validation Audit 2026-06-05

| Metric | Count |
|--------|-------|
| Gaps found | 3 |
| Resolved (automated) | 2 (ATT-02 DnD guard, ATT-05 two-stage render) |
| Escalated to manual-only | 1 (cross-tool UI wiring — representative sample = Formula) |

Tests added to `apps/web/tests/formula-ui.test.tsx` (17 → 20):
- `pro user can drop a file onto the workspace to attach it` (ATT-02)
- `free user drop is ignored — no chip appears (elevation-via-DnD mitigation)` (ATT-02 / PRO-01 / T-11-03-02)
- `renders a stage message while the attachment is being processed` (ATT-05)

Full suite: 206 passed (19 files), zero regressões.
