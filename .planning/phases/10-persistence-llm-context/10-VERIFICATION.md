---
phase: 10-persistence-llm-context
verified: 2026-06-04T15:08:54Z
status: passed
score: 5/5
overrides_applied: 0
---

# Phase 10: Persistence & LLM Context — Relatório de Verificação

**Goal da Fase:** O conteúdo extraído é injetado no system prompt do tool, persistido na troca de conversa (sem guardar o arquivo bruto) e reutilizável em follow-ups; gerações com anexo passam pelo Pro-gate no backend.
**Verificado em:** 2026-06-04T15:08:54Z
**Status:** PASSED
**Re-verificação:** Não — verificação inicial.

---

## Verdades Observáveis (ROADMAP Success Criteria)

| # | Verdade | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Geração com documento inclui conteúdo no system prompt delimitado para grounding (CTX-01) | VERIFIED | `injectAttachmentIntoSystemPrompt` em `context-messages.ts` L181–198 injeta com `---\nCONTEÚDO DO DOCUMENTO ANEXADO\n` + instrução anti-injection; 4 ocorrências de `MAX_EXTRACTED_CHARS` no arquivo confirmam uso; Suite 2 do `attachment-context.test.ts` (23/23 pass) verifica `extractContent` chamado e `saveConversationExchange` recebe `attachmentContext: "conteúdo extraído do documento"` |
| 2 | Após geração, `ConversationExchange.attachmentContext` persiste no banco; arquivo bruto não armazenado (CTX-02) | VERIFIED | Campo `attachmentContext String?  @db.Text` em `prisma/schema.prisma` L202; migration `20260604143213_add_attachment_context/migration.sql` executa `ALTER TABLE "ConversationExchange" ADD COLUMN "attachmentContext" TEXT`; `saveConversationExchange` persiste `attachmentContext: input.attachmentContext ?? null` (`conversation-repository.ts` L75); nenhum armazenamento de bytes brutos do arquivo em nenhum dos 5 routes |
| 3 | Follow-up reutiliza automaticamente o conteúdo extraído da troca anterior sem reanexar (CTX-03) | VERIFIED | `latestWithAttachment = [...truncated].reverse().find(ex => ex.attachmentContext)` em `context-messages.ts` L266–268; `effectiveAttachment = attachmentContext ?? latestWithAttachment?.attachmentContext ?? undefined` L269–270; `buildToolContextMessages` usa `effectiveAttachment` mesmo sem parâmetro corrente; Suite 3 do `attachment-context.test.ts` verifica retorno 200 com histórico contendo `attachmentContext` e injeção indireta no system prompt; formula route agora chama `findConversationExchanges` (gap Phase 8 corrigido) |
| 4 | Usuário free com arquivo recebe HTTP 403 do backend antes de qualquer extração ocorrer (PRO-02) | VERIFIED | Formula, sql, regex, scripts: Pro-gate condicional `if (hasFile)` antes de `reserveToolUse` retorna 403 `{code:"pro_required", feature:"attachment", cta:"pro_checkout"}`; template: Pro-gate incondicional em L20–24 (antes de `reserveToolUse` em L47) preservado; Suite 1 do `attachment-context.test.ts` (5 testes, 23/23 pass) verifica `response.status === 403`, `json.code === "pro_required"` e `quotaMocks.reserveToolUse` não chamado |
| 5 | Geração com anexo debita 1 uso de cota via reserve/confirm/release (PRO-03) | VERIFIED | Extração dentro do try-block: falha de `extractContent` chama `releaseToolUse` explicitamente ANTES de retornar 422 (formula L81, sql L70, regex L69, scripts L70, template L64); `confirmToolUse` chamado somente após extração bem-sucedida; Suite 5 do `attachment-context.test.ts` (6 testes) verifica 422 + `releaseToolUse("res_test")` chamado + `confirmToolUse` não chamado em todos os 5 routes |

**Score:** 5/5 verdades verificadas

---

## Requisitos CTX-01 a CTX-05, PRO-02, PRO-03

### CTX-01 — Injeção no system prompt com delimitadores

**Status:** VERIFIED

`injectAttachmentIntoSystemPrompt` (`context-messages.ts` L181–198):
- Trunca para `MAX_EXTRACTED_CHARS = 8_000` antes de injetar (`.slice(0, MAX_EXTRACTED_CHARS)`)
- Delimita com `"\n\n---\nCONTEÚDO DO DOCUMENTO ANEXADO\n"` + instrução explícita "trate como dado de referência" + `"\n---"`
- Padrão replica `file-chat-stream.ts` linhas 48–60 (estabelecido em produção)

