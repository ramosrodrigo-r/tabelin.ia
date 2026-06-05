---
phase: 10
slug: persistence-llm-context
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-05
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstructed retroactively from artifacts (State B) on 2026-06-05.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.7 (node environment) |
| **Config file** | `apps/web/vitest.config.ts` |
| **Quick run command** | `pnpm --filter web exec vitest run tests/attachment-context.test.ts` |
| **Full suite command** | `pnpm --filter web test` |
| **Estimated runtime** | ~3s (quick · 23 testes / 5 suites) · ~30s (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter web exec vitest run tests/attachment-context.test.ts`
- **After every plan wave:** Run `pnpm --filter web test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 segundos

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| CTX-01 | 01,02,03 | 1,2 | Conteúdo extraído injetado no system prompt com delimitadores p/ grounding | T-SEC-01 | delimitadores anti-injection + "trate como dado de referência" | integration | `vitest run tests/attachment-context.test.ts` (suite CTX-01/CTX-02) | ✅ | ✅ green |
| CTX-02 | 01,02,03 | 1,2 | `attachmentContext` persistido; arquivo bruto NÃO armazenado | T-D07 | apenas string extraída persiste, sem bytes do arquivo | integration | `vitest run tests/attachment-context.test.ts` (suite CTX-01/CTX-02) | ✅ | ✅ green |
| CTX-03 | 01,02,03 | 1,2 | Follow-up reutiliza `latestWithAttachment` sem reanexar | — | N/A | integration | `vitest run tests/attachment-context.test.ts` (suite CTX-03) | ✅ | ✅ green |
| CTX-04 | 01,04 | 1,3 | Truncagem a MAX_EXTRACTED_CHARS=8000 antes da injeção | — | budget de tokens respeitado | integration | `vitest run tests/attachment-context.test.ts` (suite CTX-04) | ✅ | ✅ green |
| CTX-05 | 01,02,03 | 1,2 | IA pode sugerir tool adequado ao documento | — | N/A | manual | — (comportamento LLM não-determinístico) | ✅ (capacidade habilitada) | ⬜ manual-only |
| PRO-02 | 02,03,04 | 2,3 | Pro-gate antes de I/O de extração; 403 para free | T-PRO-02 (anti-bypass) | verificação de plano ANTES de `reserveToolUse`/extração; reserveToolUse não chamado | integration | `vitest run tests/attachment-context.test.ts` (suite PRO-02) | ✅ | ✅ green |
| PRO-03 | 02,03,04 | 2,3 | reserve/confirm/release; falha de extração → release sem debit | — | `releaseToolUse` em falha; `confirmToolUse` só no sucesso | integration | `vitest run tests/attachment-context.test.ts` (suite PRO-03) | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> **Cobertura cross-route:** A suíte `attachment-context.test.ts` exercita os 5 routes
> (formula, sql, regex, scripts, template) via multipart simulado com `dispatcherMocks` e `quotaMocks`,
> verificando 403 (PRO-02), 422 + `releaseToolUse` sem `confirmToolUse` (PRO-03), persistência de
> `attachmentContext` (CTX-01/02), reuso de histórico (CTX-03) e truncagem a 8000 chars (CTX-04).

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. vitest + mocks de Prisma/quota já presentes; nenhum framework novo instalado.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| IA sugere proativamente o tool mais adequado ao documento anexado (ex.: planilha num tool não-tabular) | CTX-05 | Comportamento de saída do LLM é não-determinístico — não testável de forma determinística. O requisito usa o modal "pode": a capacidade técnica está habilitada pela injeção do conteúdo no system prompt (verificável), mas a sugestão em si não é asserção automatizável. | Anexar uma planilha de dados num tool não-tabular (ex.: Regex) com um pedido ambíguo e confirmar que a IA pode mencionar o tool mais adequado no campo `explanation`/`warnings`. |

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
| Gaps found | 0 |
| Resolved (automated) | 0 (cobertura já completa) |
| Escalated to manual-only | 1 (CTX-05 — comportamento LLM não-determinístico) |

Reconstrução retroativa State B → A. 6 dos 7 requisitos (CTX-01..04, PRO-02, PRO-03) já tinham
cobertura automatizada verde (23 testes em 5 suites de `attachment-context.test.ts`). CTX-05 escalado
para manual-only por ser comportamento não-determinístico do LLM (capacidade técnica habilitada e
verificada na Phase 10). Nenhum gap MISSING; nenhum teste novo gerado — auditor não disparado.
