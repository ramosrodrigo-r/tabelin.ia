# Phase 21: Export & Persistência da Planilha+Conversa - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-14  
**Phase:** 21-Export & Persistência da Planilha+Conversa  
**Areas discussed:** Persistência do Estado da Planilha Viva, Carregamento Inicial (No-Flash UX), Persistência e Recuperação do Histórico de Conversa, Comportamento ao Limpar Histórico (Nova Conversa).

---

## Persistência do Estado da Planilha Viva

| Option | Description | Selected |
|--------|-------------|----------|
| Salvar no banco (ConversationExchange com kind `unified_table`) | Toda vez que o estado da planilha muda (edição, importação, IA, reset), um auto-save debancado (ex.: 1.5s) envia o estado (`TableSpecPayload`) para persistir no banco sob o kind `unified_table`. | ✓ |
| Salvar apenas no LocalStorage | Persistir o estado da planilha apenas no localStorage do navegador. | |
| Salvar em tabela dedicada do banco | Criar uma tabela separada `UserSpreadsheet` no banco de dados Prisma e rodar migrations correspondentes. | |

**User's choice / Design alignment:** Salvar no banco usando a partição `userId` + `toolKind: "unified_table"` em `ConversationExchange`.  
**Notes:** Como o roadmap v2.0 previu explicitamente o kind `"unified_table"` na tabela `ConversationExchange` sem necessidade de novas migrations Prisma (evitando o risco de alterar esquemas e garantindo compatibilidade reversa imediata), esta é a opção ideal. O auto-save é debancado no cliente para evitar excesso de requisições durante digitação em células.

---

## Carregamento Inicial (No-Flash UX)

| Option | Description | Selected |
|--------|-------------|----------|
| Server-Side Fetch (Direct DB) | O `WorkspaceLayout` (Server Component) busca o spec ativo e o histórico diretamente do banco e injeta como prop inicial. Sem loaders ou flash de estado padrão. | ✓ |
| Client-Side Fetch (useEffect) | O componente monta com `SAMPLE_SPEC` padrão e dispara um `fetch` client-side no `useEffect` para carregar o estado salvo, atualizando a grade. | |

**User's choice / Design alignment:** Server-Side Fetch (Direct DB).  
**Notes:** O Next.js App Router permite carregar os dados diretamente no servidor no componente `WorkspaceLayout` e passar como `initialSpec` / `initialExchanges`. Isso elimina o "flash de carregamento" (onde o usuário veria a planilha de exemplo antes que seus próprios dados fossem carregados), proporcionando uma experiência instantânea e profissional.

---

## Persistência e Recuperação do Histórico de Conversa

| Option | Description | Selected |
|--------|-------------|----------|
| Carregar histórico filtrado por `sheet_operation` e `qa` | O endpoint e a inicialização buscam mensagens da tabela `ConversationExchange` onde `toolKind` está em `["sheet_operation", "qa"]`. | ✓ |
| Carregar todo o histórico independentemente de kind | Carregar todos os registros históricos do usuário sem filtrar o kind. | |

**User's choice / Design alignment:** Carregar histórico filtrado por `sheet_operation` e `qa`.  
**Notes:** O chat unificado v3.0 opera apenas nos modos `sheet_operation` e `qa`. Filtrar por esses dois kinds garante que o histórico recuperado contenha apenas mensagens relevantes ao workspace unificado atual, ignorando lixos legados de tools antigos removidos.

---

## Comportamento ao Limpar Histórico (Nova Conversa)

| Option | Description | Selected |
|--------|-------------|----------|
| Resetar chat E planilha | Ao clicar em "Apagar histórico", tanto o chat quanto a planilha ativa são apagados (a planilha no banco é deletada e na tela retorna ao `SAMPLE_SPEC`). | ✓ |
| Resetar apenas o chat, manter a planilha ativa | Apagar o histórico de mensagens do chat no banco e na tela, mas manter a planilha viva no estado atual. | |

**User's choice / Design alignment:** Resetar chat E planilha.  
**Notes:** "Nova conversa" no topo da tela indica começar um novo trabalho do zero. Deletar os registros do banco (incluindo o kind `unified_table`) e disparar o reset client-side via `workspaceState.resetToSeed()` alinha perfeitamente o comportamento da UI com o estado do banco.

---

## Claude's Discretion

- A janela exata de debounce no auto-save (definida em 1.5 segundos para ótimo equilíbrio de performance/UX).
- A lógica de deduplicação e checagem de igualdade profunda (stringification rápida) para não salvar estados repetidos ou o estado inicial no mount.
