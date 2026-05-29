# Phase 7: Frontend History - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Carregar automaticamente os exchanges persistidos na Phase 6 e renderizá-los no chat-thread ao abrir cada workspace de tool de texto (Formula, SQL, Regex, Scripts, Template), restaurando metadados e seletores ativos, e fornecer um controle "Nova conversa" que apaga o histórico daquele tool no banco e limpa a UI.

Escopo: leitura server-side do histórico no mount + render dos exchanges salvos + restauração de seletores + endpoint DELETE + botão "Nova conversa" com confirmação.

Fora do escopo: File Analysis (permanece efêmero por privacidade — ver D-07); multi-turn LLM context (Phase 8); busca/filtro/export de histórico (Future).

**⚠ Ajuste de critério de sucesso:** O critério de sucesso #1 do ROADMAP (§Phase 7) lista File Analysis entre os workspaces que devem mostrar histórico. Esta fase **remove File Analysis dessa lista** por decisão de privacidade (D-07). O critério passa a cobrir apenas os 5 tools de texto.

</domain>

<decisions>
## Implementation Decisions

### Estratégia de carregamento
- **D-01:** Server prefetch. A `page.tsx` (server component) busca os exchanges do usuário e passa como prop inicial ao tool component. Histórico renderizado no primeiro paint — sem spinner, sem flash de tela vazia. Alinha com o padrão atual (`user`/`entitlement` já chegam assim via `getCachedUser`/`getCachedEntitlement`).
- **D-02:** Leitura via função server-side direta no `conversation-repository.ts` (ex: `findConversationExchanges`), chamada pela `page.tsx`. **Nenhum GET endpoint HTTP** é criado nesta fase — o GET deferido da Phase 6 não é necessário com prefetch.
- **D-03:** Carregar todos os exchanges salvos do tool (já limitados ao cap de 50 por `userId+toolKind` da Phase 6). Sem janela/paginação adicional nesta fase.

