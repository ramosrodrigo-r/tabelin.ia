# Phase 4: Spreadsheet File Analysis - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>

## Phase Boundary

Fase 4 entrega upload de arquivos `.csv` e `.xlsx` (até 5 MB), extração de schema + amostras, chat conversacional multi-turn com contexto do arquivo, resumos pivot e relatórios executivos via botões rápidos, e o ciclo de vida de privacidade completo (sem arquivo raw no banco, sem log de conteúdo, deleção automática por cron).

**Não inclui:** charts/OCR (Fase 5), upload de imagens, múltiplos arquivos simultâneos, export de pivot como CSV/XLSX, integração com Google Drive/OneDrive (v2).

</domain>

<decisions>

## Implementation Decisions

### Armazenamento Temporário

- **D-01:** Upload faz parse em memória imediatamente (csv-parse / xlsx). O binário raw é descartado após a extração. Raw file **nunca** fica em disco, banco, ou storage externo — alinha com PRIV-02.
- **D-02:** Schema extraído (nomes de colunas, tipos inferidos, linhas de amostra) é persistido no Postgres em um novo modelo `UploadedFile`. O usuário pode retomar o chat mesmo após fechar o navegador.
- **D-03:** Limpeza automática via cron job periódico (ex: a cada 15 min) que busca registros `UploadedFile` com `createdAt` ou `lastChatAt` há mais de 1 hora e os deleta (schema + histórico de chat). PRIV-01 garantido sem depender de request do usuário.

### Análise pelo AI

- **D-04:** Parse local com `csv-parse` (CSV) e `xlsx` (npm). Contexto estruturado — schema com nomes, tipos, estatísticas descritivas e 5–10 linhas de amostra — é injetado como texto no system prompt de cada mensagem. Raw file **nunca** é enviado à OpenAI.
- **D-05:** Tipos de colunas são inferidos por heurística local na amostragem: número, data, texto, booleano. AI recebe o schema pré-calculado, não precisa inferir tipos.
- **D-06:** Arquivos `.xlsx` com múltiplas abas apresentam um **seletor de aba** logo após o upload. Usuário escolhe qual aba analisar. Chat inicia após a seleção.

### Modelo de Chat

- **D-07:** Chat é **multi-turn com histórico persistido**. Novo modelo `ChatMessage` no Prisma vinculado ao `UploadedFile`. Conversa acumula contexto — "o que mais?" e referências a mensagens anteriores funcionam.
- **D-08:** Em cada turn, são enviadas ao AI as **últimas 10 mensagens** da conversa + schema completo do arquivo no system prompt. Janela deslizante — histórico mais antigo não é enviado mas permanece no banco.
- **D-09:** **Um arquivo ativo por vez** na ferramenta. Novo upload substitui o arquivo atual e inicia um novo chat. Histórico do arquivo anterior fica no banco (sujeito a limpeza por cron).

### Pivôs e Relatórios

- **D-10:** Pivôs (FILE-04) e relatórios executivos (FILE-05) são acionados por **botões rápidos** fixos abaixo da área de input do chat: `"Resumo Pivô"` e `"Relatório Executivo"`. Aparecem após o upload ser bem-sucedido. O clique envia um prompt especializado automaticamente.
- **D-11:** Output de pivô e relatório entregue como **Markdown formatado** (tabelas, títulos, métricas) com botão de copiar proeminente. Consistente com o padrão copy-ready do workspace.
- **D-12:** Output aparece **inline no chat** como mensagem do assistente, com botão de copiar. Sem painel separado.

### Claude's Discretion

- Estrutura exata do schema serializado no `UploadedFile` (JSON com colunas, tipos, sample rows, sheet info).
- Heurísticas exatas de inferência de tipo (ex: thresholds para detectar data vs texto).
- Número exato de linhas de amostra enviadas ao AI (5–10, ajustar por tamanho de token).
- Frequência exata do cron job de limpeza (15 min sugerido).
- Estrutura de componentes da feature file-analysis (pode espelhar o padrão Formula/Scripts com InputPanel/OutputPanel ou usar layout específico de chat).
- Copy em português para labels, placeholders, e mensagens de erro da ferramenta.
- Schema do `ChatMessage` (role, content, createdAt, toolRequestId opcional).

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope

- `.planning/REQUIREMENTS.md` — Requirements checkáveis: FILE-01 a FILE-05, PRIV-01 a PRIV-04.
- `.planning/ROADMAP.md` — Goal, success criteria, e plan outline da Fase 4.
- `.planning/PROJECT.md` — Contexto Brazil-first, constraints de privacidade e upload limits.
- `PRD.md` — Especificação original de file analysis, personas e MVP priorities.

### Prior Phase Decisions

