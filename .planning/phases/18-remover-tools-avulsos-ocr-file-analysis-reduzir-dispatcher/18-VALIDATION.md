---
phase: 18
slug: remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher
status: planned
nyquist_compliant: true
wave_0_complete: true
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
| **Full suite command** | `pnpm exec prisma generate && pnpm -r typecheck && pnpm -r test` |
| **Estimated runtime** | ~30-60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter web test <affected file>` (or the file-existence `find`/`grep` checks for pure-deletion tasks)
- **After every plan wave:** Run `pnpm exec prisma generate && pnpm -r typecheck && pnpm -r test`
- **Before `/gsd:verify-work`:** Full suite must be green (SC#5), grep audits in Plan 08 confirm zero residual references
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-01-T1 | 01 | 1 | CLEAN-01 | T-18-01 | rotas/páginas dos 5 geradores avulsos removidas | find/grep | `find apps/web/src/app/api/tools/{formula,sql,regex,scripts,template} apps/web/src/app/\(workspace\)/workspace/{formula,sql,regex,scripts,templates} -type f \| wc -l` | sim | ⬜ pending |
| 18-01-T2 | 01 | 1 | CLEAN-01 | T-18-02/03 | features/tests dos 5 geradores removidos; typecheck/test documentados | grep + automated | `pnpm exec prisma generate && pnpm -r typecheck && pnpm -r test` | sim | ⬜ pending |
| 18-02-T1 | 02 | 1 | CLEAN-02 | T-18-04/05 | rota/página/feature/processor OCR removidos; image-extractor preservado | find/grep | `find apps/web/src/app/api/tools/ocr apps/web/src/features/ocr apps/web/src/server/ai/ocr-processor.ts -type f \| wc -l` | sim | ⬜ pending |
| 18-02-T2 | 02 | 1 | CLEAN-02 | T-18-06 | packages/shared/src/ocr removido; typecheck documentado | automated | `pnpm exec prisma generate && pnpm -r typecheck` | sim | ⬜ pending |
| 18-03-T1 | 03 | 1 | CLEAN-03 | T-18-07/08 | rotas/página/feature/file-chat-stream File Analysis removidos | find/grep | `find apps/web/src/app/api/tools/file-analysis apps/web/src/features/file-analysis apps/web/src/server/ai/file-chat-stream.ts -type f \| wc -l` | sim | ⬜ pending |
| 18-03-T2 | 03 | 1 | CLEAN-03 | T-18-09 | file-repository/cleanup-job removidos; file-parser.ts preservado; instrumentation.ts limpo | automated | `pnpm --filter web test file-parser.test.ts && pnpm exec prisma generate` | sim | ⬜ pending |
| 18-04-T1 | 04 | 2 | CLEAN-07 | — | curto-circuito de clarificação + case unified_table removidos; table-clarifier.ts deletado | automated | `pnpm --filter web test unified-route.test.ts` | sim | ⬜ pending |
| 18-04-T2 | 04 | 2 | CLEAN-01 | — | cases formula/sql/regex/script/template + file_analysis/ocr removidos de route.ts | automated | `pnpm exec prisma generate && pnpm -r typecheck && pnpm -r test` | sim | ⬜ pending |
| 18-05-T1 | 05 | 3 | CLEAN-06 | T-18-13/15 | UNIFIED_INTENTS/OVERRIDE_INTENTS binários; fixtureClassify binário; eval 6-8 prompts plantado | tdd/automated | `pnpm --filter web test intent-classifier.test.ts` | sim | ⬜ pending |
| 18-05-T2 | 05 | 3 | CLEAN-06 | T-18-13/15 | route.ts roteia sheet_operation/qa/unknown sem fallback temporário | automated | `pnpm --filter web test unified-route.test.ts && pnpm -r typecheck` | sim | ⬜ pending |
| 18-06-T1 | 06 | 4 | CLEAN-06 | T-18-17/18 | unifiedCompletePayloadSchema reduzido a table_spec+qa_response; quota_warning/needs_file removidos | tdd/automated | `pnpm --filter web exec vitest run unified-schema.test.ts -t "qa_response\|quota_warning\|needs_file\|table_spec"` | sim | ⬜ pending |
| 18-06-T2 | 06 | 4 | CLEAN-06/07 | T-18-16 | render-dispatcher reduzido a table_spec(TableGridPanel)/qa_response/default-null; ClarificationCard/ConfirmationCard/TableIntentStub deletados; intent-pill binário | grep/automated | `pnpm exec prisma generate && pnpm -r typecheck` | sim | ⬜ pending |
| 18-07-T1 | 07 | 5 | CLEAN-06/07 | T-18-19/20 | serializeAssistant reduzido a table_spec/qa_response/default; SubmitUnifiedChatInput binário sem needsFile | tdd/automated | `pnpm exec prisma generate && pnpm --filter web exec vitest run context-messages.test.ts` | sim | ⬜ pending |
| 18-07-T2 | 07 | 5 | CLEAN-06/07 | T-18-21 | unified-chat-tool.tsx reduzido ao eixo binário sem SessionContextSelector/handlers de clarificação | automated | `pnpm exec prisma generate && pnpm -r typecheck && pnpm --filter web exec vitest run unified-chat-tool.test.tsx` | sim | ⬜ pending |
| 18-08-T1 | 08 | 6 | CLEAN-01/02/03 | T-18-22 | entitlements/quota-service/quota-types removidos; packages/shared reduzido | grep/automated | `pnpm exec prisma generate && pnpm -r typecheck` | sim | ⬜ pending |
| 18-08-T2 | 08 | 6 | CLEAN-01/02/03/06/07 | T-18-24 | unified-schema.test.ts/smoke.spec.ts reescritos; formula.spec.ts deletado; suite completa verde | automated | `pnpm exec prisma generate && pnpm -r typecheck && pnpm -r test` | sim | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Esta é uma fase de remoção — não há lacunas de teste a preencher antes da execução (nenhum "MISSING" automated). Toda verificação é:
1. `find`/`grep` confirmando ausência de arquivos/símbolos removidos (zero-reference greps).
2. `pnpm exec prisma generate && pnpm -r typecheck && pnpm -r test` em pontos de controle por wave.

"Existing infrastructure covers all phase requirements." Nenhum scaffold de teste novo é necessário antes da Wave 1 — os testes que precisam ser REESCRITOS (intent-classifier.test.ts, unified-route.test.ts, unified-schema.test.ts, context-messages.test.ts, unified-chat-tool.test.tsx, smoke.spec.ts) já existem e são editados dentro das próprias plans que tocam o código correspondente (Plans 04-08), não como pré-requisito de Wave 0.

---

## Manual-Only Verifications

"All phase behaviors have automated verification."

Nota: o eval binário completo (~20 prompts PT-BR "operação na planilha vs Q&A") mencionado no checkpoint 17->18 (STATE.md Blockers/Concerns) é UAT formal de Phase 20 — Plan 05 desta fase planta apenas 6-8 casos representativos como testes automatizados em `intent-classifier.test.ts` (não é verificação manual).

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — removal phase, existing test infra reused/edited in-plan)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner-approved 2026-06-11
