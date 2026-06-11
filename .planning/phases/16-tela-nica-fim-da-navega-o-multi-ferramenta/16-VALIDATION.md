---
phase: 16
slug: tela-nica-fim-da-navega-o-multi-ferramenta
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-11
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (apps/web) + tsc typecheck |
| **Config file** | `apps/web/vitest.config.ts` (existing) |
| **Quick run command** | `pnpm exec tsc --noEmit` (in `apps/web`) |
| **Full suite command** | `pnpm -r typecheck && pnpm -r test` |
| **Estimated runtime** | ~60–120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec tsc --noEmit` (apps/web)
- **After every plan wave:** Run `pnpm -r typecheck && pnpm -r test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01 Task 1 | 16-01 | 1 | SHELL-02 | — | Old tool page routes 308-redirect to `/workspace` via `next.config.ts redirects()` (page files untouched) | source + typecheck | `cd apps/web && pnpm exec tsc --noEmit` | ✅ existing | ⬜ pending |
| 16-01 Task 2 | 16-01 | 1 | SHELL-03 | — | Lean Topbar keeps session + "Sair" (logout) + adds `/privacidade` link | source + unit | `cd apps/web && pnpm exec tsc --noEmit && pnpm exec vitest run -t topbar` | ✅ existing | ⬜ pending |
| 16-01 Task 3 | 16-01 | 1 | SHELL-01 | — | `SAMPLE_SPEC` (TableSpecPayload "Controle de Gastos") exported for TableGridPanel `spec` | source + typecheck | `cd apps/web && pnpm exec tsc --noEmit` | ✅ existing | ⬜ pending |
| 16-02 Task 1 | 16-02 | 2 | SHELL-01 | — | `WorkspaceSplit` client component: grid+chat with responsive toggle (no unmount) | source + typecheck | `cd apps/web && pnpm exec tsc --noEmit` | ✅ existing | ⬜ pending |
| 16-02 Task 2 | 16-02 | 2 | SHELL-01 | — | `WorkspaceLayout` renders TableGridPanel (main) + UnifiedChatTool (side); Sidebar removed from layout | unit + typecheck | `cd apps/web && pnpm exec vitest run .../workspace/__tests__/layout.test.tsx && pnpm exec tsc --noEmit` | ✅ existing | ⬜ pending |
| 16-02 Task 3 | 16-02 | 2 | SHELL-02, CLEAN-05 | — | `sidebar.tsx`/`tool-nav.tsx` deleted, sidebar CSS removed; full suite green | full suite | `cd apps/web && pnpm exec tsc --noEmit && cd <root> && pnpm -r test` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. Per-task verify commands carried in the PLAN.md `<automated>` blocks (source of truth during execution).*

---

## Wave 0 Requirements

- Existing infrastructure (vitest + tsc) covers all phase requirements — no new framework install needed.
- This is a shell/layout refactor; primary automated signal is `pnpm -r typecheck` staying green plus existing `pnpm -r test`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Side-by-side layout (grade ~70% / chat ~30%) renders correctly | SHELL-01 | Visual layout proportion not assertable in unit tests | Sign in, visit `/workspace`, confirm grid dominant left + chat right |
| Responsive toggle (grade↔chat) on narrow screens | SHELL-01 | Viewport-dependent visual behavior | Shrink window below breakpoint; confirm toggle/tabs switch panels (no stacking) |
| Old tool routes redirect to `/workspace` in browser | SHELL-02 | 308 redirect observable via navigation | Visit `/workspace/sql`, `/workspace/ocr`, etc.; confirm land on `/workspace` |

*Note: tool API endpoints (`/api/tools/*`) remain orphaned this phase — deletion is Phase 18 (CONTEXT sequencing nuance). Verification MUST NOT flag this as a gap.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — existing vitest/tsc infra)
- [x] No watch-mode flags
- [x] Feedback latency < 120s (per-task tsc fast; full `pnpm -r test` reserved for end-of-plan wave check — 16-02 Task 3)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-11
