---
phase: 18-remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher
plan: 08
subsystem: cleanup
tags: [shared-package, billing, quota, e2e, tests, deletion-inventory]
requires:
  - phase: 18-07
    provides: unified chat client reduced to binary axis
provides:
  - packages/shared reduced to billing/schema + file-analysis/schema (FileSchema) + unified-chat/schema + table/formula-locale
  - billing/quota server modules removed (entitlements, quota-service, quota-types)
  - request-cache.ts without getCachedEntitlement
  - smoke.spec.ts covering only auth + unified chat Q&A; formula.spec.ts removed
affects: [shared-package, billing, quota, request-cache, e2e, tests]
tech-stack:
  added: []
  patterns:
    - Shared barrel reduced to surviving schemas only
key-files:
  created: []
  modified:
    - packages/shared/src/index.ts
    - packages/shared/src/file-analysis/schema.ts
    - apps/web/src/server/request-cache.ts
    - apps/web/tests/e2e/smoke.spec.ts
  deleted:
    - apps/web/src/server/billing/entitlements.ts
    - apps/web/src/server/usage/quota-service.ts
    - apps/web/src/server/usage/quota-types.ts
    - apps/web/tests/quota-service.test.ts
    - apps/web/tests/e2e/formula.spec.ts
    - packages/shared/src/formula/{schema,fixtures,platforms}.ts
    - packages/shared/src/sql/{schema,fixtures}.ts
    - packages/shared/src/regex/{schema,fixtures}.ts
    - packages/shared/src/scripts/{schema,fixtures}.ts
    - packages/shared/src/template/{schema,fixtures}.ts
    - packages/shared/src/file-analysis/fixtures.ts
key-decisions:
  - "file-analysis/schema.ts PRESERVADO (reduzido): FileSchema/fileSchemaSchema/fileSchemaColumnSchema continuam consumidos pela extração genérica de planilha (csv-xlsx-extractor.ts, file-parser.ts) que aterra anexos no chat unificado — consumidor inesperado vs a Assumption A4 do RESEARCH. Os schemas upload/chat/chart do tool File Analysis removido foram excluídos junto com fixtures.ts. index.ts mantém o export ./file-analysis/schema. Desvio documentado vs o plano (que previa deletar o diretório inteiro)."
  - "billing/schema.ts PRESERVADO em packages/shared (FREE_QUOTAS/UserEntitlement/etc) — candidato a reuso futuro do AbacatePay, fora do escopo de deleção; apenas os consumidores em apps/web/src/server/{billing,usage}/ saíram."
  - "unified-schema.test.ts NÃO modificado: já fora reescrito para o eixo binário no Plan 06 (sem require-block morto, sem fileAnalysis/ocr/tableStub schemas) — satisfaz os AC da Task 2 sem retrabalho."
  - "smoke.spec.ts: removidos os describes de formula/multi-tools/OCR/chart (rotas/tools deletados). Os describes 'file upload + chat' e 'privacy cleanup' navegavam para /workspace/file-analysis (removido) e eram estruturais ao tool File Analysis — DELETADOS. Adicionado 'smoke: chat unificado' (Q&A) mockando /api/chat/unified NDJSON -> qa_response. Cobertura E2E completa do chat unificado (anexo CSV, privacidade) fica para a Phase 20 (CHAT-*)."
requirements-completed: [CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-06, CLEAN-07]
requirements-progress: []
duration: ~25 min
completed: 2026-06-14
---

# Phase 18 Plan 08: Fechamento do Inventário de Deleção (Summary)

**O Bloco 8 final da Phase 18: `packages/shared` reduzido aos schemas sobreviventes, módulos de billing/quota órfãos removidos, e a suite de testes E2E/schema alinhada ao que sobrevive (auth + chat unificado planilha/Q&A).**

## Desempenho

- **Duração:** ~25 min
- **Concluído em:** 2026-06-14
- **Arquivos:** 4 modificados + 17 deletados
- **Líquido:** +20 / −1302 linhas

## Conquistas

- **`packages/shared` enxuto:** deletados `formula/{schema,fixtures,platforms}`, `sql/`, `regex/`, `scripts/`, `template/` (schema+fixtures) e `file-analysis/fixtures`. `index.ts` reduzido a 4 exports: `billing/schema`, `file-analysis/schema`, `unified-chat/schema`, `table/formula-locale`.
- **`FileSchema` preservado:** `file-analysis/schema.ts` reduzido ao `fileSchemaSchema`/`fileSchemaColumnSchema`/`FileSchema` — ainda usado pela extração CSV/XLSX que aterra anexos no chat. (Consumidor inesperado capturado no typecheck: `csv-xlsx-extractor.ts`/`file-parser.ts` importam `FileSchema`.)
- **Billing/quota órfãos removidos:** `entitlements.ts`, `quota-service.ts`, `quota-types.ts` deletados (zero consumidores após Plans 01-03); `getCachedEntitlement` removido de `request-cache.ts` (preservado `getCachedUser`, usado por `workspace/layout.tsx`). `billing/schema.ts` mantido em `packages/shared` para reuso futuro do AbacatePay.
- **Testes finais:** `quota-service.test.ts` e `e2e/formula.spec.ts` deletados; `smoke.spec.ts` reduzido a auth + novo smoke de chat unificado Q&A; `unified-schema.test.ts` já estava no eixo binário (Plan 06).

## Decisões Tomadas

- **Desvio do plano em file-analysis (justificado):** o plano previa deletar o diretório `file-analysis/` inteiro assumindo zero consumidores; o typecheck revelou que `FileSchema` sobrevive na extração de anexos. Restaurado o arquivo reduzido em vez de deletar — exatamente o tratamento previsto no plano para "consumidor inesperado".
- **Smoke de file-upload/privacy removidos, não reescritos:** eram estruturais ao `/workspace/file-analysis` removido; a cobertura E2E equivalente para o chat unificado (anexo + privacidade) pertence à Phase 20.

## Issues Encontrados

- O grep global de aceitação acusou 5 "matches" para símbolos removidos, mas TODOS em `apps/web/.next/` (artefatos de build obsoletos). O grep restrito à fonte (`--include=*.ts/*.tsx` em `apps/web/src`, `apps/web/tests`, `packages/shared/src`) confirmou **zero** referências residuais (SC#5).

## Verificação

- `pnpm exec prisma generate` -> OK
- `pnpm -r typecheck` -> OK (shared + web)
- `pnpm -r test` -> OK, 20 files, 237 passed, 1 skipped (NDJSON flaky conhecido)
- Greps de aceitação Task 1 + Task 2 -> todos OK
- Grep global de símbolos removidos (fonte) -> 0
