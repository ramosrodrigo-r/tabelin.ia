---
phase: 15-export-ux-migration-hardening
status: secured
asvs_level: standard
block_on: high
audited: 2026-06-10
threats_total: 8
threats_closed: 8
threats_open: 0
threats_accepted: 3
register_authored_at_plan_time: true
---

# SECURITY.md — Phase 15: Export, UX Migration & Hardening

Audit date: 2026-06-10
ASVS level: standard
block_on: high

## Threat Verification Summary

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-15-01 | Tampering / EoP | mitigate | CLOSED | `apps/web/src/features/unified-chat/lib/table-export.ts:15` (`DANGEROUS_LEAD` regex), `:27` (`LEADING_NEUTRALIZERS`, CR-01 fix), `:41-45` (`sanitizeCellForExport` evaluates trigger on raw value AND on value with leading neutralizers stripped), `:60-66` (`csvField` applies sanitization before quoting), `:96,98` (`buildXlsx` sanitizes header+body cells). Handlers `handleExportCsv`/`handleExportXlsx` at `apps/web/src/features/unified-chat/components/table-grid-panel.tsx:428-438` call `buildCsv`/`buildXlsx` exclusively — no alternate unsanitized path. CR-01 regression tests at `apps/web/tests/table-export.test.ts:48-66` cover `"=cmd"`, ` =1+1`, `\t=1+1`, `'=1+1`, `` `=1+1``, plus 2 negative cases (`"texto"`, ` Categoria`). |
| T-15-02 | Tampering | mitigate | CLOSED | `apps/web/src/features/unified-chat/lib/table-export.ts:96` (header cells) and `:98` (body cells) write `{ t: "s" as const, v: sanitizeCellForExport(...) }` via `aoa_to_sheet` — no raw value ever passed. Test `apps/web/tests/table-export.test.ts:114` asserts every data cell has `t === "s"`; `:128-134` confirms `"=1+1"` → `v: "'=1+1"`, `t: "s"`. |
| T-15-03 | Tampering | mitigate | CLOSED | `apps/web/src/features/unified-chat/lib/table-export.ts:60-66` (`csvField`) runs `sanitizeCellForExport` per cell, then RFC 4180 quoting; called once per column per row inside `buildCsv` (`:81`) — not applied per-line, so payload-via-separator cannot bypass per-cell sanitization. |
| T-15-04 | DoS / Tampering (xlsx CVE-2023-30533, CVE-2024-22363) | accept | CLOSED | **Accepted risk** (see Accepted Risks Log below). Confirmed via grep across all phase-changed files (`table-export.ts`, `table-grid-panel.tsx`): only `XLSX.utils.aoa_to_sheet`, `XLSX.utils.book_new`, `XLSX.utils.book_append_sheet`, `XLSX.writeFile` are used — zero matches for `XLSX.read`, `XLSX.readFile`, or `sheet_to_*` (parse path). `apps/web/package.json:39` confirms `xlsx@0.18.5` unchanged (no new dep). |
| T-15-05 | Information Disclosure | mitigate | CLOSED | `apps/web/src/features/unified-chat/components/table-grid-panel.tsx:427-438` — comment "sempre displayRows (calculado), nunca rows (templates)"; `handleExportCsv`/`handleExportXlsx` pass `displayRows` (not `historyState.present.rows`). `downloadCsv`/`downloadXlsx` (`table-export.ts:116-132`) are pure Blob/DOM effects — no `fetch`/network call in the export path. |
| T-15-06 | DoS (navigation regression) | mitigate | CLOSED | `grep -c ToolNav apps/web/src/features/unified-chat/unified-chat-tool.tsx` → `0` (prop + import removed). `apps/web/src/app/(workspace)/workspace/layout.tsx:3,28` imports and renders `<Sidebar />` as sibling of `<main>`, applied to all `/workspace/*` routes including root. Deep links (`/workspace/sql`, etc.) unchanged. |
| T-15-07 | Information Disclosure (fixture reads OPENAI_API_KEY) | accept | CLOSED | **Accepted risk** (see Accepted Risks Log below). `process.env.OPENAI_API_KEY` checks unchanged at `apps/web/src/server/ai/table-clarifier.ts:179,254`. New test `describe("buildTableSpec — fixture mode")` at `apps/web/tests/table-clarifier.test.ts:93-161` deletes/restores the var (lines 95, 99-102) and asserts deterministic, non-sensitive fixture output (`title === "Controle de Gastos"`, formula column contains `"=SOMA"`, `tableSpecPayloadSchema.safeParse(...).success === true`). |
| T-15-SC | Tampering (supply chain) | accept | CLOSED | **Accepted risk** (see Accepted Risks Log below). `apps/web/package.json:39` shows `"xlsx": "0.18.5"` — pre-existing entry, no new packages added across plans 01/02/03 (no diff to dependency lists confirmed via package.json review). |

## Accepted Risks Log

### AR-01 — T-15-04: xlsx@0.18.5 known CVEs (write-path only)
- **Risk:** `xlsx@0.18.5` (SheetJS) has known advisories: CVE-2023-30533 (prototype pollution) and CVE-2024-22363 (ReDoS), both triggered via the **parse/read** path (`XLSX.read`, `XLSX.readFile`, `sheet_to_*`).
- **Scope check (this phase):** `apps/web/src/features/unified-chat/lib/table-export.ts` and `apps/web/src/features/unified-chat/components/table-grid-panel.tsx` use exclusively the **write** path: `aoa_to_sheet`, `book_new`, `book_append_sheet`, `writeFile`. No external/untrusted input is deserialized via xlsx in this phase.
- **Decision:** Accept. No new dependency installed; version pinned at `0.18.5`.
- **Follow-up (tracked, non-blocking):** 15-REVIEW.md WR-05 recommends migrating to SheetJS's official patched CDN distribution (`>=0.20.x`) or documenting acceptance — this entry satisfies the documentation requirement. If a future phase introduces an `XLSX.read`/parse path (e.g., importing user-uploaded XLSX), this risk MUST be re-evaluated and likely BLOCKS until xlsx is upgraded to a patched distribution.

### AR-02 — T-15-07: fixture-mode fallback reads OPENAI_API_KEY
- **Risk:** `buildTableSpec` (and `askClarificationQuestion`) branch on `process.env.OPENAI_API_KEY` to decide between live OpenAI call and a deterministic fixture response.
- **Scope check:** This phase does not rename, log, or expose the env var; it only adds test coverage for the existing fixture branch (`apps/web/tests/table-clarifier.test.ts:93-161`). The fixture payload (`title: "Controle de Gastos"`, formula `=SOMA(...)`) contains no secrets or environment data.
- **Decision:** Accept. No mitigation required — informational read of a presence/absence check, not a value disclosure.

### AR-03 — T-15-SC: no new npm/pnpm dependencies installed (Phase 15)
- **Risk:** Standard supply-chain risk for any new package.
- **Scope check:** Reviewed `apps/web/package.json` — `xlsx@0.18.5` is the only relevant dependency and was already present prior to Phase 15 (reused, not newly installed). No `pnpm-lock.yaml` diff for new packages attributable to plans 15-01/02/03.
- **Decision:** Accept. No action required.

## Unregistered Flags

None. SUMMARY.md files for 15-01 and 15-03 contain no `## Threat Flags` section (no new attack surface declared by executor). 15-02-SUMMARY.md `## Threat Flags` explicitly states "None — reuses sanitization/encoding surface from Plan 01".

15-REVIEW.md WR-05 (xlsx@0.18.5 CVEs) maps directly to the already-registered T-15-04 — informational, not unregistered.

## Notes on Out-of-Scope Findings (15-REVIEW.md)

The following findings from 15-REVIEW.md are **not part of the Phase 15 threat register** and are therefore out of scope for this audit (no threat ID maps to them). They do not block this audit but are noted for engineering follow-up:
- WR-01 (sort/cardinality bug in `handleChange`) — functional correctness, not in threat register.
- WR-02 (`Date.now()` column key collision) — functional correctness, not in threat register.
- WR-03 (column-key normalization divergence between grid and export) — functional correctness; could cause silent empty-cell export but is not a STRIDE threat in this register.
- WR-04 (numeric values exported as XLSX text) — UX degradation, not a security threat.
- IN-01 through IN-04 — informational, no security impact identified.
