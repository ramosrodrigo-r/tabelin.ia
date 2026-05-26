---
phase: 05-ocr-charts-and-launch-hardening
plan: "01"
subsystem: ocr
tags: [ocr, vision, openai, zod, shared-package, route-handler, upload, sidebar]
dependency_graph:
  requires: []
  provides:
    - "@tabelin/shared: ocrRequestSchema, ocrResponseSchema, chartDataSchema, OcrRequest, OcrResponse, ChartData, OCR_FIXTURE_RESPONSE"
    - "POST /api/tools/ocr/process — auth + quota + OpenAI Vision"
    - "/workspace/ocr — RSC page com OcrTool"
  affects:
    - "apps/web/src/components/app/sidebar.tsx — OCR slot ativado"
    - "apps/web/src/features/file-analysis/components/copy-button.tsx — prop label opcional adicionada"
tech_stack:
  added: []
  patterns:
    - "OpenAI Vision API com base64 inline e response_format: json_object"
    - "Fixture fallback quando OPENAI_API_KEY ausente"
    - "Quota reserve/confirm/release pattern (identico ao file-analysis)"
key_files:
  created:
    - packages/shared/src/ocr/schema.ts
    - packages/shared/src/ocr/fixtures.ts
    - apps/web/src/server/ai/ocr-processor.ts
    - apps/web/src/app/api/tools/ocr/process/route.ts
    - apps/web/src/features/ocr/hooks/use-image-upload.ts
    - apps/web/src/features/ocr/components/image-upload-panel.tsx
    - apps/web/src/features/ocr/components/ocr-result-panel.tsx
    - apps/web/src/features/ocr/ocr-tool.tsx
    - apps/web/src/app/(workspace)/workspace/ocr/page.tsx
  modified:
    - packages/shared/src/index.ts
    - apps/web/src/components/app/sidebar.tsx
    - apps/web/src/features/file-analysis/components/copy-button.tsx
decisions:
  - "chartDataSchema colocado em ocr/schema.ts (nao em file-analysis/schema.ts) — contrato para Plano 05-02"
  - "CopyButton extendido com prop label opcional em vez de criar componente duplicado"
  - "getOpenAIModel() usado sem override — comentario documenta requisito de suporte vision (D-02)"
metrics:
  duration: "~20 min"
  completed_date: "2026-05-26"
  tasks: 3
  files: 12
---

# Phase 05 Plan 01: OCR End-to-End Summary

OCR vertical completo — schemas Zod compartilhados, backend OpenAI Vision com quota, e feature frontend com upload, tabela reconstruida e copia TSV/CSV.

## What Was Built

Implementação end-to-end do recurso OCR: o usuário acessa `/workspace/ocr` via sidebar ativada, faz upload de PNG/JPEG, o sistema converte para base64, envia ao gpt-4o-mini via OpenAI Vision com `response_format: json_object`, e exibe a tabela reconstruída com botões "Copiar TSV" e "Copiar CSV".

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Schemas Zod compartilhados para OCR | d765ec1 | packages/shared/src/ocr/schema.ts, fixtures.ts, index.ts |
| 2 | Backend OCR — ocr-processor.ts e route handler | a275b43 | apps/web/src/server/ai/ocr-processor.ts, apps/web/src/app/api/tools/ocr/process/route.ts |
| 3 | Feature OCR frontend + sidebar + page RSC | 72d6b8a | 7 arquivos (hook, 2 componentes, tool, page, sidebar, copy-button) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Functionality] Adicionada prop `label` ao CopyButton**
- **Found during:** Task 3
- **Issue:** O plano requeria botões "Copiar TSV" e "Copiar CSV" com rótulos distintos, mas o CopyButton existente só exibia "Copiar" como rótulo fixo. Sem extensão, os dois botões seriam indistinguíveis.
- **Fix:** Adicionada prop opcional `label?: string` ao CopyButton. Quando ausente, mantém comportamento original "Copiar". Quando fornecida, usa o label customizado e também atualiza `aria-label` e `title` para acessibilidade.
- **Files modified:** apps/web/src/features/file-analysis/components/copy-button.tsx
- **Commit:** 72d6b8a

## Threat Model Compliance

Todas as mitigações do `<threat_model>` foram implementadas:

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-05-01-01 | ocrRequestSchema.safeParse valida mimeType z.enum + imageBase64 min(1) → 400 | Implementado |
| T-05-01-02 | Validação server-side imageBase64.length * 0.75 > 5MB → 413; quota reserve | Implementado |
| T-05-01-03 | OCR_SYSTEM_PROMPT instrui modelo que conteúdo da imagem são dados do usuário | Implementado |
| T-05-01-04 | Sem persistência OCR — sem IDOR risk | Aceito |
| T-05-01-05 | getSessionFromCookieHeader → 401 antes de qualquer processamento | Implementado |
| T-05-01-06 | JSON.parse em try/catch; campos ausentes fallam para arrays vazios | Implementado |

## Known Stubs

Nenhum stub. Todos os campos estão conectados a fontes reais de dados. O fixture `OCR_FIXTURE_RESPONSE` retornado quando `OPENAI_API_KEY` ausente é um comportamento intencional de desenvolvimento (não um stub de UI).

## Self-Check: PASSED

Arquivos criados:
- packages/shared/src/ocr/schema.ts: FOUND
- packages/shared/src/ocr/fixtures.ts: FOUND
- apps/web/src/server/ai/ocr-processor.ts: FOUND
- apps/web/src/app/api/tools/ocr/process/route.ts: FOUND
- apps/web/src/features/ocr/hooks/use-image-upload.ts: FOUND
- apps/web/src/features/ocr/components/image-upload-panel.tsx: FOUND
- apps/web/src/features/ocr/components/ocr-result-panel.tsx: FOUND
- apps/web/src/features/ocr/ocr-tool.tsx: FOUND
- apps/web/src/app/(workspace)/workspace/ocr/page.tsx: FOUND

Commits:
- d765ec1: feat(05-01): add OCR and ChartData Zod schemas to shared package
- a275b43: feat(05-01): implement OCR backend — ocr-processor and POST /api/tools/ocr/process
- 72d6b8a: feat(05-01): OCR frontend — hook, components, RSC page, sidebar activated

TypeScript: 0 erros em packages/shared e apps/web
