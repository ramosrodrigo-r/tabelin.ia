---
quick_id: 260618-l61
audit_type: retroactive
asvs_level: 1
block_on: open
threats_total: 4
threats_closed: 4
threats_open: 0
audited: 2026-06-18
---

# Security Audit — 260618-l61 (Edição direta de células)

Two pieces audited in this pass:
1. **First audit** of 260618-l61's own threat register (T-260618-01, T-260618-02) — no prior SECURITY.md existed for this quick task.
2. **Retroactive re-check** of two follow-up bug-fix commits to 260617-ukf's already-audited code (`4622312`, `f5f4ce2`), made after `260617-ukf-SECURITY.md` was written, to confirm they don't reopen or bypass T-260617-01..04.

Verification method: every disposition below was checked against the actual implementation
in `table-grid-panel.tsx` — not against PLAN.md/SUMMARY.md prose. Evidence cited by line number.
Git history (`git log`, `git show`) was used to establish the true authorship of each code
change, since the audit brief's attribution of one change turned out to be incorrect (see
T-260618-03 below).

## Piece 1 — 260618-l61 own threat register

### T-260618-01 — Tampering — Captura de teclado global (`handleCellEditKeyDown`)
**Disposition:** mitigate
**Status:** CLOSED

Mitigation plan: listener only acts when `activeCell` is set AND `document.activeElement` is
not INPUT/TEXTAREA; `type === 'formula'` columns are explicitly blocked.

Evidence (`table-grid-panel.tsx:366-403`):
- Line 368: `if (!activeCell) return;` — no-op without an active cell.
- Line 369-370: `const focusedTag = (document.activeElement as HTMLElement | null)?.tagName; if (focusedTag === "INPUT" || focusedTag === "TEXTAREA") return;` — early-out whenever any other input/textarea on the page (e.g. the chat box) currently has focus. This check runs on every keydown, before any buffer mutation, so it applies uniformly to all branches below it (edit-mode keys and start-edit keys alike) — single check, all entry points covered.
- Line 371-372: `const col = currentColumns.find((c) => c.key === activeCell.colKey); if (col?.type === "formula") return;` — formula columns are excluded before any buffer write, in both "in edit mode" and "not yet editing" branches (this guard precedes the `if (editBuffer !== null)` split at line 374, so it covers both).
- Listener is registered via `window.addEventListener("keydown", handleCellEditKeyDown)` (line 401) and cleaned up on unmount/dependency change (line 402) — single global listener, no duplicate/parallel listener that could bypass the guards above.

Verdict: both declared conditions (focus check, formula-column check) are present and execute unconditionally before any state mutation. No alternate code path reaches `setEditBuffer`/`commitCellEdit` without passing through both checks.

### T-260618-02 — Tampering — Texto livre digitado na célula
**Disposition:** mitigate
**Status:** CLOSED

Mitigation plan: typed value is treated as an opaque string via `formatCellValue` — never
`dangerouslySetInnerHTML`, never `eval` — same guarantee already audited for Sigma/Mesclar in
260617-ukf (T-260617-03).

Evidence:
- `commitCellEdit` (`table-grid-panel.tsx:356-364`) writes the typed value into `newRows` via plain object spread (`{ ...row, [colKey]: newValue }`) and routes it through the existing `dispatch({ type: "SET", ... })` pipeline (line 361) — the identical `dispatch` path already audited for Sigma (T-260617-03), not a new write surface.
- `dispatch`'s `SET` flows into `currentRows` → `useFormulaEngine(currentRows, ...)` (`table-grid-panel.tsx:328-332`) → `recalcAll` (`use-formula-engine.ts:651-689`). Grep for `eval(`/`new Function` across both `table-grid-panel.tsx` and `use-formula-engine.ts` returns zero matches (confirmed independently in this audit, not just cited from the prior one).
- Render path for the in-progress edit buffer itself (not yet committed) is `table-grid-panel.tsx:994-1001`: `<span className="cell-edit-active" ...>{latest.editBuffer}<span className="cell-edit-caret" aria-hidden /></span>` — `editBuffer` (a plain string) is interpolated as React children (auto-escaped text node), never via `dangerouslySetInnerHTML`. Grep confirms `dangerouslySetInnerHTML` does not appear anywhere in the file.
- Once committed, the value renders through the standard `formatCellValue(displayValue, effectiveType, style?.decimals)` path (line 1004), identical to every other cell value — no special-cased rendering for user-typed text that could diverge from the already-hardened formatter.

Verdict: typed text never reaches an HTML/JS execution sink, neither while buffered (raw text node) nor after commit (`formatCellValue`). Mitigation as declared is present at both the in-progress and committed render paths.

## Piece 2 — Retroactive re-check of 260617-ukf follow-up commits

