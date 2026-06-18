---
quick_id: 260617-ukf
audit_type: retroactive
asvs_level: 1
block_on: open
threats_total: 4
threats_closed: 4
threats_open: 0
audited: 2026-06-17
---

# Security Audit — 260617-ukf (Funções da toolbar da planilha)

Verification method: every `mitigate`/`accept` disposition below was checked against the
actual implementation in `table-grid-panel.tsx` / `use-formula-engine.ts` — not against
PLAN.md/SUMMARY.md prose. Evidence is cited by line number.

## Threat Verification

### T-260617-01 — Tampering — `cellStyles` inline style injection via `color`/`background`
**Disposition:** mitigate
**Status:** CLOSED

Mitigation plan: cor/fundo só vêm de paletas fixas pré-definidas (swatches), nunca de
`<input type="text">` livre.

Evidence:
- `COLOR_SWATCHES` is a fixed, hardcoded module-scope array of 8 hex strings (`table-grid-panel.tsx:187-196`).
- The text-color popover (`table-grid-panel.tsx:1586-1601`) renders `COLOR_SWATCHES.map(...)`; the only handler that sets `color` is `applyCellStyleToActive({ color: swatch })` at line 1595, where `swatch` is bound to the array element — no free-text path.
- The fill-color popover (`table-grid-panel.tsx:1613-1629`) is identical: `applyCellStyleToActive({ background: swatch })` at line 1623, same fixed array.
- Grep confirms the only `type="text"` input in the file is the unrelated filter-bar search box (line 1344) — there is no text/color `<input>` feeding `cellStyles.color` or `cellStyles.background`.
- The resulting inline style is applied via React's `style={cellInlineStyle}` object (`table-grid-panel.tsx:850-865`), not `dangerouslySetInnerHTML` (confirmed absent via grep) — even if a value escaped the swatch constraint, React's style-object API does not parse/execute CSS strings the way `style="..."` HTML-attribute injection would.

Verdict: mitigation as declared is present and complete — both color-bearing fields (`color`, `background`) are constrained to the fixed palette at every call site that sets them.

### T-260617-02 — Information Disclosure — Botão Compartilhar / Web Share API
**Disposition:** accept
**Status:** CLOSED (accepted risk recorded below)

Justification claimed: conteúdo compartilhado é estritamente os dados já visíveis na
própria tabela do usuário, ação client-side explícita, sem novo endpoint de rede.

Evidence verified against code:
- `buildShareText` (`table-grid-panel.tsx:534-540`) builds a TSV string purely from `currentColumns`/`displayRows` — the same data already rendered in the visible grid. No additional/hidden fields are pulled in.
- `handleCopyTableAsText` (`table-grid-panel.tsx:542-551`) calls only `navigator.clipboard.writeText(text)` — a browser API, not a network call.
- `handleShareFile` (`table-grid-panel.tsx:553-563`) calls only `navigator.share({ files: [file], title: ... })`, gated by `typeof navigator.share === "function"` — also a browser API, not a network call.
- Grep for `fetch(` in the file returns exactly one match (line 1017, the pre-existing `/api/workspace/import` endpoint used by the unrelated Import flow) — confirms no new network endpoint was introduced by Share.
- Both actions require an explicit user click (`onClick={handleCopyTableAsText}` / `onClick={handleShareFile}` inside the share dialog, lines 1685/1690) — no auto-trigger.

This is this audit's first pass (no prior SECURITY.md existed), so this entry constitutes
the accepted-risk log entry for T-260617-02 going forward.

**Accepted Risk Log Entry:**
| ID | Risk | Scope | Accepted By | Rationale |
|----|------|-------|--------------|-----------|
| T-260617-02 | User-initiated disclosure of own table data via OS clipboard / native Web Share sheet | `handleCopyTableAsText`, `handleShareFile` in `table-grid-panel.tsx` | Phase plan (260617-ukf) | Data shared is identical to what's already visible to the same user in the grid; no new data is exposed beyond what CSV/XLSX export already exposes; action requires explicit click; no server-side egress added. Equivalent risk profile to pre-existing CSV/XLSX export buttons. |

### T-260617-03 — Tampering — Sigma insere fórmula em célula
**Disposition:** mitigate
**Status:** CLOSED

Mitigation plan: reusa `dispatch`/`useFormulaEngine` já existente — mesmo motor que já
trata `#NAME?`/`#ERRO!`; nenhuma superfície nova de `eval`.