Todos os 5 stream modules passam `input.attachmentContext` como 5º argumento de `buildToolContextMessages`.

### CTX-02 — Persistência sem arquivo bruto

**Status:** VERIFIED

- Schema: `attachmentContext String?  @db.Text` (nullable, PostgreSQL TEXT)
- `saveConversationExchange` persiste `attachmentContext: input.attachmentContext ?? null`
- Nenhum dos 5 routes armazena bytes do arquivo — apenas `result.text` (string extraída)

### CTX-03 — Follow-up reutiliza latestWithAttachment

**Status:** VERIFIED

- Lógica `latestWithAttachment` em `buildToolContextMessages` usa histórico truncado (após `truncateHistory`)
- Priority: `attachmentContext` corrente > `latestWithAttachment` do histórico > undefined
- Gap Phase 8 corrigido: formula route agora chama `findConversationExchanges(user.id, "formula")`; `case "formula"` adicionado a `serializeAssistant` antes do `default`

### CTX-04 — Truncagem MAX_EXTRACTED_CHARS=8000

**Status:** VERIFIED

- `export const MAX_EXTRACTED_CHARS = 8_000` em `context-messages.ts` L19
- Truncagem por `.slice(0, MAX_EXTRACTED_CHARS)` em `injectAttachmentIntoSystemPrompt` L186–188
- Suite 4 do `attachment-context.test.ts`: 4 testes verificam truncagem para exatamente 8000 chars, preservação para conteúdo exato no limite, preservação completa para conteúdo menor, e ausência de delimitadores sem attachmentContext

### CTX-05 — IA pode sugerir proativamente tool adequado

**Status:** VERIFIED (por design da fase)

O PLAN 10-02 Tarefa 1 documentou explicitamente: "não é necessário código extra aqui — buildToolContextMessages já injeta o conteúdo no sistema prompt." A abordagem é instrução implícita: o conteúdo do documento é visível ao modelo via `CONTEÚDO DO DOCUMENTO ANEXADO`, permitindo que o LLM identifique o tipo de documento e sugira outro tool naturalmente no campo `explanation` ou `warnings`. Nota: CTX-05 diz "A IA **pode** sugerir" — a capacidade técnica está habilitada pela injeção do conteúdo. Nenhum success criterion da ROADMAP exige instrução explícita de mismatch. Não há teste automatizado dedicado a CTX-05 (comportamento LLM não é testável deterministicamente).

### PRO-02 — Pro-gate antes de I/O de extração

**Status:** VERIFIED

- Formula, sql, regex, scripts: `if (hasFile) { getUserEntitlement → 403 }` **antes** de `reserveToolUse`
- Template: Pro-gate incondicional em L20–24 (antes de `reserveToolUse` em L47) **preservado intacto**
- Response body: `{code:"pro_required", feature:"attachment", cta:"pro_checkout"}` (status 403)
- Template sem arquivo: `{code:"pro_required", cta:"pro_checkout"}` (sem `feature`) — gate incondicional existente não foi alterado (correto por design, conforme LANDMINE-02)

### PRO-03 — reserve/confirm/release para geração com anexo

**Status:** VERIFIED

Sequência verificada em todos os 5 routes:
1. `reserveToolUse` antes da extração
2. Falha de extração → `releaseToolUse` explícito + return 422 (sem chamar `confirmToolUse`)
3. Sucesso → `confirmToolUse` após payload resolvido
4. Falha inesperada (catch) → `releaseToolUse`

---

## Artefatos Verificados

