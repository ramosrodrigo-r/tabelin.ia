---
phase: 20-protocolo-de-muta-o-chat-grade-q-a
plan: 02
subsystem: web-ui
tags: [unified-chat, planilha-viva, workspace-state, spec-override, mutation, undo, vitest]

requires:
  - phase: 20-01
    provides: "Rota /api/chat/unified que valida specOverride e emite o evento complete com payload table_spec já traduzido para pt-BR"
  - phase: 14-tabela-viva
    provides: "WorkspaceStateProvider (spec/setSpec/undo/redo) e o histórico undoável da grade"
provides:
  - "Hook useUnifiedChatStream transmite o spec atual da planilha viva como specOverride (JSON e FormData)"
  - "UnifiedChatTool aplica mutações table_spec à grade aberta via setSpec, preservando o histórico de undo (Ctrl+Z)"
  - "Suíte de testes do chat unificado cobrindo transmissão do spec, mutação chat→grade e não-mutação em Q&A"
affects: [planilha-viva, chat-unificado, protocolo-de-mutacao]

tech-stack:
  added: []
  patterns:
    - "O cliente envia o estado vivo da grade (workspaceState.spec) em toda requisição; o BFF muta sobre esse estado"
    - "Mutação chat→grade aplicada por efeito dedicado com dedupe via ref, separado do efeito que arquiva exchanges"
    - "setSpec (RESET_TO_SEED) registra o estado anterior no histórico, mantendo a mutação da IA desfazível"

key-files:
  created: []
  modified:
    - apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts
    - apps/web/src/features/unified-chat/unified-chat-tool.tsx
    - apps/web/tests/unified-chat-tool.test.tsx

key-decisions:
  - "Mutação aplicada num useEffect separado com appliedResultRef para deduplicar entre re-renders, sem acoplar ao efeito de arquivamento de exchanges"
  - "submit do hook passa a depender de workspaceState.spec para que cada requisição carregue o estado atual da grade"
  - "Testes ganham uma WorkspaceProbe (spec.title/canUndo/undo) para asserir mutação e integridade de undo sem depender da grade virtualizada"

patterns-established:
  - "Frontend transmite o estado vivo da planilha como specOverride e aplica o table_spec retornado via setSpec, com undo"

requirements-completed: [CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05]

duration: 3min
completed: 2026-06-14
status: complete
---

# Phase 20 Plan 02: Protocolo de Mutação Chat→Grade e Q&A (frontend) Summary

**O frontend da planilha viva agora envia o estado atual da grade como `specOverride` e, ao receber um `table_spec` no evento `complete`, aplica a mutação diretamente na grade via `setSpec` — de forma transparente e desfazível com Ctrl+Z.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-06-14T20:10:10Z
- **Completed:** 2026-06-14T20:13:00Z
- **Tasks:** 3
- **Files modified/created:** 3

## Accomplishments
- `useUnifiedChatStream` lê `workspaceState.spec` via `useWorkspaceState()` e transmite o estado vivo da planilha como `specOverride` — objeto no corpo JSON e string serializada no FormData (caminho com anexo).
- `UnifiedChatTool` consome `useWorkspaceState` e, num efeito dedicado, detecta o `complete` com payload `table_spec` e invoca `workspaceState.setSpec(result)` para mutar a grade aberta. `setSpec` registra o estado anterior no histórico, então a mutação da IA é desfazível (Ctrl+Z).
- Dedupe via `appliedResultRef` evita reaplicar a mutação em re-renders; o ref é zerado em "Nova conversa".
- Suíte de testes do chat unificado embrulhada em `<WorkspaceStateProvider>` (agora obrigatório) e expandida com asserts comportamentais de transmissão de spec, mutação chat→grade com undo e não-mutação em Q&A.

## Task Commits

1. **Task 1: transmitir o spec atual como specOverride** - `e4e19a9` (feat)
2. **Task 2: aplicar mutações table_spec à grade via setSpec** - `bf9d235` (feat)
3. **Task 3: cobrir transmissão de spec e mutação chat→grade com undo** - `c1f4086` (test)

## Files Created/Modified
- `apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts` - Lê e serializa `workspaceState.spec` como `specOverride` (JSON + FormData); `submit` passa a depender de `workspaceState.spec`.
- `apps/web/src/features/unified-chat/unified-chat-tool.tsx` - Consome `useWorkspaceState`; efeito dedicado aplica `table_spec` via `setSpec` (undoável) com dedupe por ref, resetado em nova conversa.
- `apps/web/tests/unified-chat-tool.test.tsx` - Helper `renderUnifiedChatTool` + `WorkspaceProbe`; testes de `specOverride` no corpo, mutação chat→grade + undo, e Q&A sem mutação.

## Decisions Made
- Efeito de mutação separado do efeito de arquivamento de exchanges, com `appliedResultRef` para deduplicar — mantém o arquivamento intacto e a mutação idempotente por stream.
- `submit` depende de `workspaceState.spec` para sempre transmitir o estado vivo atual da grade.
- `WorkspaceProbe` expõe `spec.title`/`canUndo`/`undo` para asserir mutação e integridade de undo sem tocar a grade virtualizada (react-datasheet-grid não renderiza valores planos em jsdom).

## key_link Satisfied
- `apps/web/src/features/unified-chat/unified-chat-tool.tsx` → `apps/web/src/components/app/workspace-state-context.tsx` via `useWorkspaceState` / `context.setSpec` (chamada `workspaceState.setSpec(result)` no efeito de conclusão do stream).

## Deviations from Plan
None - plan executed exactly as written.

(Detalhe de implementação: a aplicação da mutação ficou num `useEffect` dedicado com dedupe por ref, em vez de embutida no efeito de arquivamento já existente — escolha de coesão/idempotência, dentro do escopo do plano. O ref também é resetado em "Nova conversa".)

## Issues Encountered
- `pnpm -r typecheck`/test exigem `prisma generate` prévio em árvore limpa (falso-positivo `.prisma/client/default`); resolvido rodando `prisma generate` antes, conforme memória do projeto.
- A suíte completa do web rodou verde; o teste conhecido-flaky "corrupt NDJSON enters the error state" passou no run completo.

## User Setup Required
None - o caminho sem `OPENAI_API_KEY` usa as fixtures determinísticas do Plan 20-01; a UI consome o `table_spec` independentemente da origem (fixture ou OpenAI real).

## LOC (wave)
- Adicionadas: 134 · Removidas: 13 · **Líquido: +121** (apps/web: hook, componente e testes do chat unificado).

## Next Phase Readiness
- Protocolo de mutação chat→grade ligado ponta a ponta: cliente envia o estado vivo, BFF muta, grade aplica via `setSpec` com undo. Pronto para o UAT formal do eixo binário operação-na-planilha vs Q&A (~20 prompts PT ambíguos).
- Suíte completa do web verde (22 arquivos, 263 passados, 1 skip).

## Self-Check: PASSED

Todos os arquivos modificados/criados existem em disco e todos os commits de tarefa (e4e19a9, bf9d235, c1f4086) estão presentes no histórico. key_link satisfeito: `unified-chat-tool.tsx` chama `workspaceState.setSpec` (workspace-state-context).