Evidence:
- `handleSigmaClick` (`table-grid-panel.tsx:431-437`) builds `buildSigmaRow(row, activeCell.colKey)` (pure helper, `table-grid-panel.tsx:202-207`, inserts the literal string `"=SOMA()"`) and routes it through `dispatch({ type: "SET", newState: {...} })` — the exact same `dispatch` path used by `addRow`/`addColumn`/`handleChange` elsewhere in the file. No bespoke write path was introduced.
- `dispatch`'s `SET` action flows into `currentRows`, which feeds `useFormulaEngine(currentRows, currentColumns, currentSeparator)` (`table-grid-panel.tsx:312-316`) — confirmed by reading `use-formula-engine.ts`: `recalcAll` → `evaluateFormulaCells` → `extractFunctionName`/`isArithmeticExpression` → either `formulajs` function dispatch or the custom tokenizer/shunting-yard `evaluateArithmetic` (`use-formula-engine.ts:336-424`).
- Grep for `eval(` across `use-formula-engine.ts` returns zero matches — confirmed no JS `eval`/`Function()` constructor anywhere in the formula engine. Arithmetic expressions are evaluated via an explicit tokenizer + shunting-yard + RPN stack evaluator (lines 224-424), not string `eval`.
- Malformed/unrecognized formulas resolve to Excel-style error codes (`#NAME?`, `#NOME?`, `#ERRO!`, `#DIV/0!`, `#VALUE!`, `#CIRC!`) which are rendered as plain strings via `formatCellValue`/`isErrorCode` (`table-grid-panel.tsx:873-884`), never via `dangerouslySetInnerHTML` (confirmed absent).

Verdict: Sigma introduces no new evaluation surface; it reuses the exact, already-hardened `dispatch` → `useFormulaEngine` pipeline.

### T-260617-04 — Denial of Service — Zoom CSS transform extremo
**Disposition:** accept
**Status:** CLOSED (accepted risk recorded below)

Justification claimed: presets fixos (75/100/125/150%) sem input livre — sem vetor de
valores extremos.

Evidence verified against code:
- `ZOOM_OPTIONS` is a fixed, hardcoded array `[75, 100, 125, 150]` (`table-grid-panel.tsx:387`).
- The zoom dropdown (`table-grid-panel.tsx:1411-1428`) renders `ZOOM_OPTIONS.map(...)`; the only call site for `setZoom` in the entire file is inside that `.map()` callback (line 1419), bound to `option` — confirmed via grep that `setZoom(` has exactly one call site, and it is constrained to the fixed array. There is no numeric `<input>`, slider, or URL/query-param path that can set `zoom` to an arbitrary value.
- The resulting `transform: scale(${zoom / 100})` (`table-grid-panel.tsx:1751`) is therefore always one of `0.75 | 1 | 1.25 | 1.5` — no unbounded or attacker-controlled scale factor is reachable.

This is this audit's first pass, so this entry constitutes the accepted-risk log entry for
T-260617-04 going forward.

**Accepted Risk Log Entry:**
| ID | Risk | Scope | Accepted By | Rationale |
|----|------|-------|--------------|-----------|
| T-260617-04 | CSS transform-based rendering DoS via extreme zoom values | `zoom` state + `.table-grid-zoom-wrapper` style in `table-grid-panel.tsx` | Phase plan (260617-ukf) | `setZoom` is only reachable from a closed set of 4 hardcoded preset values (75/100/125/150); no free-text/slider/URL input path exists that could set an extreme scale factor. |

## Summary Table

| Threat ID | Category | Disposition | Evidence | Status |
|-----------|----------|-------------|----------|--------|
| T-260617-01 | Tampering | mitigate | `table-grid-panel.tsx:187-196,1586-1629` — fixed `COLOR_SWATCHES`, no free-text color input | CLOSED |
| T-260617-02 | Information Disclosure | accept | `table-grid-panel.tsx:534-563` — client-side only, no new `fetch`, explicit click | CLOSED (accepted) |
| T-260617-03 | Tampering | mitigate | `table-grid-panel.tsx:431-437` + `use-formula-engine.ts` (no `eval`, shared `dispatch` pipeline) | CLOSED |
| T-260617-04 | Denial of Service | accept | `table-grid-panel.tsx:387,1411-1428` — `setZoom` only reachable from fixed preset array | CLOSED (accepted) |

## Unregistered Flags (SUMMARY.md `## Threat Flags`)

SUMMARY.md states: "Nenhuma superfície de ameaça nova além das já registradas no
`<threat_model>` do PLAN... todas com disposição mitigate/accept já endereçada na
implementação."

Independent check performed (not just accepted at face value): the implementation was
scanned for attack-surface patterns not covered by T-260617-01..04 —
- New network calls: none found beyond the pre-existing `/api/workspace/import` (out of scope of this quick task).
- `dangerouslySetInnerHTML` / raw HTML injection: none found.
- New `eval`/`Function()`/`new Function`: none found.
- Free-text inputs feeding `style` attributes: none found (only the unrelated filter-text input, which feeds a `.filter()` predicate, not styles).
- Merge/Paint-format/Group features (new in this phase, not present in the original threat register): `buildMergedRow`/`handleMergeTargetCell`, `handlePaintTargetCell`/`copiedStyle`, and `groupByKey`/`groupedRows` were inspected — all operate purely on already-trusted in-memory `cellStyles`/`rows` state via the same `dispatch`/`setCellStyles` paths already covered by T-260617-01/03; no new external input or rendering primitive is introduced.

Result: **none** — no unregistered attack surface found. The SUMMARY.md claim is corroborated by independent code inspection, not merely accepted on its word.

## Conclusion

4/4 threats CLOSED. 0 threats OPEN. `block_on: open` config — no block triggered.
