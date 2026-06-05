---
phase: 09
slug: extraction-infrastructure
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-05
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstructed retroactively from artifacts (State B) on 2026-06-05.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.7 (node environment) |
| **Config file** | `apps/web/vitest.config.ts` |
| **Quick run command** | `pnpm --filter web exec vitest run tests/extraction/` |
| **Full suite command** | `pnpm --filter web test` |
| **Estimated runtime** | ~7s (quick · 4 files / 45 testes) · ~30s (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter web exec vitest run tests/extraction/`
- **After every plan wave:** Run `pnpm --filter web test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 segundos

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| EXT-01 | 02 | — | CSV/XLSX → schema + amostra (multi-aba) | — | N/A | unit | `vitest run tests/extraction/reuse-extractors.test.ts` | ✅ | ✅ green |
| EXT-02 | 02 | — | PNG/JPEG → tabela Markdown via OCR | — | fixture-mode preservado sem API key | unit | `vitest run tests/extraction/reuse-extractors.test.ts` | ✅ | ✅ green |
| EXT-03 | 03 | — | PDF com texto → unpdf | — | N/A | unit | `vitest run tests/extraction/security-extractors.test.ts` | ✅ | ✅ green |
| EXT-04 | 02 | — | TXT → TextDecoder direto | — | EMPTY_EXTRACTION em whitespace | unit | `vitest run tests/extraction/reuse-extractors.test.ts` | ✅ | ✅ green |
| EXT-05 | 04 | — | Dispatcher único roteia por tipo, sem lógica duplicada | — | guards antes de qualquer parse | integration | `vitest run tests/extraction/dispatcher.test.ts` | ✅ | ✅ green |
| EXT-06 | 03 | — | PDF escaneado (text<50) → SCANNED_PDF, sem fallback | — | erro acionável, sem I/O extra | unit | `vitest run tests/extraction/security-extractors.test.ts` | ✅ | ✅ green |
| SEC-02 | 03,04,05 | — | Magic bytes (file-type) + anti-ZIP-bomb (ratio + per-entry) + MAX_INPUT_BYTES antes do parse | T-09-03 (zip bomb) / CR-01 / CR-02 | ZIP bomb e bytes inválidos rejeitados antes de XLSX.read; >25MB → FILE_TOO_LARGE sem alocação | unit/security | `vitest run tests/extraction/security-extractors.test.ts` | ✅ | ✅ green |
| (deps) | 01 | — | unpdf/file-type/fflate instaláveis e importáveis | — | N/A | smoke | `vitest run tests/extraction/zip-guard-deps.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> **Cobertura de segurança (SEC-02):** os testes `security-extractors.test.ts` cobrem magic bytes
> (PNG/JPEG/PDF/XLSX/texto/GIF), ratio bomb (~1000x > MAX_RATIO=100), per-entry bomb (26 MB > 25 MB cap),
> regressão de XLSX legítimo com dados repetitivos (não falso-positivo), `FILE_TOO_LARGE` e limite exato
> (strict-greater). Ordering `MAX_INPUT_BYTES → detectFileType → guardXlsxZip → extractCsvXlsx` validado.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. vitest já presente; libs novas (unpdf, file-type, fflate) instaladas pelo plano 09-01 com smoke test dedicado (`zip-guard-deps.test.ts`).

---

## Manual-Only Verifications

All phase behaviors have automated verification.

> Todos os 7 requisitos (EXT-01..06, SEC-02) têm cobertura automatizada determinística. O fixture-mode
> do OCR (EXT-02 sem `OPENAI_API_KEY`) é exercitado pelos testes; a extração real via Vision é herdada do
> tool de OCR existente (Phase 5), fora do escopo de extração desta fase.

---

## Validation Sign-Off

- [x] All tasks have automated verify or are documented Manual-Only
- [x] Sampling continuity: no 3 consecutive requirements without automated verify
- [x] Wave 0 covers all MISSING references (none — existing infra + smoke test)
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
| Escalated to manual-only | 0 |

Reconstrução retroativa State B → A. Os 7 requisitos (EXT-01..06, SEC-02) já tinham cobertura
automatizada verde (45 testes em 4 arquivos de `tests/extraction/`). Nenhum gap MISSING. Nenhum teste
novo gerado — auditor não precisou ser disparado. Suíte confirmada verde: 66 passed (incluindo Phase 10).