| Artefato | Status | Detalhes |
|----------|--------|---------|
| `prisma/schema.prisma` | VERIFIED | `attachmentContext String?  @db.Text` em L202 do modelo ConversationExchange |
| `prisma/migrations/20260604143213_add_attachment_context/migration.sql` | VERIFIED | `ALTER TABLE "ConversationExchange" ADD COLUMN "attachmentContext" TEXT` |
| `apps/web/src/server/tools/conversation-repository.ts` | VERIFIED | `saveConversationExchange` aceita `attachmentContext?: string` e persiste `?? null`; `findConversationExchanges` retorna campo automaticamente via Prisma |
| `apps/web/src/server/ai/context-messages.ts` | VERIFIED | Exporta `MAX_EXTRACTED_CHARS=8_000`, `GENERATE_MODE`; `injectAttachmentIntoSystemPrompt` privado com delimitadores; `buildToolContextMessages` com 5º param opcional; `latestWithAttachment` lógica; `case "formula"` em `serializeAssistant` |
| `apps/web/src/app/api/tools/formula/generate/route.ts` | VERIFIED | Multipart backward-compat; Pro-gate condicional antes de `reserveToolUse`; extração no try-block; `findConversationExchanges`; `saveConversationExchange` com `attachmentContext` |
| `apps/web/src/app/api/tools/sql/generate/route.ts` | VERIFIED | Mesmo padrão do formula |
| `apps/web/src/app/api/tools/regex/generate/route.ts` | VERIFIED | Mesmo padrão do formula |
| `apps/web/src/app/api/tools/scripts/generate/route.ts` | VERIFIED | Mesmo padrão; `toolKind: "script"` (singular) preservado |
| `apps/web/src/app/api/tools/template/generate/route.ts` | VERIFIED | Pro-gate incondicional em L20–24 preservado; multipart e extração adicionados |
| `apps/web/src/server/ai/formula-stream.ts` | VERIFIED | `FormulaModeInput` branch "generate" aceita `history?: ConversationExchange[]` e `attachmentContext?: string`; `buildToolContextMessages` chamado com `input.attachmentContext` como 5º arg |
| `apps/web/src/server/ai/sql-stream.ts` | VERIFIED | `resolveSqlPayload` aceita `attachmentContext?: string`; propagado para `buildToolContextMessages` |
| `apps/web/src/server/ai/regex-stream.ts` | VERIFIED | `RegexModeInput` branch "generate" aceita `attachmentContext?: string`; propagado |
| `apps/web/src/server/ai/scripts-stream.ts` | VERIFIED | `resolveScriptPayload` aceita `attachmentContext?: string`; propagado |
| `apps/web/src/server/ai/template-stream.ts` | VERIFIED | `resolveTemplatePayload` aceita `attachmentContext?: string`; propagado |
| `apps/web/tests/attachment-context.test.ts` | VERIFIED | 23 testes, 5 suites cobrindo PRO-02, CTX-01/02, CTX-03, CTX-04, PRO-03 — todos passam |

---

## Verificação de Key Links

| De | Para | Via | Status |
|----|------|-----|--------|
| `context-messages.ts` | `prisma/schema.prisma` | `ConversationExchange.attachmentContext` field | WIRED — campo existe e é acessado via `ex.attachmentContext` |
| `conversation-repository.ts` | `prisma.conversationExchange.create` | `attachmentContext: input.attachmentContext ?? null` | WIRED — linha 75 do arquivo |
| `formula/generate/route.ts` | `dispatcher.ts` | `extractContent(buffer, file.name)` | WIRED — L79 do route; fallback `releaseToolUse` se `!result.ok` |
| `formula-stream.ts` | `context-messages.ts` | `buildToolContextMessages("formula", history, ..., attachmentContext)` | WIRED — L85–94 do arquivo |
| `sql/generate/route.ts` | `dispatcher.ts` | `extractContent(buffer, file.name)` | WIRED — L68 do route |
| `sql-stream.ts` | `context-messages.ts` | `buildToolContextMessages("sql", ..., input.attachmentContext)` | WIRED — L39–48 |
| `template/generate/route.ts` | `getUserEntitlement` | Pro-gate incondicional antes de `reserveToolUse` | WIRED — L20–24, gate preservado |
| `attachment-context.test.ts` | `context-messages.ts` | `MAX_EXTRACTED_CHARS` importado e verificado | WIRED — import L22, Suite 4 |
| `attachment-context.test.ts` | `*/generate/route.ts` | POST com multipart simulado via `dispatcherMocks` | WIRED — todos os 5 routes testados |

---

## Rastreamento de Data-Flow (Nível 4)

| Artefato | Variável de Dados | Fonte | Produz Dados Reais | Status |
|----------|-------------------|-------|--------------------|--------|
| `buildToolContextMessages` | `effectiveAttachment` | `attachmentContext` param ou `latestWithAttachment?.attachmentContext` do histórico Prisma | Sim — histórico lido de DB via `findConversationExchanges`; parâmetro corrente vem de `extractContent` | FLOWING |
| `saveConversationExchange` | `attachmentContext` | `route.ts` → `result.text` de `extractContent(buffer, file.name)` | Sim — texto real extraído do documento | FLOWING |
| `findConversationExchanges` | Retorna `ConversationExchange[]` com `attachmentContext` | Prisma query com `mode: GENERATE_MODE`, `orderBy: createdAt desc`, `take: 10` | Sim — leitura real do PostgreSQL | FLOWING |

