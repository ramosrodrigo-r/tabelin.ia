# SECURITY.md — Phase 14 (tabela-viva)

**Audit date:** 2026-06-09
**ASVS Level:** 1
**block_on:** high
**register_authored_at_plan_time:** true
**Verdict:** SECURED (1 WARNING — coverage gap, non-blocking)

Threats closed: 16/16. No `high`-severity mitigation is absent from implemented code.

---

## Threat Verification (mitigate)

| Threat ID | Category | Evidence |
|-----------|----------|----------|
| T-14-XSS-SCAFFOLD | Tampering | `apps/web/tests/table-grid-panel.test.tsx:67-84` — SEC-05 describe; fixture `rows: [{ valor: "<script>window.__xss = true;</script>" }]`; asserts `window.__xss` `toBeUndefined()`. |
| T-14-INPUT-SCAFFOLD | Tampering | `apps/web/tests/unified-schema.test.ts:283-294` — `it("rejeita rows com objeto aninhado ...")`, fixture `rows: [{ dados: { nested: "objeto" } }]`, asserts `success === false`. |
| T-14-INPUT | Tampering | `packages/shared/src/unified-chat/schema.ts:80` — `rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).max(200).optional()`. Nested objects rejected by Zod. |
| T-14-FORMULA | Tampering | `apps/web/src/features/unified-chat/hooks/use-formula-engine.ts:353-358,458-462` — delegation only via `formulajs[enFnName]`; unmapped name → `#NAME?` (354/459); non-function → `#NAME?` (358/462). Zero `eval`/`new Function` (grep across whole feature: NONE). |
| T-14-CIRC | Spoofing | `use-formula-engine.ts:361-363,464-466` — `cycleKey` checked against `evaluating` Set → returns `#CIRC!`; per-invocation Set in `recalcAll:417` (WR-04). Test `formula-engine.test.ts:199-206`. |
| T-14-PITFALL1 | Tampering | `use-formula-engine.ts:50-63` — `extractRange()` always builds `(string\|number)[][]` 2D. Exercised end-to-end by real-formulajs VLOOKUP test `formula-engine.test.ts:119-127`. |
| T-14-LLM-INJECT | Tampering | `apps/web/src/server/ai/table-clarifier.ts:297` (`zodResponseFormat(tableSpecPayloadSchema, "table_spec")`) + `:324` (`tableSpecPayloadSchema.parse(raw)` fallback); `apps/web/src/app/api/chat/unified/route.ts:325` (`tableSpecPayloadSchema.safeParse(raw)` on override). ZodError before grid. |
| T-14-XSS | Tampering | `apps/web/src/features/unified-chat/components/table-grid-panel.tsx:333-346` — CellRenderer returns `<span>{formatted}</span>` / `{String(displayValue)}` (React children, auto-escaped). Zero `dangerouslySetInnerHTML` in `components/` (grep: only a comment at line 344). |
| T-14-FORMULA-INJECT | Tampering | No `eval()`/`new Function()` anywhere in `apps/web/src/features/unified-chat/` or `packages/shared/src/table/` (grep: NONE). User-typed content flows through `formulajs[enFnName]` delegation only. |
| T-14-DISPATCH | Tampering | `apps/web/src/features/unified-chat/components/render-dispatcher.tsx:244-255` — `hasRows = Array.isArray(rows) && (rows?.length ?? 0) > 0`; true → `TableGridPanel`, else → `ConfirmationCard`. |
| T-14-REGRESS | Tampering | `apps/web/src/features/unified-chat/components/confirmation-card.tsx:14,17,21,25-28,34` — `editedSpec` initialized from full `payload` via `useState(payload)`; every handler uses `{ ...current, ... }`; `onConfirm(editedSpec)` forwards all fields intact. Retrocompat test `unified-schema.test.ts:236`. |

## Accepted Risks (accept)

| Threat ID | Category | Justification verified |
|-----------|----------|------------------------|
| T-14-FORMULA-LOCALE | Tampering | `packages/shared/src/table/formula-locale.ts:9-51` — `PT_BR_TO_EN` is a static `Record<string,string>` const literal; no external input read. `translateFunctionName` only does a map lookup (`:63-67`). Justification holds. |
| T-14-DOS | DoS | `apps/web/src/server/tools/conversation-repository.ts:4` `MAX_PAYLOAD_BYTES = 32 * 1024`; `guardPayloadSize:17-34`; enforced on `assistantPayload:74`. 32KB limit pre-exists and applies to table seed payload. Justification holds. |
| T-14-PROMPT | Tampering | Structured Outputs `zodResponseFormat(tableSpecPayloadSchema, "table_spec")` at `table-clarifier.ts:297` constrains output to schema; out-of-schema fields dropped. Reinforced by WR-06 anti-injection delimiters around `originalPrompt` (`table-clarifier.ts:98-152`). Justification holds. |
| T-14-PERF | DoS | `use-formula-engine.ts:489-499` — `useFormulaEngine` wraps `recalcAll` in `useMemo` keyed on `[rows, columns, separator]`; not synchronous in onChange. Justification holds (perf assumption A4, deferrable to useTransition without breaking change). |

## Transferred (transfer)

| Threat ID | Category | Transfer documentation |
|-----------|----------|------------------------|
| T-14-SC | Tampering | Human-verify checkpoint in Plan 01 (`14-01-PLAN.md` Task 1) gated npm install of `react-datasheet-grid` + `@formulajs/formulajs` until identity confirmed on npmjs.com. Closed per `14-01-SUMMARY.md` ("T-14-SC: pacotes vettados e instalados (Task 1 aprovada)"). |

---

## Unregistered Flags

None. SUMMARY `## Threat Flags` / `## Threat Surface Scan` across 14-01..14-06 declare no new attack surface; all map to registered threat IDs.

---

## WARNINGS (non-blocking)

- **W-1 — Missing test gate for T-14-FORMULA `#NAME?` path.**
  T-14-FORMULA's mitigation plan (`14-03-PLAN.md`) cites a verification test *"Função não mapeada retorna #NAME?"* (e.g. `=DESCONHECIDA()`). No such test exists in `apps/web/tests/formula-engine.test.ts` or elsewhere (grep across `apps/web/tests/` + `packages/shared/`: none).
  **Not a BLOCKER:** the security control itself — delegation restricted to `formulajs[enFnName]` with no `eval`/`new Function`, unmapped name returning `#NAME?` — IS present and verified in code (`use-formula-engine.ts:353-358,458-462`). The gap is regression-coverage of the error branch, not an absent mitigation. Disposition `mitigate` is satisfied by the code; the promised test gate is absent.
  **Recommended:** add `it("=DESCONHECIDA() retorna #NAME?")` to `formula-engine.test.ts` to lock the no-arbitrary-execution invariant against future refactors. (Implementation files are read-only for this audit; logged for the executor.)
