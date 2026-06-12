---
phase: 18
slug: remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-11
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (apps/web) |
| **Config file** | apps/web/vitest.config.ts |
| **Quick run command** | `pnpm --filter web test <file>` |
| **Full suite command** | `pnpm -r typecheck && pnpm -r test` |
| **Estimated runtime** | ~30–60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter web test <affected file>`
- **After every plan wave:** Run `pnpm -r typecheck && pnpm -r test`
- **Before `/gsd:verify-work`:** Full suite must be green (SC#5)
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _planner fills_ | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] _planner fills — this is a removal phase; "tests" are primarily zero-reference greps + green typecheck/test per block_

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| _planner fills_ | | | |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
