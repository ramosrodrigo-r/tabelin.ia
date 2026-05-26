---
phase: "04"
plan: "02"
subsystem: file-analysis
tags: [upload, chat, streaming, NDJSON, IDOR, privacy, AI, components, RSC]

requires:
  - "04-01"

provides:
  - POST /api/tools/file-analysis/upload — parse + persist schema
  - POST /api/tools/file-analysis/chat — multi-turn streaming NDJSON
  - GET /workspace/file-analysis — RSC page autenticada
  - FileAnalysisTool UI completo com upload, sheet selector, schema preview, chat

affects:
  - apps/web/src/components/app/sidebar.tsx — File Analysis link ativado
  - apps/web/src/styles/globals.css — novas classes .file-analysis-layout

tech-stack:
  added: []
  patterns:
    - NDJSON streaming ReadableStream (OpenAI real + fixture fallback)
    - IDOR guard (findUploadedFileByIdAndUser com userId do usuario autenticado)
    - server-only + anti-injection delimitadores no system prompt
    - hook NDJSON loop com buffer splitting (padrao use-scripts-stream.ts)
    - RSC page com getCurrentUser + redirect + getUserEntitlement

key-files:
  created:
    - apps/web/src/app/api/tools/file-analysis/upload/route.ts
    - apps/web/src/app/api/tools/file-analysis/chat/route.ts
    - apps/web/src/server/ai/file-chat-stream.ts
    - apps/web/src/features/file-analysis/hooks/use-file-upload.ts
    - apps/web/src/features/file-analysis/hooks/use-file-chat.ts
    - apps/web/src/features/file-analysis/components/file-upload-panel.tsx
    - apps/web/src/features/file-analysis/components/sheet-selector.tsx
    - apps/web/src/features/file-analysis/components/schema-preview.tsx
    - apps/web/src/features/file-analysis/components/chat-panel.tsx
    - apps/web/src/features/file-analysis/components/chat-message.tsx
    - apps/web/src/features/file-analysis/components/copy-button.tsx
    - apps/web/src/features/file-analysis/file-analysis-tool.tsx
    - apps/web/src/app/(workspace)/workspace/file-analysis/page.tsx
  modified:
    - apps/web/src/components/app/sidebar.tsx
    - apps/web/src/styles/globals.css

key-decisions:
  - upload/route.ts sem reserveToolUse — quota so aplicada no chat (D-04: parse local, sem custo AI no upload)
  - appendChatMessages chamado fire-and-forget para nao atrasar stream response; erros absorvidos pela camada repository
  - file-chat-stream.ts usa fixture deterministica quando OPENAI_API_KEY ausente (padrao existente do codebase)
  - FileUploadPanel recebe props onUpload/uploading/error em vez de usar hook internamente — hook fica no orquestrador file-analysis-tool.tsx para centralizar estado
  - CSS classes adicionadas a globals.css seguindo padrao existente (sem Tailwind utility classes)

requirements-completed:
  - FILE-01
  - FILE-02
  - FILE-03
  - FILE-04
  - FILE-05
  - PRIV-02
  - PRIV-04

metrics:
  duration: "6 min"
  completed: "2026-05-26"
  tasks: 2
  files: 15
---

# Phase 4 Plan 2: File Analysis — Slice Vertical Completo Summary

Entrega o fluxo end-to-end de analise de arquivo via streaming NDJSON com IDOR guard, anti-injection no system prompt e fixture fallback para ausencia de OPENAI_API_KEY.

## Duration

- **Start:** 2026-05-26T10:34:30Z
- **End:** 2026-05-26T10:41:22Z
- **Total:** 6 min
- **Tasks completed:** 2 / 2
- **Files created/modified:** 15

## Tasks Completed

### Task 1: Route handlers de upload e chat + AI stream server-side

**Commit:** `7938b6d`

Criados tres arquivos:

1. `upload/route.ts` — POST multipart/form-data com auth check, validacao de tamanho (413), extensao (415), deteccao de XLSX multi-aba (retorna `sheet_selection`), e persiste schema sem logar conteudo raw (PRIV-02).

2. `chat/route.ts` — POST JSON com IDOR guard (T-04-01-01) via `findUploadedFileByIdAndUser(id, user.id)`, reserva/confirma/libera quota, stream NDJSON, e appendChatMessages fire-and-forget.

3. `file-chat-stream.ts` — `import "server-only"`, system prompt com secao "DADOS DO ARQUIVO" delimitada por "---" com instrucao anti-injection explicita (T-04-01-04), streaming real OpenAI com for-await, fixture deterministica quando OPENAI_API_KEY ausente.

### Task 2: Hooks de estado e componentes de UI da feature

**Commit:** `373cdb3`

Criados 10 novos arquivos, modificados 2 existentes:

