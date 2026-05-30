# Phase 8: Multi-turn LLM Context - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Injetar o histórico de conversa já persistido (Phase 6/7) como mensagens de contexto (`role:user`/`role:assistant`) nas chamadas ao LLM dos tools de texto que de fato chamam o LLM — **SQL, Regex, Scripts e Template** — tornando follow-ups funcionais sem o usuário repetir o contexto. Inclui a leitura do histórico no route handler, a serialização dos exchanges salvos em mensagens, e a truncagem automática (teto de trocas + guarda de tokens) para não estourar o limite do modelo. O isolamento por tool (MULTI-03) vem do filtro `userId+toolKind`.

Escopo: leitura das últimas N trocas via repository → serialização concisa por tool → montagem do array `messages` (system + histórico + prompt atual) → guarda de truncagem → chamada ao LLM, nos 4 tools que chamam OpenAI.

Fora do escopo:
- **Formula** — usa fixture determinístico (`formula-stream.ts` não chama o LLM); injetar contexto nele não teria efeito. Fiá-lo ao LLM real é mudança de capacidade, não de contexto — deferido (ver `<deferred>`).
- **Modos `explain`** (Formula/Regex) — ação isolada sobre conteúdo colado, sem thread conversacional.
- **File Analysis** — já tem multi-turn próprio (`buildFileChatMessages` com `history`) e permanece efêmero por privacidade (D-07 da Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Escopo: tools e modos
- **D-01:** Multi-turn aplica-se apenas aos tools que já chamam `openai.chat.completions.create`: **SQL, Regex, Scripts, Template**. Cada um já monta `messages: [system, user]`; esta fase insere o histórico entre o `system` e o `user` atual.
- **D-02:** **Formula fica fora.** `resolveFormulaPayload` retorna um fixture determinístico e nunca chama o LLM, então injetar contexto não produziria efeito real. Fiar o Formula a uma chamada LLM real é uma mudança de capacidade (geração real vs. fixture), com impacto em latência/custo/testes e na restrição de streaming em 2,5s — tratada como lacuna deferida (ver `<deferred>`).
- **D-03:** Apenas modos **`generate`** recebem contexto multi-turn. Modos **`explain`** (Formula/Regex) são ações isoladas sobre conteúdo colado — não entram no thread de contexto.

### Serialização do histórico
- **D-04:** O `userPrompt` (string) de cada exchange vira mensagem `role:user` diretamente.
- **D-05:** A resposta do assistente é serializada por um **serializador conciso por tool**: extrai apenas o **artefato principal + explicação curta** do `assistantPayload` (ex.: SQL → `query` + 1 linha de `explanation`; Regex → `pattern` + `explanation`). **Não** inclui `metadata`, `warnings`, nem o JSON cru — isso reduz tokens e evita que o modelo imite o formato JSON na resposta.
- **D-06:** Ordem cronológica ascendente (mais antigo → mais recente) no array `messages`; o prompt atual entra por último como `role:user`. O turno atual **não** é incluído no histórico porque o save só ocorre após o stream completar (Phase 6, D-07) — sem duplicação.

### Truncagem (MULTI-02)
- **D-07:** Estratégia **híbrida**: incluir no máximo as **últimas N=10 trocas** (≈20 mensagens) e, se mesmo assim o orçamento de tokens for excedido, cortar trocas mais antigas até caber. Atende literalmente MULTI-02 ("últimas N trocas quando o total de tokens exceder o limite seguro do modelo") e é previsível no caso comum.
- **D-08:** Estimativa de tokens por **heurística simples (~4 chars/token)** com margem conservadora — sem nova dependência de tokenizer. Suficiente para uma guarda de segurança. Modelo base atual: `gpt-5-mini` (`OPENAI_MODEL`).

### Fallback e bordas
- **D-09:** Erro de leitura do histórico → **seguir sem contexto** (padrão "skip on error" das fases 6/7): logar server-side e chamar o LLM só com `system`+`user`. Nunca quebra o fluxo do usuário; no pior caso perde o multi-turn naquela chamada.
- **D-10:** Primeira mensagem (sem histórico) → array `messages` é só `system`+`user`, idêntico ao comportamento single-turn atual. Empty state sem tratamento especial.
- **D-11:** Isolamento por tool (MULTI-03) garantido pelo filtro `userId+toolKind` na leitura (`findConversationExchanges`, Phase 7). Cada tool injeta apenas seu próprio thread.

### Claude's Discretion
- Nome/assinatura exatos das funções serializadoras por tool e onde vivem (ex.: helper por stream module vs. um módulo de contexto compartilhado).
- Valor exato do limite seguro de tokens e da margem na heurística (researcher/planner calibram com base no modelo).
- Ponto exato de leitura do histórico no route handler (antes de `resolve*Payload`) e como a `history` é passada aos streams (assinatura nova vs. parâmetro opcional, espelhando `buildFileChatStream`).
- Forma de filtrar `explain` na leitura (não persistir como contexto vs. filtrar `mode` na query).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Camada de chamada ao LLM (onde o contexto será injetado)
- `apps/web/src/server/ai/sql-stream.ts` — `resolveSqlPayload` monta `messages:[system,user]` e chama `openai.chat.completions.create`. Ponto de injeção do histórico.
- `apps/web/src/server/ai/regex-stream.ts` — `resolveRegexPayload`; tem `generate` e `explain` (só `generate` recebe contexto, D-03).
- `apps/web/src/server/ai/scripts-stream.ts` — `resolveScriptPayload`; mesmo padrão.
- `apps/web/src/server/ai/template-stream.ts` — `resolveTemplatePayload`; mesmo padrão.
- `apps/web/src/server/ai/file-chat-stream.ts` — **Padrão de referência de multi-turn**: `buildFileChatMessages(schema, history, userMessage)` já constrói `[system, ...history, user]`. Espelhar a forma de montagem do array.
- `apps/web/src/server/ai/openai-client.ts` — `createOpenAIClient()` / `getOpenAIModel()` (default `gpt-5-mini`).
- `apps/web/src/server/ai/formula-stream.ts` — `resolveFormulaPayload` é fixture determinístico, **não** chama o LLM (motivo de D-02). Ler para confirmar o estado antes de decidir qualquer mudança futura.

### Leitura/persistência do histórico (Phase 6/7)
- `apps/web/src/server/tools/conversation-repository.ts` — `saveConversationExchange` + `findConversationExchanges` (leitura por `userId+toolKind`, ordenada por `createdAt`). Fonte do histórico a injetar; aplicar truncagem sobre o resultado.
- `prisma/schema.prisma` — model `ConversationExchange` (`userPrompt`, `assistantPayload Json`, `mode`, `platform`, `dialect`, cap de 50, index `[userId, toolKind, createdAt]`).

### Route handlers (onde a leitura do histórico será adicionada)
- `apps/web/src/app/api/tools/sql/generate/route.ts`
- `apps/web/src/app/api/tools/regex/generate/route.ts` (+ `explain`)
- `apps/web/src/app/api/tools/scripts/generate/route.ts`
- `apps/web/src/app/api/tools/template/generate/route.ts`
- `apps/web/src/app/api/tools/formula/generate/route.ts` — referência do padrão (auth → quota → resolve → save); **não** alterado para multi-turn nesta fase.

### Requisitos e roadmap
- `.planning/REQUIREMENTS.md` — MULTI-01, MULTI-02, MULTI-03 são os requirements desta fase.
- `.planning/ROADMAP.md` §Phase 8 — Goal e success criteria (nota: o exemplo "agora adapte para o Google Sheets" é de Formula; com Formula fora do escopo, ilustrar o critério #1 com um tool que chama o LLM, ex.: SQL "agora faça isso no BigQuery").
- `.planning/phases/06-persistence-layer/06-CONTEXT.md` — D-02 (payload JSON), D-05 (cap por `userId+toolKind`), D-07 (save após stream).
- `.planning/phases/07-frontend-history/07-CONTEXT.md` — D-02 (`findConversationExchanges`), padrão de leitura server-side.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `buildFileChatMessages` (file-chat-stream.ts): template direto de como montar `[system, ...history, user]` com `history.map(role/content)`. Replicar a forma nos 4 tools.
- `findConversationExchanges` (conversation-repository.ts): leitura por `userId+toolKind` já pronta — a fase consome o resultado e aplica truncagem.
- `resolve*Payload` (sql/regex/scripts/template): já recebem o request e montam `messages`; precisam apenas receber a `history` e inseri-la antes do `user`.

### Established Patterns
- **Persist/read on success, skip on error:** repositories retornam vazio + `console.warn` em vez de throw (D-09).
- **IDOR / isolamento por escopo:** toda query filtra por `userId` (+ `toolKind`) — base do MULTI-03 (D-11).
- **Fixture fallback sem `OPENAI_API_KEY`:** cada stream tem um caminho determinístico para dev/test; manter ao adicionar contexto.
- **`messages: [system, user]` → `[system, ...history, user]`:** mudança mínima e localizada por tool.

### Integration Points
- Route handler (`/api/tools/{sql,regex,scripts,template}/generate`) → após auth/quota, ler histórico via `findConversationExchanges(userId, toolKind)` → truncar → passar `history` para `resolve*Payload`.
- `resolve*Payload` → serializa cada exchange (D-05) e injeta no array `messages` antes do prompt atual.
- Serializador por tool ↔ shape do `assistantPayload` salvo (SQL: `query`+`explanation`; Regex: `pattern`+`explanation`; etc.).

</code_context>

<specifics>
## Specific Ideas

- N=10 trocas como teto base; heurística de ~4 chars/token para a guarda; margem conservadora sobre o limite do `gpt-5-mini`.
- A serialização do assistente deve soar como a resposta anterior do assistente em texto natural (artefato + explicação curta), não como JSON — para o modelo dar follow-up coerente sem imitar formato.
- Critério de sucesso #1 do ROADMAP deve ser validado com um tool que chama o LLM (SQL/Regex/Scripts/Template), já que Formula está fora do escopo.

</specifics>

<deferred>
## Deferred Ideas

- **Fiar o Formula ao LLM real** (substituir o fixture determinístico de `formula-stream.ts` por chamada OpenAI + fallback fixture) — pré-requisito para multi-turn no Formula e, antes disso, para geração real de fórmula. Lacuna de produto registrada; candidata a fase própria (impacto em latência, custo, testes e na restrição de streaming em 2,5s).
- **Multi-turn nos modos `explain`** — não há thread conversacional hoje; reavaliar se surgir demanda por "explique a resposta anterior".
- **File Analysis no histórico persistente** — permanece efêmero por privacidade (D-07 da Phase 7).
- **Tokenizer real (tiktoken/gpt-tokenizer)** para contagem exata de tokens — só se a heurística chars/4 se mostrar imprecisa na prática.
- **Busca/filtro/export de histórico** — Future (REQUIREMENTS.md).

None foram dobrados de todos pendentes — discussão permaneceu dentro do escopo da fase.

</deferred>

---

*Phase: 8-multi-turn-llm-context*
*Context gathered: 2026-05-30*