**Important correction to the audit brief's premise:** the brief states that commit `4622312`
"added `e.stopPropagation()` to the cell's mousedown handler." This is not what the git history
shows. Verified via `git show 4622312` and `git show f5f4ce2`: in both commits,
`handleCellMouseDown` is still declared as `const handleCellMouseDown = () => {` — a
zero-argument callback, with no `MouseEvent` parameter and no `stopPropagation()` call. The
`e.stopPropagation()` call was actually introduced by the **260618-l61 feature commit itself**
(`3695e60`, "feat(quick-260618-l61): edicao direta de celulas sem passar pelo chat") — confirmed
via `git show 3695e60 | grep -B5 stopPropagation` and `git log --oneline --reverse` showing
commit order `4622312` → `f5f4ce2` → `3695e60`.

This reclassifies that change: `stopPropagation()` is in-scope of 260618-l61's own threat model
(it exists specifically to support `commitCellEdit`/`setActiveCell` switching on click for the
direct-edit feature — see comment at `table-grid-panel.tsx:955-959`), not an unaudited orphan
left over from 260617-ukf. It is covered below as a supplementary item under this audit (not
under the old 260617-ukf register, which correctly never mentioned it since it didn't exist at
that audit's time).

### T-260618-03 — Tampering / Repudiation (candidate) — `e.stopPropagation()` on per-cell `mousedown` (introduced in `3695e60`, mis-attributed by audit brief to `4622312`)
**Disposition:** mitigate (assessed retroactively in this audit; not declared in PLAN.md, since the brief's premise about its origin was inaccurate)
**Status:** CLOSED

Candidate concern: does stopping propagation prevent any legitimate security-relevant behavior
in `react-datasheet-grid`'s own internal document-level `mousedown` listener from running (e.g.
its own selection/sanitization)?

Evidence:
- `handleCellMouseDown` (`table-grid-panel.tsx:955-973`) calls `e.stopPropagation()` then runs: merge-target check, paint-target check, auto-commit of any pending edit, and `setActiveCell(...)`. All of these are this application's own state transitions — none of them are security boundaries (no auth check, no input sanitization, no privilege check is performed by `react-datasheet-grid`'s document mousedown listener; per the PLAN.md's own documented investigation, that listener exists purely to manage the library's internal focus/selection UI state, not to sanitize or gate data).
- The cell component (`renderCell`, lines 914-1015) is fully custom — it does not render `react-datasheet-grid`'s native editable `<input>` at all (confirmed: no `<input>` element appears inside `renderCell`; the only inputs in the whole file are the unrelated filter-text box and the column-visibility checkboxes). Since the library's native cell-edit input is never mounted in this implementation, there is no native sanitization/validation path inside `react-datasheet-grid` for `stopPropagation()` to suppress — the application already owns 100% of the cell-edit data path via `commitCellEdit` → `dispatch` (same pipeline as T-260618-02).
- `disabled: isFormula ? () => true : undefined` (line 1045) is set directly on the `keyColumn` definition passed to `react-datasheet-grid`, independent of the mousedown handler — formula-column read-only enforcement does not rely on the document-level listener that `stopPropagation()` suppresses, so that protection is unaffected.

Verdict: `stopPropagation()` only suppresses `react-datasheet-grid`'s internal focus/selection bookkeeping (a UX concern, not a security control) for a library-native edit UI that is never rendered in this implementation. No security-relevant behavior (sanitization, validation, access control) is bypassed.

### T-260618-04 — Tampering / Information Disclosure (candidate) — always-on 100%/100% fill + `outline` CSS reading from `isActiveCell` (commits `4622312`, `f5f4ce2`)
**Disposition:** mitigate (assessed retroactively; both candidate sub-questions from the audit brief checked independently)
**Status:** CLOSED

**Sub-question A — does always-filling width/height change anything about the T-260617-01 fixed-palette mitigation?**

Evidence:
- `cellInlineStyle` (`table-grid-panel.tsx:937-953`) sets `color: style?.color` and `background: style?.background` exactly as before `4622312` — the only change in that commit was making `width`/`height`/`display`/`boxSizing` unconditional (no longer gated on `style` being truthy) and adding `height: "100%"`. The `color`/`background` fields themselves are still sourced exclusively from `style?.color`/`style?.background`, which in turn come only from `cellStyles[styleKey]` — populated only via `applyCellStyleToActive({ color: swatch })` / `applyCellStyleToActive({ background: swatch })` where `swatch` is bound to the fixed `COLOR_SWATCHES` array (`table-grid-panel.tsx:1738,1745-1746` and `1766,1773-1774`), identical call sites already verified in `260617-ukf-SECURITY.md` T-260617-01.
- The 100%/100% fill change is orthogonal to color sourcing — it only affects layout geometry (which area is clickable/painted), not which values can populate `color`/`background`. No new free-text path was introduced.

Verdict: T-260617-01's mitigation (fixed-palette-only color/background) is unaffected by the always-on fill change — same evidence, still CLOSED.