- `.planning/phases/01-localized-formula-workspace/01-CONTEXT.md` — Server-side AI (D-14), streaming NDJSON (D-16), validação estruturada (D-15), workspace quiet (D-07).
- `.planning/phases/02-freemium-billing-and-entitlements/02-CONTEXT.md` — Quota reservation/confirm/release pattern, Pro entitlement check, upload limits enforcement (QUOT-03).
- `.planning/phases/03-multi-tool-generation-suite/03-CONTEXT.md` — Tool pattern completo (D-03), padrão de route handler (D-05), syntax highlighting e copy button.

### Existing Code Integration Points

- `apps/web/src/components/app/sidebar.tsx` — Slot "File Analysis" desativado (`disabled: true`) — ativar com rota `/workspace/file-analysis`.
- `apps/web/src/server/ai/openai-client.ts` — Cliente OpenAI compartilhado (gpt-5-mini ou `OPENAI_MODEL` env).
- `apps/web/src/server/tools/tool-repository.ts` — Repository genérico de ToolRequest a estender para `toolKind: "file-chat"`.
- `apps/web/src/server/usage/quota-service.ts` — `reserveToolUse` / `confirmToolUse` / `releaseToolUse` já funcionam com qualquer `toolKind`.
- `apps/web/src/app/api/tools/formula/generate/route.ts` — Route handler pattern com quota + auth a seguir.
- `apps/web/src/features/formula/formula-tool.tsx` — Padrão de composição de ferramenta a replicar/adaptar para layout de chat.
- `prisma/schema.prisma` — Modelo `ToolRequest` existente; novos modelos `UploadedFile` e `ChatMessage` precisam ser adicionados.
- `packages/shared/src/index.ts` — Adicionar contratos Zod para upload request, chat request, e schemas de arquivo.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **Route handler pattern** (`app/api/tools/formula/generate/route.ts`): autenticação → parse → quota reserve → AI → confirm → record → stream. Reutilizável para `/api/tools/file-analysis/upload` e `/api/tools/file-analysis/chat`.
- **Quota service** (`server/usage/quota-service`): `reserveToolUse` / `confirmToolUse` / `releaseToolUse` — funciona com `toolKind: "file-chat"` sem mudança de API.
- **ToolRequest model** (Prisma): `toolKind` é string — aceita "file-chat" sem migração obrigatória no campo.
- **OpenAI client** (`server/ai/openai-client.ts`): cliente compartilhado, já configurado com env `OPENAI_API_KEY`.
- **Sidebar slot** já existe com label "File Analysis" — apenas ativar com `href` e remover `disabled`.

### Established Patterns

- Next.js App Router; pages em `apps/web/src/app/(workspace)/workspace/`.
- Server-only logic em `apps/web/src/server/`.
- Shared Zod contracts em `packages/shared/src/`.
- Streaming NDJSON com `content-type: application/x-ndjson`.
- UI com Tailwind CSS functional classes.
- `ToolRequest` persistido após cada tool use bem-sucedido.

### Integration Points

- Criar `apps/web/src/app/(workspace)/workspace/file-analysis/page.tsx`.
- Criar `apps/web/src/features/file-analysis/` com componentes de chat e upload.
- Criar `apps/web/src/app/api/tools/file-analysis/upload/route.ts` e `chat/route.ts`.
- Adicionar modelos `UploadedFile` e `ChatMessage` ao `prisma/schema.prisma`.
- Adicionar shared schemas em `packages/shared/src/`.
- Ativar sidebar slot: remover `disabled: true` e adicionar `href: "/workspace/file-analysis"`.

</code_context>

<specifics>

## Specific Ideas

- O seletor de aba do XLSX deve aparecer como parte do estado pós-upload, antes do chat iniciar — não como um modal separado. Inline na área da ferramenta.
- Os botões "Resumo Pivô" e "Relatório Executivo" devem ser visualmente destacados mas não intrusivos — abaixo do input, estilo chip/button secundário.
- O chat deve mostrar o schema extraído (nomes de colunas e tipos) como uma mensagem de sistema visual antes da primeira mensagem do usuário — para confirmar o que foi detectado.
- Mensagem de boas-vindas do assistente após upload: "Arquivo carregado — {N} colunas detectadas: [lista]. Pode fazer perguntas sobre os dados ou usar os botões abaixo."

</specifics>

<deferred>

## Deferred Ideas

- Export de pivô/relatório como arquivo CSV ou XLSX — scope maior, pertence à Fase 5 ou v2.
- Múltiplos arquivos abertos simultâneos com chats separados — v2 (TEAM/workspace features).
- Modo de comparação entre dois arquivos — v2.
- Integração com Google Drive/OneDrive para importar arquivos — v2 (INTG-01/02 no backlog).

</deferred>

---

*Phase: 04-spreadsheet-file-analysis*
*Context gathered: 2026-05-26*
