# Phase 12: Intent Classifier & Unified Route - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Entregar um **input único** (chat unificado) que classifica o intent do usuário e despacha para os resolvers de tool já existentes (formula, sql, regex, scripts, file-analysis, OCR), renderizando outputs heterogêneos no mesmo thread, com um **pill de tipo detectado + override**, preservando o histórico por `toolKind` resolvido, dentro do SLA de início de streaming de 2,5s.

**Cobre:** UNI-01..07.

**NÃO faz parte desta fase:** o loop de clarificação (Phase 13) e a geração/renderização da tabela interativa (Phase 14). O intent `tabela` é apenas classificado e entregue a um stub que as Phases 13/14 preenchem.
</domain>

<decisions>
## Implementation Decisions

### Plataforma/dialeto sem seletor por-aba (UNI-05)
- **D-01:** Seletor de contexto **persistente no header** da sessão unificada com defaults sensatos (Excel, pt-BR com `;`, PostgreSQL para SQL). A IA **também infere** plataforma/dialeto/idioma do prompt quando o sinal é claro; o seletor do header funciona como override explícito do que foi inferido.
- **D-02:** O contexto de plataforma/dialeto persiste entre turns relacionados na sessão (não reseta a cada mensagem).

### UX do override de intent (UNI-02)
- **D-03:** Ao escolher outro tipo no pill, a geração **re-roda imediatamente** com o resolver correto reusando o mesmo prompt — não apenas re-rotula. O override é a correção de roteamento de um clique.

### Arquivo no input único (file-analysis, OCR)
- **D-04:** Reusar o mecanismo de **paperclip/attach universal do v1.2** no input unificado; a presença de arquivo influencia a classificação de intent.
- **D-05:** Se a IA detectar um intent dependente de arquivo (OCR ou file-analysis) **sem** arquivo anexado, o assistente **pede para anexar** em vez de gerar algo vazio.

### Baixa confiança & intent 'tabela' (UNI-01, UNI-06)
- **D-06:** Estratégia **"melhor palpite + override visível"**: a rota sempre gera com o intent mais provável e mantém o pill de override à mão. Nenhum round-trip extra de classificação — preserva o SLA de 2,5s (classificação embutida na chamada única de Structured Outputs, campo de intent primeiro no schema).
- **D-07:** Intent `tabela` é classificado nesta fase mas entregue a um **stub/handoff** (mensagem-ponte) que as Phases 13 (clarificação) e 14 (grid) implementam. Phase 12 não renderiza grid.

### Claude's Discretion
- Forma exata do pill (posição durante streaming vs. acima da resposta), do dropdown de override e do seletor de header — seguir os componentes/tema claro já estabelecidos no workspace.
- Descoberta/sidebar: páginas por-tool permanecem acessíveis (UNI-07); manter os atalhos de tool acessíveis (sidebar ou deep link) com o chat unificado como default — forma exata a critério do planner/UI.
- Esquema concreto do Zod de classificação (enum de intents, campo de confiança) e como o `intent` resolvido mapeia para o `toolKind` salvo — seguir o desenho de ARCHITECTURE.md.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Decisões de milestone / pesquisa
- `.planning/research/SUMMARY.md` — decisões técnicas travadas (Structured Outputs em chamada única, `toolKind` resolvido, sem migração Prisma, 2,5s SLA) e ordenação de fases
- `.planning/research/ARCHITECTURE.md` — desenho concreto do `/api/chat/unified`, `intent-classifier.ts`, estratégia de `toolKind`, prefetch de histórico
- `.planning/research/PITFALLS.md` — latência do classificador, regressão por remoção de abas, pills de override obrigatórios
- `.planning/REQUIREMENTS.md` §Chat Unificado — UNI-01..07 (requisitos desta fase)
- `.planning/ROADMAP.md` Phase 12 — goal e critérios de sucesso

### Código existente (padrões a reusar)
- `apps/web/src/app/api/tools/formula/generate/route.ts` — padrão de route handler (auth → pro-gate condicional → quota reserve/confirm/release → extração → `resolve{Tool}Payload` → NDJSON stream)
- `apps/web/src/server/ai/context-messages.ts` — multi-turn context + `MAX_EXTRACTED_CHARS`, filtro `GENERATE_MODE`
- `apps/web/src/server/tools/conversation-repository.ts` — `findConversationExchanges`/`saveConversationExchange` por `userId+toolKind`
- `apps/web/src/server/usage/quota-service.ts` — `reserveToolUse`/`confirmToolUse`/`releaseToolUse`
- `apps/web/src/components/app/topbar.tsx` — `useWorkspaceToolKind()` (hoje hardcoda `/workspace`→`"formula"`)
- `apps/web/src/app/(workspace)/workspace/page.tsx` — entry point atual (FormulaTool) que vira o chat unificado
- `apps/web/src/server/extraction/dispatcher.ts` — `extractContent` (attach universal v1.2)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Resolvers por-tool** (`resolveFormulaPayload`, `resolveSqlPayload`, etc.) e seus `*-stream.ts` NDJSON — o classificador apenas decide *qual* resolver chamar; geradores ficam inalterados.
- **Pipeline de quota** reserve/confirm/release — reusar com o `toolKind` resolvido por exchange.
- **Attach universal v1.2** (`extractContent` + paperclip UI) — reusado para OCR/file-analysis no input único (D-04).
- **Multi-turn history** por `userId+toolKind` — preservado; o exchange salva com o `toolKind` resolvido, não um genérico "unified".

### Established Patterns
- Cada tool tem schema de request, params de plataforma/dialeto e `toolKind` de quota próprios — o `/api/chat/unified` precisa normalizar a entrada do input único para o schema do resolver escolhido.
- Streaming NDJSON com `content-type: application/x-ndjson` e `cache-control: no-store` — manter o mesmo contrato para o dispatcher de render no client.
- Tema claro no workspace; layout chat-thread com input fixo na base.

### Integration Points
- Novo `apps/web/src/app/api/chat/unified/route.ts` — orquestra auth, pro-gate (quando há arquivo), quota, classificação embutida e dispatch.
- Novo `intent-classifier.ts` (server AI) — Structured Outputs (intent primeiro no schema).
- `useWorkspaceToolKind()` em `topbar.tsx` precisa evoluir para o contexto unificado (cuidado: componente compartilhado por todas as páginas de tool — risco de regressão).
- Client: dispatcher de render que escolhe CodeBlock / TextResponse / (stub de tabela) por tipo de output, + pill de intent + override + seletor de plataforma no header.

</code_context>

<specifics>
## Specific Ideas

- Visão do usuário: "acabar com as sections" — um input só, a IA decide. O chat unificado é o ponto de entrada default; abas viram atalhos, não pré-requisito.
- Override de um clique re-roda na hora (D-03) — o usuário deve conseguir corrigir misrouting sem reescrever o prompt.
</specifics>

<deferred>
## Deferred Ideas

- Loop de clarificação (uma pergunta por turno, ConfirmationCard, "Gerar mesmo assim") — **Phase 13**.
- Geração e renderização da tabela interativa (grid editável, fórmulas vivas, pt-BR) — **Phase 14**.
- Export CSV/XLSX e migração final da navegação (remover ToolNav do root) — **Phase 15**.
- Chips de sugestão de "próximo passo" e histórico unificado com filtro por tipo — Future (v2.x).

None — discussion stayed within phase scope.
</deferred>

---

*Phase: 12-intent-classifier-unified-route*
*Context gathered: 2026-06-08*
