---
phase: 07-frontend-history
plan: "02"
subsystem: api/ui
tags: [route-handler, topbar, delete, accessibility, popover, idor, auth]
dependency_graph:
  requires:
    - "07-01"
  provides:
    - DELETE /api/conversations/[tool]
    - Topbar.toolKind prop
    - Topbar.onNewConversation prop
  affects:
    - apps/web/src/features/formula/formula-tool.tsx
    - apps/web/src/features/sql/sql-tool.tsx
    - apps/web/src/features/regex/regex-tool.tsx
    - apps/web/src/features/scripts/scripts-tool.tsx
    - apps/web/src/features/template/template-tool.tsx
tech_stack:
  added: []
  patterns:
    - Next.js 15 dynamic params como Promise (await params)
    - isValidToolKind enum guard com readonly tuple
    - useRef para retorno de foco (a11y)
    - useEffect com cleanup para Esc e click-outside
    - Falha silenciosa no DELETE (200 independente do resultado do repository)
key_files:
  created:
    - apps/web/src/app/api/conversations/[tool]/route.ts
  modified:
    - apps/web/src/components/app/topbar.tsx
decisions:
  - "params como Promise seguindo padrão Next.js 15 — await params antes de desestruturar tool"
  - "Falha silenciosa no DELETE: handler retorna 200 mesmo se deleteConversationExchanges retorna null (D-10)"
  - "Retorno de foco ao trigger após fechar popover implementado via useRef — acessibilidade completa sem biblioteca externa"
  - "file-analysis excluído do VALID_TOOL_KINDS (D-07 — histórico efêmero por privacidade)"
metrics:
  duration: "12 min"
  completed: "2026-05-29"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 07 Plan 02: DELETE Endpoint e Botão Nova Conversa Summary

Route handler DELETE `/api/conversations/[tool]` com auth guard 401, enum guard 400 (5 tool kinds, sem file-analysis) e IDOR via repository; Topbar estendido com props opcionais `toolKind` e `onNewConversation`, botão "Nova conversa" condicional com popover de confirmação acessível (role="dialog", Esc, click-outside, focus return, aria-expanded, aria-haspopup="dialog").

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Criar DELETE /api/conversations/[tool]/route.ts | 82e3fae | apps/web/src/app/api/conversations/[tool]/route.ts |
| 2 | Adicionar botão Nova conversa com popover de confirmação ao Topbar | d72e037 | apps/web/src/components/app/topbar.tsx |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

**Tarefa 1 — route.ts:**
- `grep "export async function DELETE"` — match na linha 13
- `grep "status: 401"` — match (auth guard)
- `grep "status: 400"` — match (enum guard)
- `grep "VALID_TOOL_KINDS"` — inclui formula, sql, regex, scripts, template; sem file-analysis
- `grep "deleteConversationExchanges"` — match (função chamada com user.id + toolKind)
- `npx tsc --noEmit` — exit 0, sem erros

**Tarefa 2 — topbar.tsx:**
- `grep "toolKind"` — match em props, JSX condicional e URL do fetch
- `grep "onNewConversation"` — match em props e em handleDeleteHistory
- `grep "Nova conversa"` — match no texto do botão trigger
- `grep 'role="dialog"'` — match no container do popover
- `grep "destructive"` — match no style do botão Apagar histórico
- `grep "aria-expanded"` — match nos dois menus (novo e existente)
- `grep "aria-haspopup"` — match com valor "dialog" no trigger do popover
- `grep "Apagar o histórico deste tool"` — match no texto de confirmação
- `grep "Cancelar"` — match no botão de cancelamento
- `grep "showAccountMenu"` — 4 ocorrências (estado + toggle + aria-expanded + condicional) — inalterado
- `npx tsc --noEmit` — exit 0, sem erros

## Known Stubs

None.

## Threat Flags

Nenhuma superfície nova fora do threat model documentado no PLAN.md.
- T-07-04 (Spoofing): mitigado via auth guard 401
- T-07-05 (IDOR): mitigado via userId da sessão + toolKind em deleteConversationExchanges
- T-07-06 (Tampering — params.tool): mitigado via isValidToolKind enum guard 400
- T-07-07 (EoP — callback): aceito (apenas limpa estado local no cliente)

## Self-Check: PASSED

- [x] apps/web/src/app/api/conversations/[tool]/route.ts criado e commitado
- [x] apps/web/src/components/app/topbar.tsx modificado e commitado
- [x] Commit 82e3fae existe (Tarefa 1)
- [x] Commit d72e037 existe (Tarefa 2)
- [x] TypeScript compila limpo em ambas as tarefas
- [x] account-menu existente (showAccountMenu/signOut) permanece inalterado
