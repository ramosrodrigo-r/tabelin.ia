# Phase 20: Protocolo de Mutação Chat→Grade & Q&A - Context

**Gathered:** 2026-06-14
**Status:** Ready for planning

<domain>
## Phase Boundary

O chat de IA recebe o estado atual da planilha (colunas, tipos, amostra de linhas) e retorna operações estruturadas que são aplicadas diretamente à grade aberta — com suporte a undo (desfazer) via Ctrl+Z — ou responde dúvidas analíticas em texto formatado no painel lateral; tudo suportando streaming e um fallback de fixture local caso a `OPENAI_API_KEY` esteja ausente.

Esta fase abrange a conexão ponta-a-ponta entre o chat de IA e a planilha viva.

Requisitos cobertos: **CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, LOC-01**.
</domain>

<decisions>
## Implementation Decisions

### Ingestão de Contexto
- **D-01:** **Planilha Completa no Contexto:** O cliente enviará o estado completo atual da planilha (`spec` contendo título, colunas, tipos e todas as linhas) a cada chamada da API do chat. Como o limite máximo de linhas é 200 (garantido pela ingestão na Phase 19), enviar toda a planilha como JSON ou Markdown no prompt garante precisão total nas edições/análises da IA.

### Aplicação de Mutações (Operações na Planilha)
- **D-02:** **Zero-Click com Desfazer:** Quando o intent for `sheet_operation` e o stream terminar, as alterações propostas pela IA (um novo `TableSpecPayload` completo) serão aplicadas imediatamente à grade viva (Zero-click) via `setSpec(payload)`. Como o `WorkspaceStateProvider` já possui histórico de undo/redo integrado, a chamada de `setSpec` adiciona o estado anterior ao histórico, permitindo que o usuário reverta facilmente a mutação pressionando Ctrl+Z ou os controles visuais.

### Localização de Fórmulas
- **D-03:** **Localização Bidirecional / Geração em Inglês:** O LLM será instruído a gerar fórmulas sempre no padrão US/inglês (ex.: separador `,` e funções como `SUM`, `IF`, `VLOOKUP`). O BFF/frontend traduzirá essas fórmulas dinamicamente para o padrão brasileiro (pt-BR com `;` e funções como `SOMA`, `SE`, `PROCV`) antes de atualizá-las na planilha viva. Isso aumenta drasticamente a taxa de sucesso e a confiabilidade de geração da IA.

### Respostas de Q&A (Perguntas Analíticas)
- **D-04:** **Markdown Puro em Streaming:** Respostas para perguntas que não alteram a planilha (intent `qa`) serão renderizadas puramente como texto formatado em Markdown com streaming direto no chat. Não haverá cards ou elementos de métrica destacados adicionais nesta fase, priorizando velocidade e simplicidade.

### Provedor de Fixture Sem Chave
- **D-05:** **Mock Local Sem API Key:** Na ausência de `OPENAI_API_KEY` no ambiente, o endpoint `/api/chat/unified` responderá de forma determinística por meio de um provedor de fixture local que simula o streaming de NDJSON com os eventos apropriados (`intent_detected`, `delta`, `complete`) correspondentes à intenção do usuário, mantendo a localização de fórmulas intacta para testes/desenvolvimento sem custos.

### Claude's Discretion
- As instruções detalhadas e prompts do sistema (incluindo diretivas de formato JSON para `table_spec` e exemplos few-shot) ficam a critério do planejador/implementador.
- A implementação exata da função de inversão de mapeamento de fórmulas (inglês → português) a partir das chaves existentes in `formula-locale.ts`.
- Os payloads de mock específicos a retornar em ambiente de teste/dev sem `OPENAI_API_KEY` com base no prompt enviado.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos do milestone
- [PRD-MILESTONE-PLANILHA-VIVA.md](file:///home/rodrigo/tabelin.ia/PRD-MILESTONE-PLANILHA-VIVA.md) — Requisitos de produto v3.0, especialmente **RF-03** (mutação via chat, §7) e **RF-04** (perguntas analíticas, §7).
- [.planning/REQUIREMENTS.md](file:///home/rodrigo/tabelin.ia/.planning/REQUIREMENTS.md) — Lista de requisitos **CHAT-01..06** e **LOC-01** (linhas 27-45).
- [.planning/ROADMAP.md](file:///home/rodrigo/tabelin.ia/.planning/ROADMAP.md) — Critérios de sucesso e metas da Phase 20 (linhas 315-329).
- [.planning/STATE.md](file:///home/rodrigo/tabelin.ia/.planning/STATE.md) — Alinhamento de riscos e checkpoint do classificador binário (linhas 70-71, 113).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [workspace-state-context.tsx](file:///home/rodrigo/tabelin.ia/apps/web/src/components/app/workspace-state-context.tsx) — Expõe `useWorkspaceState` que contém o `spec` (estado atual) e a função `setSpec` para atualizar a planilha e registrar no histórico de undo.
- [formula-locale.ts](file:///home/rodrigo/tabelin.ia/packages/shared/src/table/formula-locale.ts) — Mapa de tradução `PT_BR_TO_EN` que pode ser invertido para traduzir do inglês para português.
- [use-formula-engine.ts](file:///home/rodrigo/tabelin.ia/apps/web/src/features/unified-chat/hooks/use-formula-engine.ts) — Executa e calcula as fórmulas pt-BR no cliente. Mostra que fórmulas são modeladas a nível de coluna (tipo `formula` com template `formula`).

### Established Patterns
- [route.ts](file:///home/rodrigo/tabelin.ia/apps/web/src/app/api/chat/unified/route.ts) — Rota da API que classifica a intenção (`sheet_operation` ou `qa`) e responde em stream NDJSON.
- [use-unified-chat-stream.ts](file:///home/rodrigo/tabelin.ia/apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts) — Hook de controle do stream de chat unificado no cliente.

### Integration Points
- O cliente (`use-unified-chat-stream.ts` ou `unified-chat-tool.tsx`) deve consumir a planilha atual via `useWorkspaceState().spec` e enviá-la como campo `specOverride` ou equivalente na requisição do chat.
- Ao receber o evento `complete` no cliente, se o payload retornado for do tipo `table_spec`, deve-se chamar `context.setSpec(payload)` para atualizar a planilha viva.
</code_context>

<specifics>
## Specific Ideas

- Interface fluida: quando o usuário pede "ordene por data", a IA classifica como `sheet_operation`, responde no chat e, ao concluir, a planilha se auto-ordena na esquerda. Caso o usuário queira reverter, Ctrl+Z desfaz a operação na hora.
</specifics>

<deferred>
## Deferred Ideas

- **Metric Cards no Chat:** Cards visuais destacados para respostas analíticas em Q&A.
- **Divisória lateral arrastável:** Redimensionamento flexível da grade vs. chat (mantido com proporção fixa de 70/30 da Phase 16).
- **Persistência da planilha + conversa:** Escopo da Phase 21.
</deferred>

---

*Phase: 20-protocolo-de-muta-o-chat-grade-q-a*
*Context gathered: 2026-06-14*
