# Phase 7: Frontend History - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 7-frontend-history
**Areas discussed:** Estratégia de carregamento, Nova conversa, File Analysis no histórico, Restauração e estados de borda

---

## Estratégia de carregamento

### Q1 — Como o histórico deve ser carregado ao abrir o workspace?

| Option | Description | Selected |
|--------|-------------|----------|
| Server prefetch (prop inicial) | page.tsx busca exchanges e passa como prop; sem spinner, sem flash | ✓ |
| Client fetch no mount | useEffect no tool component chama GET; loading state + flash de vazio | |
| Você decide | Planner escolhe | |

**User's choice:** Server prefetch (prop inicial)

### Q2 — Com prefetch, o GET deferido ainda é necessário?

| Option | Description | Selected |
|--------|-------------|----------|
| Função server-side direta | page.tsx chama função do repository; sem rota HTTP de leitura | ✓ |
| GET endpoint + prefetch | Criar /api/conversations/[tool] GET reaproveitável | |
| Você decide | Planner escolhe | |

**User's choice:** Função server-side direta
**Notes:** Carregar todos os exchanges salvos (já limitados ao cap de 50). DELETE ainda terá rota própria.

---

## Nova conversa

### Q1 — O que "Nova conversa" deve fazer com o histórico?

| Option | Description | Selected |
|--------|-------------|----------|
| Deletar do banco (hard) | DELETE /api/conversations/[tool] + limpa UI; thread recomeça | ✓ |
| Limpar só a UI (soft) | Esvazia estado local; histórico volta no reload | |
| Você decide | Planner escolhe | |

**User's choice:** Deletar do banco (hard)
**Notes:** Alinha com HIST-05 e com o thread limpo esperado pelo Phase 8.

### Q2 — Como confirmar antes de apagar?

| Option | Description | Selected |
|--------|-------------|----------|
| Diálogo de confirmação | Confirma ação irreversível antes de deletar | ✓ |
| Apaga direto + feedback | Apaga e mostra toast depois | |
| Você decide | Planner escolhe | |

**User's choice:** Diálogo de confirmação

### Q3 — Onde o controle deve aparecer?

| Option | Description | Selected |
|--------|-------------|----------|
| Topbar do workspace | Botão no topbar, consistente em todos os tools | ✓ |
| Cabeçalho do chat-thread | Contextual, some quando vazio | |
| Junto ao input (ChatInput) | Próximo ao input/bottomNav | |
| Você decide | UI-SPEC/planner | |

**User's choice:** Topbar do workspace

---

## File Analysis no histórico

### Q1 — Como tratar o File Analysis nesta fase?

| Option | Description | Selected |
|--------|-------------|----------|
| Fora do escopo (privacidade) | Chat permanece efêmero ligado ao arquivo deletado; só os 5 tools de texto ganham histórico | ✓ |
| Histórico só dentro da sessão | Mensagens reaparecem enquanto o arquivo existe | |
| Persistir como os outros | Migrar mensagens de texto para ConversationExchange | |
| Você decide | Planner avalia | |

**User's choice:** Fora do escopo (privacidade)
**Notes:** Resolve o blocker da STATE.md. Critério de sucesso #1 do ROADMAP precisa ser ajustado (remover File Analysis).

---

## Restauração e estados de borda

### Q1 — Restaurar seletores ativos do último exchange?

| Option | Description | Selected |
|--------|-------------|----------|
| Restaurar do último exchange | Seletores assumem plataforma/dialeto/modo do exchange mais recente | ✓ |
| Manter defaults | Input sempre abre nos defaults | |
| Você decide | Planner escolhe | |

**User's choice:** Restaurar do último exchange

### Q2 — Como tratar os estados de borda?

| Option | Description | Selected |
|--------|-------------|----------|
| Vazio limpo, sem erro visível | Primeiro uso abre vazio como hoje; erro de leitura abre vazio e loga server-side | ✓ |
| Empty state com mensagem | Placeholder amigável + aviso de erro | |
| Você decide | UI-SPEC/planner | |

**User's choice:** Vazio limpo, sem erro visível

---

## Claude's Discretion

- Nome exato da função de leitura no repository.
- Forma do mapeamento do `assistantPayload` de volta para o shape de cada tool.
- Mecânica do diálogo de confirmação (modal vs. confirm nativo).
- Como a page.tsx injeta exchanges iniciais e seletores restaurados.

## Deferred Ideas

- File Analysis no histórico persistente — fora do escopo (privacidade).
- Multi-turn LLM context — Phase 8.
- GET /api/conversations/[tool] — não necessário (prefetch cobre).
- Busca/filtro no histórico — Future.
- Export de conversas — Future.
- Conversas compartilháveis — v2.
