---
phase: 12
slug: intent-classifier-unified-route
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-08
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `apps/web/vitest.config.ts` |
| **Quick run command** | `pnpm --filter web test -- tests/intent-classifier.test.ts tests/unified-route.test.ts tests/unified-chat-tool.test.tsx tests/topbar.test.tsx` |
| **Full suite command** | `pnpm --filter web test` |
| **Estimated runtime** | ~20-45 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick command scoped to the test files touched by that task.
- **After every plan wave:** Run `pnpm --filter web test`.
- **Before `/gsd:verify-work`:** `pnpm --filter web typecheck`, `pnpm --filter web lint`, and `pnpm --filter web test` must all exit 0.
- **Max feedback latency:** 45 seconds for scoped tests; full suite may exceed this only at wave/phase gates.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | UNI-01, UNI-06 | T-12-01-01, T-12-01-02 | Shared schema validates only known intents/events; malformed events fail closed | unit | `pnpm --filter web test -- tests/unified-schema.test.ts tests/intent-classifier.test.ts` | W0 | pending |
| 12-01-02 | 01 | 1 | UNI-01, UNI-06 | T-12-01-02, T-12-01-03 | `overrideIntent` is enum-validated; classifier fixture reaches >=17/20 pt-BR prompts | unit | `pnpm --filter web test -- tests/intent-classifier.test.ts` | W0 | pending |
| 12-02-01 | 02 | 2 | UNI-01, UNI-02, UNI-04, UNI-05, UNI-06 | T-12-02-01, T-12-02-02, T-12-02-03 | Route authenticates first, pro-gates file requests before quota, and maps intent server-side | integration | `pnpm --filter web test -- tests/unified-route.test.ts` | W0 | complete |
| 12-02-02 | 02 | 2 | UNI-04 | T-12-02-04 | `table_stub` persists as text context without raw JSON or HTML | unit | `pnpm --filter web test -- tests/context-messages.test.ts tests/unified-route.test.ts` | existing + W0 | complete |
| 12-03-01 | 03 | 3 | UNI-02, UNI-03, UNI-05 | T-12-03-01, T-12-03-02 | Hook parses NDJSON with Zod, shows `intent_detected` first, never sets multipart content-type manually | UI/unit | `pnpm --filter web test -- tests/unified-chat-tool.test.tsx` | W0 | complete |
| 12-03-02 | 03 | 3 | UNI-02, UNI-03, UNI-05 | T-12-03-03 | Intent dropdown is keyboard-closable and override re-submits original prompt with `overrideIntent` | UI | `pnpm --filter web test -- tests/unified-chat-tool.test.tsx` | W0 | complete |
| 12-04-01 | 04 | 4 | UNI-07 | T-12-04-01 | `/workspace` is unified default; deep links for existing tools remain reachable | UI/regression | `pnpm --filter web test -- tests/topbar.test.tsx tests/conversations-route.test.ts` | existing + W0 | pending |
| 12-04-02 | 04 | 4 | UNI-01..UNI-07 | T-12-04-02 | Full phase does not regress typecheck, lint, or existing test suite | phase gate | `pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web test` | existing | pending |

*Status: pending until execution writes tests and implementation.*

---

## Wave 0 Requirements

- [ ] `apps/web/tests/intent-classifier.test.ts` — 20 pt-BR prompts covering formula, SQL, regex, script, template, file_analysis, OCR, and tabela. Fixture-mode criterion: at least 17/20 correct.
- [ ] `apps/web/tests/unified-schema.test.ts` — unified stream and table-stub schema parse/fail-closed checks.
- [ ] `apps/web/tests/unified-route.test.ts` — auth, quota, pro-gate, `intent_detected` first event, override dispatch, table stub persistence, `needs_file`.
- [ ] `apps/web/tests/unified-chat-tool.test.tsx` — intent pill, dropdown override, render dispatcher, session context selector, needs-file/table-stub UI.
- [ ] `apps/web/tests/conversations-route.test.ts` — existing per-tool delete still works and unified delete clears formula/sql/regex/script/template/unified_table.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| First visible response begins within 2.5s with real provider | UNI-06 | CI fixture mode cannot measure production model/provider latency | With `OPENAI_API_KEY` configured, run the app and send "me dá uma fórmula PROCV"; record time from click to first streamed NDJSON event in browser Network timing. Pass if first response event starts in <=2.5s. |
| Classifier accuracy with real provider reaches 19/20 | UNI-01 | Fixture mode proves deterministic fallback only; real model must be smoke-tested before release | Temporarily run `OPENAI_API_KEY=... pnpm --filter web test -- tests/intent-classifier.test.ts`; pass if the real-provider block reports >=19/20 correct. |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing test files.
- [x] No watch-mode flags.
- [x] Feedback latency target is defined.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved for Phase 12 planning.