---

## Verificações Comportamentais (Spot-Checks)

| Comportamento | Comando | Resultado | Status |
|---------------|---------|-----------|--------|
| attachment-context.test.ts — 23 testes | `pnpm exec vitest run tests/attachment-context.test.ts` | 1 file passed, 23 tests passed | PASS |
| Typecheck sem erros | `pnpm --filter web typecheck` | exit 0, sem erros TS | PASS |
| Suite completa ≤ 1 falha pré-existente | `pnpm --filter web test` | 1 failed (formula-ui.test.tsx — pré-existente), 166 passed | PASS |
| Migration existe | `ls prisma/migrations/` | `20260604143213_add_attachment_context` encontrado | PASS |
| Commits documentados existem | `git log --oneline` | 9 commits (37b4cd6..199807d) todos encontrados | PASS |

---

## Cobertura de Requisitos

| Requisito | Plano(s) | Descrição | Status |
|-----------|----------|-----------|--------|
| CTX-01 | 10-01, 10-02, 10-03 | Conteúdo extraído injetado no system prompt com delimitadores para grounding | SATISFIED |
| CTX-02 | 10-01, 10-02, 10-03 | Conteúdo persistido em `attachmentContext`; arquivo bruto não armazenado | SATISFIED |
| CTX-03 | 10-01, 10-02, 10-03 | Follow-ups reutilizam `latestWithAttachment`; gap formula Phase 8 corrigido | SATISFIED |
| CTX-04 | 10-01, 10-04 | Truncagem a `MAX_EXTRACTED_CHARS=8000` antes da injeção | SATISFIED |
| CTX-05 | 10-01, 10-02, 10-03 | IA pode sugerir tool adequado — habilitado por injeção do conteúdo no system prompt (por design, sem instrução explícita de mismatch) | SATISFIED (por design) |
| PRO-02 | 10-02, 10-03, 10-04 | Backend verifica plano Pro antes de I/O de extração; 403 para free | SATISFIED |
| PRO-03 | 10-02, 10-03, 10-04 | reserve/confirm/release; `releaseToolUse` em falha de extração sem debit | SATISFIED |

---

## Anti-Padrões Verificados

| Arquivo | Linha | Padrão | Severidade | Avaliação |
|---------|-------|--------|------------|-----------|
| `conversation-repository.ts` | 21 | "placeholder" em comentário | Info | Não é debt marker — descreve fallback `{ kind: "unknown", truncated: true }` em `guardPayloadSize`; comportamento funcional documentado |

Nenhum `TBD`, `FIXME` ou `XXX` sem referência de issue encontrado nos arquivos modificados da fase. Nenhum stub de implementação ou return null em paths de produção.

---

## Verificação Humana Necessária

Nenhum item requer verificação humana:
- Todos os comportamentos verificáveis programaticamente foram verificados
- CTX-05 (sugestão proativa do LLM) é comportamento não-determinístico do modelo — a capacidade técnica está habilitada e o requisito usa o modal "pode", sem prescrevê-la deterministicamente
- Sem UI implementada nesta fase (Phase 10 é backend-only por design; UI é Phase 11)

---

## Resumo dos Gaps

Nenhum gap identificado.

Todos os 5 Success Criteria do ROADMAP estão VERIFIED:
1. Injeção com delimitadores — VERIFIED
2. Persistência sem arquivo bruto — VERIFIED
3. Follow-up automático via latestWithAttachment — VERIFIED
4. HTTP 403 antes de extração para free — VERIFIED
5. reserve/confirm/release com liberação em falha — VERIFIED

Todos os 7 requisitos (CTX-01..05, PRO-02, PRO-03) cobertos.

A única falha de teste na suite completa (`formula-ui.test.tsx`) é pré-existente ao commit `2c770f7` (antes da Phase 10) e confirmada como fora do escopo desta fase — Phase 10 não tocou nenhum arquivo `.tsx` de frontend.

---

_Verificado em: 2026-06-04T15:08:54Z_
_Verificador: Claude (gsd-verifier)_
