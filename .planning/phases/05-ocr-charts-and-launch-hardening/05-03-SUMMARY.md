---
phase: 05-ocr-charts-and-launch-hardening
plan: "03"
subsystem: testing/e2e
tags: [playwright, smoke-tests, e2e, ocr, charts, auth, quota, billing, file-analysis]
dependency_graph:
  requires:
    - 05-01 (OCR backend + frontend: /workspace/ocr, POST /api/tools/ocr/process)
    - 05-02 (Charts: ChartMessage, useFileChat, botão Sugerir Gráfico)
  provides:
    - Suite de smoke tests E2E cobrindo todos os happy paths do MVP
    - Fixture PNG mínima para testes de OCR via setInputFiles
    - Fixture CSV mínima para testes de file-analysis
  affects: []
tech_stack:
  added: []
  patterns:
    - "page.route() para mock de AI (NDJSON) e billing (JSON) — banco Postgres é real"
    - "path.join(__dirname, '../fixtures/...') para referência de fixtures nos testes"
    - "context.grantPermissions(['clipboard-read','clipboard-write']) para verificar clipboard"
    - "Date.now() em cada suite para emails únicos e isolamento entre runs"
key_files:
  created:
    - apps/web/tests/e2e/smoke.spec.ts
    - apps/web/tests/fixtures/tabela-teste.png
    - apps/web/tests/fixtures/dados.csv
  modified: []
decisions:
  - "dados.csv criado como fixture de arquivo em vez de inline Blob — mais simples e reutilizável entre suites"
  - "smoke: privacy cleanup usa route intercept para capturar fileId; fallback verifica que dados não aparecem após logout"
  - "Task 2 (checkpoint:human-verify) auto-aprovado com AUTO_CFG=true — servidor precisa estar rodando localmente para execução real dos testes"
metrics:
  duration: "~2 min"
  completed_date: "2026-05-26"
  tasks: 1
  files: 3
---

# Phase 05 Plan 03: Launch Hardening — Smoke Tests E2E Summary

Suite completa de smoke tests Playwright cobrindo auth, formula, quota, checkout Pix, scripts/SQL/regex, file upload + chat, OCR, charts e privacy cleanup — todos os happy paths do MVP em 9 suites.

## What Was Built

**smoke.spec.ts** com 9 suites de teste E2E usando Playwright, cada uma com um email único via `Date.now()` para isolamento. AI e billing são mockados via `page.route()`; auth e quota usam o banco Postgres local real (D-10/D-11).

### Suites implementadas

| Suite | Descrição | Mock |
|-------|-----------|------|
| smoke: auth flow | sign-up → workspace → sign-out → sign-in | Nenhum (banco real) |
| smoke: formula generation | prompt → streaming → copy | /api/tools/formula/generate (NDJSON) |
| smoke: quota block após 4 uses | 4 uses → 5o bloqueado com banner | /api/tools/formula/generate com contador |
| smoke: checkout Pix | botão upgrade → URL de checkout mockada | /api/billing/checkout (JSON) |
| smoke: multi-tools scripts/SQL/regex | 3 ferramentas: prompt → output | /api/tools/scripts, /api/tools/sql, /api/tools/regex |
| smoke: file upload + chat | CSV → SchemaPreview → chat pivot | /api/tools/file-analysis/chat (NDJSON) |
| smoke: OCR imagem → tabela copiável | PNG fixture → tabela → Copiar TSV | /api/tools/ocr/process (JSON) |
| smoke: chart sugestão e alternância | CSV → Sugerir Gráfico → ChartMessage → Linhas | /api/tools/file-analysis/chat (chart NDJSON) |
| smoke: privacy cleanup | upload → logout → arquivo inacessível | /api/tools/file-analysis/upload interceptado |

**Fixtures criadas:**
- `tests/fixtures/tabela-teste.png`: PNG 1x1 RGBA válido (70 bytes) gerado via base64 — usado no `setInputFiles` do teste OCR
- `tests/fixtures/dados.csv`: CSV mínimo com `Nome,Valor,Alice,100,Bob,200` — usado nos testes de file-analysis e chart

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Criar fixture PNG e smoke.spec.ts com todos os happy paths | 0edc433 | apps/web/tests/e2e/smoke.spec.ts, apps/web/tests/fixtures/tabela-teste.png, apps/web/tests/fixtures/dados.csv |
| 2 | Executar smoke tests (checkpoint:human-verify) | auto-aprovado (AUTO_CFG=true) | — |

## Deviations from Plan

### Auto-additions

**1. [Rule 2 - Missing Fixture] dados.csv criado como arquivo fixture**
- **Found during:** Task 1
- **Issue:** O plano descrevia CSV inline como Blob no teste, mas usar um arquivo fixture em disco é mais simples, reutilizável entre suites e mais próximo dos padrões existentes (tabela-teste.png)
- **Fix:** `tests/fixtures/dados.csv` criado com conteúdo CSV mínimo (`Nome,Valor\nAlice,100\nBob,200\n`)
- **Files modified:** apps/web/tests/fixtures/dados.csv
- **Commit:** 0edc433

**2. Auto-aprovação de checkpoint:human-verify (Task 2)**
- `AUTO_CFG=true` — checkpoint human-verify auto-aprovado conforme protocolo
- Para executar os testes realmente: `cd apps/web && npx playwright test tests/e2e/smoke.spec.ts --reporter=list` com servidor dev rodando

## Threat Model Compliance

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-05-03-01 | Emails sintéticos `test-${Date.now()}@tabelin-smoke.test` sem PII | Implementado |
| T-05-03-02 | Rotas /api/auth/* NÃO mockadas — auth testado contra banco real | Implementado |
| T-05-03-03 | Emails únicos por Date.now() — sem conflito entre runs | Implementado |
| T-05-03-04 | smoke.spec.ts não acessa rotas administrativas | Implementado |
| T-05-03-SC | Execução local — sem impacto em CI (deferred v2) | Aceito |

## Known Stubs

Nenhum stub. Os testes verificam comportamento real (banco) e mockado (AI/billing) conforme design do plano.

## Threat Flags

Nenhum novo surface de segurança introduzido — arquivo de testes apenas, sem rotas de produção novas.

## Self-Check: PASSED

Arquivos criados:
- apps/web/tests/e2e/smoke.spec.ts: FOUND
- apps/web/tests/fixtures/tabela-teste.png: FOUND (PNG image data, 1x1)
- apps/web/tests/fixtures/dados.csv: FOUND

Commits:
- 0edc433: feat(05-03): criar smoke.spec.ts com 9 suites E2E e fixtures PNG/CSV

TypeScript: 0 erros (npx tsc --project apps/web/tsconfig.json --noEmit)
