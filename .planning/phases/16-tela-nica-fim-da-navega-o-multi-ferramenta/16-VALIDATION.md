---
phase: 16
slug: tela-nica-fim-da-navega-o-multi-ferramenta
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 16-XX | TBD | TBD | SHELL-01 | — | Authenticated user lands on `/workspace` rendering grid (main) + chat (side) without navigating | integration/manual | `pnpm exec tsc --noEmit` + manual visit | ✅ existing | ⬜ pending |
| 16-XX | TBD | TBD | SHELL-02 | — | Old tool page routes 308-redirect to `/workspace`; no Sidebar/ToolNav reachable | grep + manual | `grep -r ToolNav apps/web/src` returns no UI usage | ✅ existing | ⬜ pending |
| 16-XX | TBD | TBD | SHELL-03 | — | Topbar exposes session + logout + `/privacidade` link from single screen | source assertion | `grep -r '/privacidade' apps/web/src/components/app/topbar.tsx` | ✅ existing | ⬜ pending |
| 16-XX | TBD | TBD | CLEAN-05 | — | Active multi-tool nav (Sidebar 7 navItems) removed from shell | source assertion | Sidebar not imported by layout; typecheck green | ✅ existing | ⬜ pending |

*Per-task rows finalized by planner; Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
