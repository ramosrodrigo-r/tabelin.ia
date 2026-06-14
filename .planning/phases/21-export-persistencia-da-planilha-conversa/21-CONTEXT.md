# Phase 21: Export & Persistência da Planilha+Conversa - Context

**Gathered:** 2026-06-14  
**Status:** Ready for planning  

<domain>
## Phase Boundary

Esta fase abrange a persistência completa do estado da planilha e do histórico de conversa entre sessões do usuário no chat unificado, além da garantia de funcionamento dos recursos de exportação (CSV/XLSX com fórmulas calculadas e sem injeção de fórmulas).

Requisitos cobertos: **PERS-01, PERS-02, PERS-03, PERS-04**.
</domain>

<decisions>
## Implementation Decisions

### Persistência do Estado da Planilha Viva
- **D-01 (Banco de Dados):** O estado completo da planilha (`TableSpecPayload`) será salvo na tabela `ConversationExchange` com `toolKind = "unified_table"` e `mode = "active_spec"`. Para evitar acúmulo desnecessário de linhas, o banco conterá exatamente uma planilha ativa por usuário (substituindo via transaction delete + create).
- **D-02 (Auto-Save Debounced):** No client-side, o `WorkspaceStateProvider` disparará uma chamada POST para `/api/workspace/state` de forma debancada (1.5 segundos) e deduplicada (usando `useRef` para comparar a string do JSON e pular a gravação se não houver mudanças em relação ao último estado salvo). O auto-save é pulado no mount inicial.

### UX Sem Flash (Server-side Initialization)
- **D-03 (Server Component Load):** O `WorkspaceLayout` e o `WorkspacePage` (Server Components do Next.js) buscarão diretamente do banco de dados (via Prisma) o spec ativo da planilha e o histórico das mensagens do chat (kinds `sheet_operation` e `qa`). Estes dados serão injetados diretamente nas props dos componentes clientes (`WorkspaceStateProvider` e `UnifiedChatTool`), garantindo uma inicialização instantânea e sem flash de tela.

### Reset Coerente
- **D-04 (Reset Sincronizado):** Ao clicar em "Nova conversa" (que deleta o histórico de conversa do usuário via DELETE `/api/conversations/unified`), o banco apagará também o registro `"unified_table"`. O frontend reagirá resetando a planilha de volta para a semente padrão (`SAMPLE_SPEC`).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos do milestone
- [PRD-MILESTONE-PLANILHA-VIVA.md](file:///home/rodrigo/tabelin.ia/PRD-MILESTONE-PLANILHA-VIVA.md) — Requisitos de produto v3.0, especialmente **RF-05** (Export) e **RF-06** (Persistência).
- [.planning/REQUIREMENTS.md](file:///home/rodrigo/tabelin.ia/.planning/REQUIREMENTS.md) — Lista de requisitos **PERS-01..04** (linhas 36-41).
- [.planning/ROADMAP.md](file:///home/rodrigo/tabelin.ia/.planning/ROADMAP.md) — Critérios de sucesso e metas da Phase 21 (linhas 335-349).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [conversation-repository.ts](file:///home/rodrigo/tabelin.ia/apps/web/src/server/tools/conversation-repository.ts) — Contém queries do Prisma para a tabela `ConversationExchange`. Adicionaremos as funções de leitura/gravação do spec ativo da planilha e leitura do histórico unificado aqui.
- [workspace-state-context.tsx](file:///home/rodrigo/tabelin.ia/apps/web/src/components/app/workspace-state-context.tsx) — Provedor de estado da planilha. Adicionaremos suporte a `initialSpec` nas props e o `useEffect` para auto-save debancado.
- [unified-chat-tool.tsx](file:///home/rodrigo/tabelin.ia/apps/web/src/features/unified-chat/unified-chat-tool.tsx) — Interface do chat. Passaremos `initialExchanges` e atualizaremos `handleNewConversation` para chamar `workspaceState.resetToSeed()`.
- [layout.tsx](file:///home/rodrigo/tabelin.ia/apps/web/src/app/(workspace)/workspace/layout.tsx) — Server component do layout do workspace.
- [page.tsx](file:///home/rodrigo/tabelin.ia/apps/web/src/app/(workspace)/workspace/page.tsx) — Server component da página do workspace.

### Established Patterns
- Rotas REST com App Router.
- Verificação de sessão via `getSessionFromCookieHeader(request.headers.get("cookie"))`.
</code_context>
