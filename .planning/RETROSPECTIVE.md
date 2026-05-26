# Retrospective: Tabelin.IA

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-05-26
**Phases:** 5 | **Plans:** 16

---

### What Was Built

1. Authenticated Next.js workspace with Brazilian formula generation (Portuguese + semicolons, 4 platforms).
2. Freemium billing: Mercado Pago Checkout Pro (Pix + card), webhook-driven entitlements, reserve/confirm/release quota.
3. Multi-tool suite: VBA/Apps Script/Airtable Scripts, SQL (5 dialects), regex (with Brazilian examples), Pro templates, destructive guardrails.
4. CSV/XLSX file analysis: upload, schema detection, AI chat, pivot summaries, executive reports, privacy cleanup cron.
5. OCR: PNG/JPEG → reconstructed table → TSV/CSV copy-ready (OpenAI Vision + fixture fallback).
6. Charts: "Sugerir Gráfico" → BarChart/LineChart/PieChart via recharts with local type toggle.
7. Playwright E2E smoke suite: 9/9 tests passing, mocking AI/billing via page.route(), real auth/DB.

---

### What Worked

- **Vertical MVP phase structure:** Each phase delivered a demeable, usable product slice. No orphaned features waiting on downstream work.
- **Fixture fallbacks from day one:** Designing fixture responses early (OCR_FIXTURE_RESPONSE, chartDataFixture) removed API cost and latency from development iterations.
- **Zod schema-first contracts in @tabelin/shared:** Having a single source of truth for tool contracts prevented mismatches between server and client and made validation consistent.
- **Reserve/confirm/release quota pattern:** Using optimistic reservation + transactional confirmation with serializable isolation prevented quota bypasses and worked cleanly with the streaming architecture.
- **page.route() mocking in Playwright:** Decoupling AI/billing calls from smoke tests eliminated flakiness while keeping real auth/quota paths exercised.
- **Gap closure as a named phase plan (05-04):** When UAT revealed fixture wiring gaps, treating it as a named plan (rather than an informal fix) kept audit trail complete and UAT workflow intact.

---

### What Was Inefficient

- **SUMMARY.md one-liner coverage was inconsistent:** Early phases (01, 02, 04) didn't include `One-liner:` fields in frontmatter — made retrospective extraction harder. Later phases (03, 05) added this properly.
- **OCR fixture not connected during 05-01 execution:** The fixture was defined in shared but not wired in the processor, requiring a separate gap-closure plan (05-04). Could have been prevented with a post-plan checklist item for "verify fixture fallback path is reachable in code."
- **CHART_PROMPT detection gap:** Chart fixture was also not wired into the stream handler during 05-02. Same root cause as OCR — fixture defined but path not exercised until UAT.
- **No CI pipeline for smoke tests:** Tests were always run locally. This is deferred to v2 but created a manual step at each phase completion.
- **QUOT-02 and QUOT-03 modeled but not UI-enforced:** These were accepted as partial implementations for v1, but surfaced during requirements review — worth being explicit about modeling-vs-enforcement distinction from the start.

---

### Patterns Established

- **@tabelin/shared for cross-boundary contracts:** Server and client share Zod schemas and fixture constants from a dedicated shared package. New tools follow the same pattern.
- **Feature folders under src/features/**: Each tool has its own folder with hook, input panel, output panel, tool composition, and tests.
- **Auth+quota+AI+stream pipeline:** Server route handlers always follow auth check → quota reserve → AI call → quota confirm → stream back. Quota release on error.
- **Fixture fallback guard:** When OPENAI_API_KEY is absent, processors return fixture early before any client initialization — keeps dev/test fully offline-capable.
- **Gap closure as 05-XX plan:** When UAT finds wiring gaps, they become named plans in the phase (not informal hot-fixes), ensuring full traceability.

---

### Key Lessons

1. **Wire fixture paths during the same plan that creates them.** Don't define a fixture in shared and assume it's connected — verify the early-return path exists in the processor before marking the plan complete.
2. **Include `One-liner:` in SUMMARY.md frontmatter from phase 01.** This makes milestone retrospective extraction automatic.
3. **Partial implementation (modeled vs enforced) should be explicit in requirements.** QUOT-02/QUOT-03 were modeled but enforcement was deferred — this should be noted in the requirement itself at definition time.
4. **page.route() is the right Playwright mock strategy for AI+billing.** It's stable, readable, and keeps real auth/DB paths exercised. Don't try to mock at the server layer for E2E smoke tests.
5. **Vertical MVP phases delivered real value at each step.** After Phase 1, the formula workspace was usable. After Phase 2, it was billable. This structure should be preserved for v2.

---

### Cost Observations

- Model mix: primarily Sonnet 4.6 (balanced profile)
- Sessions: 4 days, 172 commits
- Notable: Full MVP from zero to 9/9 smoke tests in 4 days — vertical slice structure enabled fast, parallel execution

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Days to ship | 4 |
| Phases | 5 |
| Plans | 16 |
| Requirements | 46/46 |
| Smoke tests | 9/9 pass |
| LOC TypeScript | ~10.500 |
| Gap closures | 1 (05-04) |