### "Nova conversa"
- **D-04:** Hard delete. O botão chama `DELETE /api/conversations/[tool]`, apaga os exchanges daquele tool no banco e limpa o estado local. Histórico não reaparece no reload — o thread realmente recomeça. Alinha com HIST-05 e prepara o thread limpo esperado pelo Phase 8.
- **D-05:** Diálogo de confirmação antes de apagar ("Apagar o histórico deste tool? Esta ação não pode ser desfeita." ou equivalente), pois o delete é permanente. Após sucesso, confirmar ao usuário (critério #3).
- **D-06:** Botão "Nova conversa" no **topbar** do workspace (`components/app/topbar.tsx`), visível e consistente em todos os tools, sempre acessível mesmo com thread longo.

### File Analysis
- **D-07:** File Analysis fica **fora** do histórico persistente nesta fase. O chat continua efêmero junto com o `UploadedFile` deletado, coerente com a regra de privacidade. Não usa `ConversationExchange`. Resolve o blocker registrado na STATE.md.

### Restauração e estados de borda
- **D-08:** Restaurar os seletores ativos do input (plataforma / dialeto / modo) a partir do exchange mais recente, para o usuário continuar de onde parou. Cada exchange renderizado continua exibindo seus próprios metadados salvos (critério #2).
- **D-09:** Empty state limpo. Primeiro uso (sem histórico) abre o workspace vazio com o input pronto, como hoje — sem mensagem especial. Com server prefetch não há loading state.
- **D-10:** Erro de leitura do histórico não bloqueia o usuário: a `page.tsx` abre o workspace vazio e loga server-side. Mesmo padrão "persist on success, skip on error" do Phase 6.

### DELETE endpoint
- **D-11:** Seguir o padrão genérico `/api/conversations/[tool]` (método DELETE) com `toolKind` validado contra enum — não rotas por tool. Aplicar IDOR guard (`userId` + `toolKind` em todas as queries), consistente com a Phase 6. Retornar 401 para requisições não autenticadas.

### Claude's Discretion
- Nome exato da função de leitura no repository (`findConversationExchanges` sugerido).
- Forma do mapeamento do `assistantPayload` (JSON genérico) de volta para o shape de cada tool (ex: `FormulaExchange`). Confiar no payload salvo e renderizar direto é aceitável — ele preserva a estrutura completa (D-02 da Phase 6).
- Mecânica exata do diálogo de confirmação (componente/modal vs. confirm nativo) — seguir padrões de UI existentes; pode ser refinado no UI-SPEC.
- Como a `page.tsx` injeta os exchanges iniciais e os seletores restaurados nos tool components (props vs. estado inicial derivado).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Persistência existente (Phase 6 — leitura/escrita)
- `apps/web/src/server/tools/conversation-repository.ts` — Repository de `ConversationExchange` (save + cap de 50 + transação serializable). A função de leitura desta fase será adicionada aqui; seguir o mesmo padrão try/catch + warn silencioso.
- `prisma/schema.prisma` — Schema do model `ConversationExchange` (colunas `toolKind`, `platform`, `dialect`, `mode`, `userPrompt`, `assistantPayload Json`, indexes). Ler antes de qualquer query.
- `apps/web/src/server/db/client.ts` — Singleton `prisma`.
- `apps/web/src/server/file-analysis/file-repository.ts` — Padrão IDOR guard (`userId` + id em todas as queries). Aplicar no DELETE de exchanges.

### Frontend — tool components e chat-thread
- `apps/web/src/features/formula/formula-tool.tsx` — Padrão de tool com `exchanges` em `useState`, render do `.chat-thread` / `.chat-exchange` / `.user-bubble`. Template para os outros tools. Aqui entra o prefetch (prop inicial) e a restauração de seletores.
- `apps/web/src/features/sql/sql-tool.tsx` — Mesmo padrão para SQL.
- `apps/web/src/features/regex/`, `apps/web/src/features/scripts/`, `apps/web/src/features/template/` — Demais tools de texto no mesmo padrão.
- `apps/web/src/components/app/topbar.tsx` — Onde o botão "Nova conversa" será adicionado (D-06).
- `apps/web/src/components/app/chat-input.tsx` — Input fixo com `bottomNav` (ToolNav). Contexto do layout chat-thread.

### Páginas (server components — ponto de prefetch)
- `apps/web/src/app/(workspace)/workspace/page.tsx` — Page do Formula (busca `user`/`entitlement`). Padrão para injetar exchanges iniciais.
- `apps/web/src/app/(workspace)/workspace/sql/page.tsx`, `.../regex/page.tsx`, `.../scripts/page.tsx`, `.../templates/page.tsx` — Demais pages de tool de texto.

### Route handlers (onde o save já acontece — referência de `toolKind`)
- `apps/web/src/app/api/tools/formula/generate/route.ts` (+ `explain`), `.../sql/generate/route.ts`, `.../regex/generate` (+ `explain`), `.../scripts/generate`, `.../template/generate` — Mostram os `toolKind` válidos e o shape do `assistantPayload` salvo. A nova rota DELETE viverá esses mesmos `toolKind`.

### Requisitos e roadmap
- `.planning/REQUIREMENTS.md` — HIST-03, HIST-05 são os requirements desta fase.
- `.planning/ROADMAP.md` §Phase 7 — Goal e success criteria (ver ajuste do critério #1 na seção `<domain>`).
- `.planning/phases/06-persistence-layer/06-CONTEXT.md` — Decisões da camada de persistência (D-02 payload JSON, D-09 padrão de rota genérica `/api/conversations/[tool]`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `conversation-repository.ts`: já tem `saveConversationExchange`; a função de leitura e o delete por `userId+toolKind` entram aqui no mesmo padrão.
- `*-tool.tsx` (Formula, SQL, etc.): já renderizam `exchanges` em `.chat-thread`; só precisam receber os exchanges iniciais via prop e fazer o seed de seletores.
- `*-output-panel.tsx`: já renderizam um exchange a partir de `result`/`metadata`/`warnings`. O payload salvo (`assistantPayload`) tem a mesma estrutura — render direto é viável.
- Padrão `page.tsx` server component com `getCachedUser`/`getCachedEntitlement`: estender para também buscar exchanges.

### Established Patterns
- **IDOR guard:** toda query filtra por `userId` (+ `toolKind` aqui). Aplicar no read e no DELETE.
- **Persist/read on success, skip on error:** repository retorna `null`/vazio e faz `console.warn` em vez de throw — não quebra o fluxo do usuário (D-10).
- **Rota genérica por enum:** `/api/conversations/[tool]` com `toolKind` validado (D-09 da Phase 6) — aplicar no DELETE.
- **Layout chat-thread:** input fixo na base, exchanges acumulam acima (`.chat-thread` > `.chat-exchange` > `.user-bubble` + output panel).

### Integration Points
- `page.tsx` (server) → busca exchanges via repository → passa como prop inicial ao tool component (client).
- Tool component → seed de `exchanges` state e de seletores a partir das props no mount.
- Topbar → botão "Nova conversa" → confirmação → `DELETE /api/conversations/[tool]` → limpa estado local.
- `assistantPayload` (JSON salvo na Phase 6) → mapeado de volta para o shape de render de cada tool.

</code_context>

<specifics>
## Specific Ideas

- O payload salvo preserva a estrutura completa do assistente (formula/explanation/metadata/warnings para Formula; query+explanation para SQL; etc.), então a re-renderização deve ser fiel sem re-chamar o LLM.
- Restauração de seletores deve usar o exchange **mais recente** (último da lista ordenada por `createdAt`).
- Confirmação de delete deve deixar claro que a ação é permanente (hard delete).

</specifics>

<deferred>
## Deferred Ideas

- **File Analysis no histórico persistente** — fora do escopo por privacidade (D-07); o chat permanece efêmero ligado ao arquivo.
- **Multi-turn LLM context** (injeção do histórico nas chamadas ao LLM + truncagem) — Phase 8 (MULTI-01/02/03).
- **GET /api/conversations/[tool]** — não necessário nesta fase (prefetch server-side cobre); pode ser criado no futuro se houver busca/paginação client-side.
- **Busca e filtro no histórico** — Future (REQUIREMENTS.md).
- **Export de conversas (PDF, texto)** — Future (REQUIREMENTS.md).
- **Conversas compartilháveis entre usuários** — v2 (REQUIREMENTS.md).

</deferred>

---

*Phase: 7-frontend-history*
*Context gathered: 2026-05-29*