**Sub-question B — does the new `outline` property (added in `f5f4ce2`) read any user-controllable value?**

Evidence:
- `table-grid-panel.tsx:951-952`: `outline: isActiveCell ? "2px solid var(--primary)" : undefined, outlineOffset: isActiveCell ? "-1px" : undefined`. `isActiveCell` (line 924-925) is a boolean derived from `latest.activeCell?.rowIndex === originalRowIndex && latest.activeCell?.colKey === colKey` — a comparison of internal numeric/key state, not a value rendered into the style itself.
- The only string interpolated into the `outline` CSS value is the literal `"2px solid var(--primary)"` — a hardcoded string constant with no template interpolation of any row/cell/user data.
- `--primary` is defined once, module/global-scope, in `apps/web/src/styles/globals.css:9` as `--primary: #0b6b57;` — a fixed hex value with no user input path (grep confirms this is the only definition of `--primary` in the stylesheet; it is not set via inline `style` anywhere, so it cannot be overridden by row/cell data).

Verdict: `outline` is driven entirely by a boolean derived from internal selection state and a hardcoded CSS custom property — no user-controllable text reaches this (or any) CSS property via this change. Confirmed, not merely assumed as the audit brief anticipated.

## Summary Table

| Threat ID | Category | Disposition | Evidence | Status |
|-----------|----------|-------------|----------|--------|
| T-260618-01 | Tampering | mitigate | `table-grid-panel.tsx:366-403` — focus-guard + formula-column guard precede all buffer mutations | CLOSED |
| T-260618-02 | Tampering | mitigate | `table-grid-panel.tsx:356-364,994-1001,1004` + `use-formula-engine.ts` — opaque string, no `eval`/`dangerouslySetInnerHTML` | CLOSED |
| T-260618-03 (supplementary, this audit) | Tampering/Repudiation | mitigate | `table-grid-panel.tsx:955-973,1045` — `stopPropagation()` only suppresses library UX bookkeeping for a native edit UI that is never rendered; formula-lock unaffected | CLOSED |
| T-260618-04 (supplementary, this audit) | Tampering/Information Disclosure | mitigate | `table-grid-panel.tsx:937-953,951-952` + `globals.css:9` — color/background still fixed-palette only; `outline` driven by boolean + hardcoded CSS var | CLOSED |

## Audit Brief Correction (logged for traceability)

The audit brief asserted commit `4622312` added `e.stopPropagation()` to the cell mousedown
handler. Git history (`git show 4622312`, `git show f5f4ce2`, `git log --oneline --reverse`)
shows this is incorrect: `stopPropagation()` was introduced by the 260618-l61 feature commit
`3695e60`, after both `4622312` and `f5f4ce2`. This does not change the audit outcome (the
change is still verified CLOSED under T-260618-03 above) but is logged here so the discrepancy
between the brief and the actual commit history is traceable for future audits.

## Unregistered Flags (SUMMARY.md `## Threat Flags`)

SUMMARY.md (260618-l61) states: "Nenhuma superfície de ameaça nova além das registradas no
`<threat_model>` do PLAN (T-260618-01, T-260618-02)."

Independent check performed (not accepted at face value):
- New network calls: none found — `commitCellEdit` writes only to in-memory `dispatch`, same as pre-existing Sigma/Mesclar paths. No new `fetch(` call sites introduced (grep confirms the file's only `fetch(` is the pre-existing `/api/workspace/import`, unrelated and out of scope).
- `dangerouslySetInnerHTML`/raw HTML injection: none found anywhere in the file (grep, zero matches).
- New `eval`/`Function()`/`new Function`: none found in `table-grid-panel.tsx` or `use-formula-engine.ts` (grep, zero matches).
- `cellRendererCacheRef`/`latestCellRenderDataRef` (new in this phase, stability refactor): inspected — both are `useRef` containers holding either a `Map` of pure render functions or the latest already-trusted in-memory render data (`cellStyles`, `activeCell`, `editBuffer`, etc.); neither introduces a new external input or rendering primitive — they only change *when* existing trusted state is read (via ref at call-time instead of via closure), not *what* is read or *how* it's rendered.
- The two 260617-ukf follow-up commits (`4622312`, `f5f4ce2`): independently re-assessed above as T-260618-03/04 — both CLOSED, no new unmitigated attack surface.

Result: **none** — no unregistered attack surface found beyond the two supplementary items
already classified and closed above. The SUMMARY.md claim is corroborated by independent code
inspection.

## Conclusion

4/4 threats CLOSED (2 from 260618-l61's own register + 2 supplementary items from the
retroactive re-check of 260617-ukf's two follow-up commits). 0 threats OPEN. `block_on: open`
config — no block triggered. The pre-existing `260617-ukf-SECURITY.md` (T-260617-01..04) remains
valid and unaffected by the two follow-up commits; no re-opening of those four threats was
required.
