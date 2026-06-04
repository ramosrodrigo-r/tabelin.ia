---
phase: 10-persistence-llm-context
plan: "04"
subsystem: tests
tags: [attachment, integration-tests, pro-gate, extraction, context-propagation, truncation]
dependency_graph:
  requires:
    - 10-01  # buildToolContextMessages com attachmentContext, MAX_EXTRACTED_CHARS
    - 10-02  # formula route canonical analog
    - 10-03  # sql/regex/scripts/template routes com pipeline completo
  provides:
    - Suite de integração cobrindo CTX-01, CTX-02, CTX-03, CTX-04, PRO-02, PRO-03
  affects:
    - apps/web/tests/attachment-context.test.ts
tech_stack:
  added: []
  patterns:
    - FormData mock via Object.assign sobrescreve formData() — contorna bug jsdom multipart-boundary
    - authedFormDataRequest com content-type explícito e formData() pré-populada
    - vi.hoisted + vi.mock para dispatcherMocks (extractContent) além dos mocks existentes
    - Extração do bloco injetado via split() nos delimitadores conhecidos (CTX-04 verificação)
key_files:
  created:
    - apps/web/tests/attachment-context.test.ts
  modified: []
decisions:
  - "FormData mock por Object.assign: jsdom não consegue parsear boundary multipart em Request.formData() — mock retorna FormData pré-populada diretamente"
  - "CTX-04 verifica comprimento do conteúdo injetado entre delimitadores conhecidos em vez de contagem de caracteres no system prompt completo (texto estático contém o mesmo char)"
  - "formula-ui.test.tsx falha pré-existente confirmada como out-of-scope — não tocada"
metrics:
  duration_minutes: 25
  completed_date: "2026-06-04"
  tasks_completed: 1
  files_modified: 1
---

# Phase 10 Plan 04: Suite de Integração attachment-context — Summary

**One-liner:** Suite de integração cobrindo pipeline completo de attachment (CTX-01/02/03/04, PRO-02, PRO-03) para os 5 tools com mock de FormData compatível com jsdom.

## Tasks Completed

| # | Nome | Commit | Arquivos |
|---|------|--------|---------|
| 1 | Criar apps/web/tests/attachment-context.test.ts | 199807d | apps/web/tests/attachment-context.test.ts |

## What Was Built

### Suite de testes: attachment-context.test.ts

23 testes distribuídos em 5 suites:

**Suite 1 — PRO-02: Pro-gate (5 testes)**
- sql, formula, regex, scripts: POST multipart com usuário free → 403 `{code:"pro_required", feature:"attachment"}` + `reserveToolUse` não chamado
- template: POST JSON sem arquivo com usuário free → 403 (gate incondicional preservado)

**Suite 2 — CTX-01/CTX-02: Extração e persistência (3 testes)**
- sql com arquivo: `extractContent` chamado
- sql com arquivo: `saveConversationExchange` chamado com `attachmentContext: "conteúdo extraído do documento"`
- sql sem arquivo: `extractContent` não chamado; `saveConversationExchange` com `attachmentContext: undefined`

**Suite 3 — CTX-03: Follow-up (3 testes)**
- sql sem arquivo com histórico contendo `attachmentContext`: retorna 200 (sem regressão)
- saveConversationExchange do turno sem arquivo salva `attachmentContext: undefined`
- `buildToolContextMessages` direto: exchange com `attachmentContext` injeta no system prompt

**Suite 4 — CTX-04: Truncagem (4 testes)**
- `MAX_EXTRACTED_CHARS` exportado e igual a 8000
- 10.000 chars → conteúdo injetado limitado a `MAX_EXTRACTED_CHARS` exatos
- Exatamente `MAX_EXTRACTED_CHARS` chars → sem truncagem
- Conteúdo curto → preservado integralmente
- Sem attachmentContext → system prompt sem delimitadores extras

**Suite 5 — PRO-03: Falha de extração (6 testes)**
- sql, formula, regex, scripts, template: extração com `SCANNED_PDF` → 422
- `releaseToolUse` chamado com `"res_test"` em todos os routes
- `confirmToolUse` não chamado em nenhum dos routes

### Solução para jsdom + FormData

O ambiente `jsdom` do Vitest não consegue parsear o boundary `multipart/form-data` em `Request.formData()` — a Promise fica pendurada indefinidamente (5 s timeout). Solução: criar `Request` com `content-type: multipart/form-data; boundary=----testboundary` explícito e sobrescrever `formData()` via `Object.assign(request, { formData: () => Promise.resolve(formData) })`. O route handler verifica apenas `content-type.includes("multipart/form-data")` e chama `formData()`, então o override é transparente.

## Verification Results

```
pnpm --filter web test -- tests/attachment-context.test.ts --reporter=verbose
  attachment-context.test.ts: 23 passed, 0 failed
  formula-ui.test.tsx: 1 failed (pré-existente, out-of-scope)

Test Files: 1 failed | 16 passed (17)
      Tests: 1 failed | 166 passed (167)

pnpm --filter web typecheck → exit 0 (clean)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Contagem de "A"s no CTX-04 incluía texto estático**
- **Found during:** Tarefa 1 (primeira execução dos testes)
- **Issue:** O helper `injectAttachmentIntoSystemPrompt` adiciona texto estático "CONTEÚDO DO DOCUMENTO ANEXADO" que contém caracteres "A" maiúsculos. Contar todos os "A" no system prompt dava 8002 para 10.000 chars de "A".repeat(10000) truncados a 8000.
- **Fix:** Mudança de contagem por regex para extração do conteúdo injetado via `split()` nos delimitadores conhecidos — mede `injectedContent.length` diretamente.
- **Files modified:** apps/web/tests/attachment-context.test.ts

**2. [Rule 3 - Blocking] FormData.formData() pendurado em jsdom**
- **Found during:** Tarefa 1 (primeira execução — 15 testes com timeout de 5 s cada)
- **Issue:** `Request` criado com `FormData` como body não consegue ser parsado via `.formData()` no ambiente jsdom do Vitest — a Promise nunca resolve.
- **Fix:** Helper `authedFormDataRequest` sobrescreve `formData()` via `Object.assign` para retornar a `FormData` pré-populada diretamente. Content-type multipart explícito garante que `contentType.includes("multipart/form-data")` é true.
- **Files modified:** apps/web/tests/attachment-context.test.ts

## Known Stubs

Nenhum. Arquivo de testes — sem stubs de dados.

## Threat Flags

Nenhum. Arquivo de testes apenas — sem novas superfícies de ataque.

## Self-Check: PASSED

- [x] `apps/web/tests/attachment-context.test.ts` existe no filesystem
- [x] Commit 199807d existe no git log
- [x] `pnpm --filter web test -- tests/attachment-context.test.ts` → 23/23 passed, 0 failed
- [x] `pnpm --filter web typecheck` → exit 0
- [x] Única falha na suite completa é a pré-existente `formula-ui.test.tsx`