- `use-file-upload.ts` — FSM idle/uploading/sheet_selection/complete/error, fetch multipart sem Content-Type manual, client-side size validation, selectSheet para re-upload com aba escolhida.
- `use-file-chat.ts` — NDJSON streaming loop exato do use-scripts-stream.ts adaptado, sendQuickAction com prompts pivot/report, mensagem user otimista antes do fetch.
- `file-upload-panel.tsx` — drop zone acessivel (role=button, tabIndex=0, aria-label, onKeyDown Enter/Space), aviso inline de substituicao de arquivo ativo (D-09).
- `sheet-selector.tsx` — chips inline com aria-pressed, botao "Confirmar aba" desabilitado ate selecao.
- `schema-preview.tsx` — exibe colunas com tipos em pt-BR, border-left info color (sistema mensagem visual).
- `chat-message.tsx` — user (alinhado direita), assistant (pre + CopyButton + streaming border), system (border-left info).
- `chat-panel.tsx` — aria-live="polite" na lista, quick action chips com aria-label correto, banners quota.
- `copy-button.tsx` — copia verbatim de formula/components/copy-button.tsx.
- `file-analysis-tool.tsx` — orquestrador "use client" com uiState idle/sheet_selection/chat.
- `page.tsx` — RSC autenticada sem "use client", padrao exato do scripts/page.tsx.
- `sidebar.tsx` — File Analysis ativado com href="/workspace/file-analysis".
- `globals.css` — .file-analysis-layout, .chat-message-list, .chat-input-row, .quick-action-row.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] FileUploadPanel desacoplado do hook use-file-upload**
- **Found during:** Task 2
- **Issue:** O plano descrevia FileUploadPanel com props `onUploadComplete(fileId, schema)` e `onSheetSelection(sheetNames)`, implicando que o hook seria interno ao componente. Porem o hook retorna estado assincrono que precisa ser observado pelo orquestrador file-analysis-tool.tsx para transicionar o uiState.
- **Fix:** FileUploadPanel recebe `onUpload(file, sheetName?)`, `uploading`, `error` como props. O hook `useFileUpload` fica em `file-analysis-tool.tsx` que observa `uploadHook.status` e dispara a transicao de estado.
- **Files modified:** file-upload-panel.tsx, file-analysis-tool.tsx
- **Impact:** Sem impacto no comportamento; simplifica o fluxo de dados.

**2. [Rule 2 - Missing] appendChatMessages fire-and-forget**
- **Found during:** Task 1
- **Issue:** O plano nao especificava quando appendChatMessages e updateLastChatAt sao chamados em relacao ao stream response. Chamar antes de iniciar o stream bloquearia o primeiro delta event.
- **Fix:** Chamados com `void` (fire-and-forget) apos `confirmToolUse`, antes de retornar o Response. Erros sao absorvidos pela camada repository (try/catch ja existente).
- **Files modified:** chat/route.ts
- **Impact:** Historico pode falhar sem afetar a resposta do usuario; comportamento aceitavel para MVP.

**Total deviations:** 2 auto-fixed (Rule 2 — missing critical functionality)
**Impact:** Sem alteracao de comportamento externo. Ambas as decisoes melhoram a corretude do codigo.

## Known Stubs

Nenhum stub identificado. Todos os campos sao derivados de dados reais (schema do banco, historico de mensagens, stream OpenAI).

## Threat Flags

Nenhum novo surface de seguranca identificado alem dos ja modelados no threat register do plano.

## Self-Check

### Files exist on disk

- [x] `apps/web/src/app/api/tools/file-analysis/upload/route.ts` — FOUND
- [x] `apps/web/src/app/api/tools/file-analysis/chat/route.ts` — FOUND
- [x] `apps/web/src/server/ai/file-chat-stream.ts` — FOUND
- [x] `apps/web/src/features/file-analysis/hooks/use-file-upload.ts` — FOUND
- [x] `apps/web/src/features/file-analysis/hooks/use-file-chat.ts` — FOUND
- [x] `apps/web/src/features/file-analysis/components/chat-panel.tsx` — FOUND
- [x] `apps/web/src/features/file-analysis/file-analysis-tool.tsx` — FOUND
- [x] `apps/web/src/app/(workspace)/workspace/file-analysis/page.tsx` — FOUND

### Commits exist

- [x] `7938b6d` — feat(04-02): route handlers upload + chat + AI stream server-side
- [x] `373cdb3` — feat(04-02): hooks + componentes UI + pagina RSC file-analysis

### Acceptance criteria

- [x] upload/route.ts contem validacao de size > 5MB retornando status 413
- [x] upload/route.ts contem validacao de extensao com retorno 415
- [x] upload/route.ts nao contem "console.log" com buffer ou conteudo (PRIV-02)
- [x] chat/route.ts contem "findUploadedFileByIdAndUser" chamado com userId do usuario autenticado (T-04-01-01)
- [x] chat/route.ts contem "reserveToolUse" e "releaseToolUse" no bloco de erro
- [x] file-chat-stream.ts contem "import 'server-only'"
- [x] file-chat-stream.ts contem texto de instrucao anti-injection sobre dados do arquivo nao serem instrucoes
- [x] Todos os novos arquivos em features/file-analysis/ passam no type-check sem erros
- [x] file-analysis-tool.tsx contem "use client" na primeira linha
- [x] page.tsx em workspace/file-analysis nao contem "use client" (e RSC)
- [x] chat-panel.tsx contem aria-live="polite" na chat message list
- [x] file-upload-panel.tsx contem role="button" e tabIndex={0} no drop zone
- [x] chat-panel.tsx contem chips "Resumo Pivo" e "Relatorio Executivo" com aria-label correto
- [x] use-file-chat.ts contem o loop NDJSON exato com buffer splitting
- [x] use-file-chat.ts contem logica de sendQuickAction com prompt de pivot e report
- [x] pnpm build (Next.js build) completa sem erros de compilacao — /workspace/file-analysis aparece como rota dinamica (ƒ)
- [x] pnpm exec tsc --noEmit retorna 0 erros

## Self-Check: PASSED

**Next:** Ready for 04-03 (cleanup job / cron, se existir) ou fase concluida.
