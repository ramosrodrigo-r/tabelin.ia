---
phase: 05-ocr-charts-and-launch-hardening
plan: "04"
mode: gap_closure
subsystem: ocr/charts/fixture
tags: [ocr, charts, fixture, dev-mode, gap-closure]
dependency_graph:
  requires:
    - 05-01 (OCR_FIXTURE_RESPONSE em packages/shared/src/ocr/fixtures.ts)
    - 05-02 (chartDataFixture em packages/shared/src/ocr/fixtures.ts)
  provides:
    - OCR funcional em modo dev (sem OPENAI_API_KEY) via fixture
    - ChartMessage renderizado em modo dev via fixture de chart
  affects:
    - apps/web/src/server/ai/ocr-processor.ts
    - apps/web/src/server/ai/file-chat-stream.ts
tech_stack:
  added: []
  patterns:
    - "Early return com fixture antes de createOpenAIClient() — sem try/catch adicional"
    - "Detecção de intent por substring única do prompt ('chartType') em vez de enum"
key_files:
  created: []
  modified:
    - apps/web/src/server/ai/ocr-processor.ts
    - apps/web/src/server/ai/file-chat-stream.ts
decisions:
  - "Detecção de chart request por 'chartType' substring — substring única e controlada internamente no CHART_PROMPT"
  - "Early return no topo de processImageOcr — sem impacto no fluxo real com API key"
  - "userMessage passado como segundo parâmetro de createFixtureStream — mínima mudança de assinatura"
metrics:
  duration: "~5 min"
  completed_date: "2026-05-26"
  tasks: 2
  files: 2
---

# Phase 05 Plan 04: Gap Closure — OCR Fixture + Chart Fixture Summary

Dois fixes cirúrgicos que conectam fixtures já existentes aos pontos de falha detectados no UAT.

## What Was Built

**Gap 1 — OCR fixture fallback (`ocr-processor.ts`):**

`OCR_FIXTURE_RESPONSE` de `@tabelin/shared` importado e retornado quando `OPENAI_API_KEY` está ausente. Early return antes de `createOpenAIClient()` evita a exceção que gerava 502. Com API key, comportamento inalterado.

**Gap 2 — Chart fixture em `file-chat-stream.ts`:**

`createFixtureStream` recebe `userMessage` como segundo parâmetro. Quando `userMessage.includes("chartType")` (substring única do `CHART_PROMPT`), o content do evento `complete` é `JSON.stringify(chartDataFixture)` em vez do texto descritivo. `useFileChat` faz `JSON.parse` no `complete` event, `chartDataSchema.safeParse` valida, e o `ChartMessage` é renderizado normalmente.

## Tasks Completed

| Task | Descrição | Commit | Arquivos |
|------|-----------|--------|---------|
| 1 | OCR fixture fallback | 3b67dcc | apps/web/src/server/ai/ocr-processor.ts |
| 2 | Chart fixture em createFixtureStream | 138424b | apps/web/src/server/ai/file-chat-stream.ts |

## Deviations from Plan

Nenhum desvio. Execução idêntica ao planeado.

## Threat Model Compliance

| ID | Mitigação | Status |
|----|-----------|--------|
| T-05-04-01 | Fixtures contêm apenas dados sintéticos hardcoded | Implementado |
| T-05-04-02 | Detecção por substring única `"chartType"` — controlada internamente | Implementado |

## Known Stubs

Nenhum stub. As respostas fixture são dados sintéticos determinísticos intencionais para modo dev.

## Self-Check: PASSED

- `OCR_FIXTURE_RESPONSE` importado em `ocr-processor.ts`: CONFIRMED
- Early return antes de `createOpenAIClient()` quando sem API key: CONFIRMED
- `chartDataFixture` importado em `file-chat-stream.ts`: CONFIRMED
- `createFixtureStream` recebe `userMessage` e detecta `"chartType"`: CONFIRMED
- `npx tsc --project apps/web/tsconfig.json --noEmit`: 0 erros
- Commits: 3b67dcc, 138424b
