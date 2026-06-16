---
phase: quick-260616-dw3
plan: 01
subsystem: auth / workspace
status: complete
tags: [auth-gate, workspace, preview, rsc, security]
dependency_graph:
  requires:
    - "/api/auth/sign-in/email e /api/auth/sign-up/email (rotas existentes)"
    - "SAMPLE_SPEC (features/unified-chat/lib/sample-spec)"
    - "getCachedUser / getActiveSpreadsheetSpec / findUnifiedConversationExchanges"
  provides:
    - "AuthGate (overlay bloqueante + modal não-dispensável)"
    - "Workspace como preview travado para deslogados"
    - "Rota raiz abrindo direto no workspace"
  affects:
    - "Fluxo de entrada (landing → workspace)"
tech_stack:
  added: []
  patterns:
    - "RSC condicional por sessão sem expor dados de usuário (preview deslogado usa dados-demo)"
    - "router.refresh() para revalidar server components após auth"
key_files:
  created:
    - apps/web/src/components/app/auth-gate.tsx
    - apps/web/src/components/app/auth-gate-modal.tsx
    - apps/web/src/components/app/__tests__/auth-gate-modal.test.tsx
  modified:
    - apps/web/src/app/page.tsx
    - apps/web/src/app/(workspace)/workspace/layout.tsx
    - apps/web/src/app/(workspace)/workspace/page.tsx
    - apps/web/src/components/app/topbar.tsx
    - apps/web/src/styles/globals.css
    - apps/web/src/app/(workspace)/workspace/__tests__/layout.test.tsx
decisions:
  - "Modal não-dispensável: sem botão de fechar / sem ESC / sem overlay-close (D-02)"
  - "Topbar.user opcional; controles de conta e Nova conversa ocultos quando deslogado"
  - "router.refresh() (não router.push) após login — já estamos no workspace"
metrics:
  duration: ~7 min
  completed: 2026-06-16
  tasks: 3
  files: 9
---

# Quick Task 260616-dw3: Auth Gate Workspace Summary

Removeu a landing/redirect-para-sign-in e transformou o workspace em preview travado seguro: deslogado abre o workspace com dados-demo (SAMPLE_SPEC) e um modal de login não-dispensável reusando as rotas /api/auth existentes; após autenticar, router.refresh() revalida e mostra os dados reais.

## What Was Built

- **Rota raiz** (`page.tsx`): redireciona sempre para `/workspace`, sem checar sessão.
- **Layout do workspace**: removido `redirect("/sign-in")`; ramo `!user` usa `SAMPLE_SPEC` como `initialSpec` e nunca chama `getActiveSpreadsheetSpec`. Envolve o `workspace-body` no `AuthGate` passando `isAuthenticated`.
- **Page do workspace**: ramo `!user` renderiza `<UnifiedChatTool initialExchanges={[]} />` sem chamar `findUnifiedConversationExchanges`.
- **Topbar**: `user` agora opcional; oculta o menu de conta e o botão "Nova conversa" quando deslogado (ambos dependem de sessão). Marca e link de Privacidade preservados.
- **AuthGate** (client): autenticado renderiza só `children`; deslogado sobrepõe overlay fixo (`pointer-events: auto`, `z-index: 100`) que captura qualquer clique e monta o `AuthGateModal`.
- **AuthGateModal** (client): toggle login/cadastro, fetch para `/api/auth/sign-in/email` e `/api/auth/sign-up/email`; em sucesso chama `router.refresh()`. Sem fechar.
- **CSS**: `.auth-gate-overlay` e `.auth-gate-modal` (reaproveita `.auth-panel`), sem quebrar `.auth-page`/`.auth-panel`.
- **Testes**: novo `auth-gate-modal.test.tsx` (rotas, refresh, ausência de fechar) e teste de layout atualizado para validar preview travado (sem redirect, SAMPLE_SPEC + overlay).

## Security / Data Protection

Caminho deslogado nunca invoca `getActiveSpreadsheetSpec`, `findUnifiedConversationExchanges` nem qualquer função que receba `user.id` (T-dw3-01). A proteção real é server-side; o overlay é apenas UX (T-dw3-02). Auth reusa rotas existentes com `validateAuthPostOrigin` + cookie HMAC httpOnly (T-dw3-03). Nenhuma nova superfície de auth.

## Verification

- `pnpm exec tsc --noEmit`: limpo (após `prisma generate`).
- `pnpm exec vitest run` (layout + modal): 8 testes passam.
- grep confirma ausência de `redirect("/sign-in")` no layout e na page.
- grep confirma fetch para `/api/auth/sign-(in|up)/email` no modal.

## Deviations from Plan

None - plan executed exactly as written. (Detalhe de implementação: o gate "Nova conversa" na Topbar foi condicionado a `user` em vez de `toolKind` — `toolKind` tem default `"unified"` sempre truthy, então só `user` distingue corretamente o estado deslogado, conforme intenção do item 4 da Task 1.)

## Commits

- `895f18d` feat(quick-260616-dw3-01): rota raiz no workspace + preview travado seguro
- `ef4caa3` feat(quick-260616-dw3-02): AuthGate overlay bloqueante + modal não-dispensável
- `5b8c3d4` test(quick-260616-dw3-03): layout deslogado valida preview travado

## Self-Check: PASSED

- FOUND: apps/web/src/components/app/auth-gate.tsx
- FOUND: apps/web/src/components/app/auth-gate-modal.tsx
- FOUND: apps/web/src/components/app/__tests__/auth-gate-modal.test.tsx
- FOUND: commits 895f18d, ef4caa3, 5b8c3d4
