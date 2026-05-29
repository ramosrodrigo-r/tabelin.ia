---
phase: 06-persistence-layer
verified: 2026-05-29T20:00:00Z
status: human_needed
score: 3/3 success criteria in-scope verified
overrides_applied: 0
gaps: []
deferred:
  - truth: "Endpoints CRUD de conversations respondem com os dados corretos e retornam erro 401 para requisições não autenticadas"
    deferred_to: "Phase 7"
    reason: "Decisão do desenvolvedor (2026-05-29): endpoints GET/DELETE de conversations pertencem à Fase 7 junto com o frontend de histórico. SC4 movido para Fase 7."
human_verification:
  - test: "Verificar que a tabela conversation_exchanges existe no banco PostgreSQL de produção/staging"
    expected: "Tabela existe com colunas id, userId, toolKind, mode, platform, dialect, userPrompt, assistantPayload, createdAt"
    why_human: "npx prisma db push foi executado localmente no worktree do executor. Não há migration file (WR-02 do REVIEW.md) — a existência da tabela em outros ambientes não pode ser verificada por grep"
  - test: "Verificar o comportamento do cap de 50 sob requisições concorrentes (CR-01 do REVIEW.md)"
    expected: "Após 50+ inserts simultâneos para mesmo userId+toolKind, banco deve conter exatamente 50 registros"
    why_human: "A transação usa READ COMMITTED (padrão Prisma), não SERIALIZABLE. O code review (CR-01) documenta que dois requests concorrentes podem ambos ler count=49 e ambos inserir, resultando em 51 registros. Só verificável com teste de carga concorrente real."
---

# Phase 6: Persistence Layer — Verification Report

**Phase Goal:** Persist every AI exchange (user prompt + assistant response) for each tool call with a 50-exchange cap per userId+toolKind, and ensure cascade deletion on user account removal.
**Verified:** 2026-05-29
**Status:** human_needed (SC4 movido para Fase 7 por decisão do desenvolvedor)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Após enviar uma mensagem em qualquer tool, um registro de exchange existe no banco com conteúdo e metadados corretos (plataforma, dialeto, modo) | VERIFIED | 7 route handlers integrados com saveConversationExchange(). Mapeamento verificado no código: formula usa parsed.data.formulaLanguage como dialect, regex/explain usa parsed.data.pattern, scripts usa toolKind "script" sem 's'. |
| SC2 | O banco nunca acumula mais de 50 exchanges por usuário por tool — exchanges antigos são descartados automaticamente | VERIFIED (with caveat) | Lógica count + findMany(take: count-49) + deleteMany + create implementada em conversation-repository.ts:13-41. Funcional em uso sequencial. CAVEAT: o code review interno (CR-01) documenta que sob carga concorrente a transação READ COMMITTED pode violar o cap. Ver Human Verification. |
| SC3 | Ao deletar uma conta de usuário, todos os seus exchanges são removidos em cascade sem registros órfãos | VERIFIED | prisma/schema.prisma:203 — `user User @relation(fields: [userId], references: [id], onDelete: Cascade)` presente no model ConversationExchange. Relação inversa conversationExchanges adicionada ao model User na linha 25. |
| SC4 | Endpoints CRUD de conversations respondem com os dados corretos e retornam erro 401 para requisições não autenticadas | DEFERRED → Fase 7 | Decisão do desenvolvedor (2026-05-29): endpoints GET/DELETE pertencem à Fase 7 junto com o frontend de histórico. Fora do escopo da Fase 6. |

**Score:** 3/4 success criteria verified (SC4 FAILED)

---

## Required Artifacts

### Plano 01

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | model ConversationExchange com cascade delete e index composto | VERIFIED | Existe nas linhas 193-206. Campos: id, userId, toolKind, mode, platform?, dialect?, userPrompt @db.Text, assistantPayload Json @db.Json, createdAt, relação user com onDelete: Cascade, @@index([userId, toolKind, createdAt]) |
| `apps/web/src/server/tools/conversation-repository.ts` | saveConversationExchange() com transação Prisma e cap de 50 | VERIFIED | 46 linhas. Exporta saveConversationExchange(). Usa prisma.$transaction. Implementa count >= 50 → findMany(take: count-49) → deleteMany → create. catch { console.warn; return null }. |

### Plano 02

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `formula/generate/route.ts` | saveConversationExchange com campos corretos | VERIFIED | Linha 9: import. Linha 49-57: call com toolKind="formula", mode="generate", platform, dialect=formulaLanguage, userPrompt=prompt, após confirmToolUse(). |
| `formula/explain/route.ts` | saveConversationExchange com userPrompt=formula | VERIFIED | Linha 9: import. Linha 49-57: call com userPrompt=parsed.data.formula (não prompt — pitfall 5 respeitado). |
| `sql/generate/route.ts` | saveConversationExchange com dialect | VERIFIED | Linha 9: import. Linha 42-49: call com toolKind="sql", dialect=parsed.data.dialect, sem platform. |
| `regex/generate/route.ts` | saveConversationExchange sem platform/dialect | VERIFIED | Linha 9: import. Linha 41-47: call com toolKind="regex", mode="generate", userPrompt=prompt, sem platform/dialect. |
| `regex/explain/route.ts` | saveConversationExchange com userPrompt=pattern | VERIFIED | Linha 9: import. Linha 41-47: call com userPrompt=parsed.data.pattern (pitfall 5 respeitado). |
| `scripts/generate/route.ts` | saveConversationExchange com toolKind="script" | VERIFIED | Linha 9: import. Linha 42-49: call com toolKind="script" (sem 's' — consistente com recordToolRequest() linha 33), dialect=scriptType. |
| `template/generate/route.ts` | saveConversationExchange sem platform/dialect | VERIFIED | Linha 10: import. Linha 49-55: call com toolKind="template", mode="generate", userPrompt=prompt. |
| `apps/web/src/app/api/conversations/route.ts` | Endpoint GET de conversations com guard 401 | MISSING | Diretório /api/conversations não existe. SC4 do ROADMAP não atendido. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| 7 route handlers | conversation-repository.ts | `import { saveConversationExchange } from "@/server/tools/conversation-repository"` | WIRED | grep confirmado nos 7 arquivos. Todos importam na linha 9 ou 10. |
| saveConversationExchange() call | confirmToolUse() call | Posição no fluxo: após confirmToolUse(), antes de return new Response() | WIRED | Verificado por número de linha em todos os 7 handlers. Ex: formula/generate confirmToolUse linha 41, saveConversationExchange linha 49. |
| conversation-repository.ts | prisma/schema.prisma | `prisma.$transaction + prisma.conversationExchange` | WIRED | Prisma Client gerado contém 72 referências a conversationExchange no .prisma/client/index.d.ts. |
| prisma/schema.prisma | PostgreSQL conversation_exchanges | npx prisma db push | HUMAN NEEDED | Push executado localmente pelo executor. Sem migration file — não verificável programaticamente em outros ambientes. |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| conversation-repository.ts | input.assistantPayload | payload = resolveFormulaPayload()/resolveSqlPayload()/etc. | Sim — resultado real do LLM | FLOWING |
| conversation-repository.ts | input.userPrompt | parsed.data.prompt / .formula / .pattern | Sim — campo validado por zod do request | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compila sem erros | `cd apps/web && npx tsc --noEmit` | Exit code 0, sem output de erros | PASS |
| Prisma Client expõe conversationExchange | grep no .prisma/client/index.d.ts | 72 ocorrências de "conversationExchange" | PASS |
| Commits declarados existem | git log --oneline | 39f4992, 9c62b52, b6fdaba, 6360b15 encontrados | PASS |
| Todos os 7 handlers têm import | grep -rl "conversation-repository" apps/web/src/app/api/tools/ | 7 arquivos | PASS |

---

## Requirements Coverage

| Requirement | Plano | Descrição | Status | Evidence |
|-------------|-------|-----------|--------|----------|
| HIST-01 | 06-01, 06-02 | Usuário pode fechar/reabrir workspace e ver exchanges anteriores | PARTIAL | Exchanges são salvos (write half). Sem endpoint GET para leitura, o carregamento ao reabrir não é possível sem Phase 7. A metade "persistência" está completa. |
| HIST-02 | 06-01, 06-02 | Cada exchange salva metadados (plataforma, dialeto, modo) | SATISFIED | Schema tem platform?, dialect?, mode como campos distintos. Todos os handlers passam os valores corretos. |
| HIST-04 | 06-01 | Histórico limitado às últimas 50 trocas por usuário por tool | SATISFIED (com caveat concorrência) | Lógica de cap implementada em conversation-repository.ts. Ver caveat CR-01 em Human Verification. |
| PRIV-01 | 06-01 | Histórico deletado em cascade ao excluir conta | SATISFIED | onDelete: Cascade declarado no schema. Relação inversa no model User. |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| conversation-repository.ts | 42-44 | `catch { console.warn(...) }` sem logar o erro capturado | Warning | Falhas de persistência em produção são invisíveis — sem mensagem de erro, stack trace ou distinção entre timeout e violação de constraint. Documentado em WR-01 do REVIEW.md. Não é BLOCKER (comportamento intencional de fail-silently, per D-08). |

Nota: Nenhum `TBD`, `FIXME`, ou `XXX` encontrado nos arquivos modificados.

---

## Human Verification Required

### 1. Existência da tabela conversation_exchanges no banco

**Test:** Conectar ao banco PostgreSQL e executar `SELECT table_name FROM information_schema.tables WHERE table_name = 'conversation_exchanges';`
**Expected:** Retorna 1 linha com table_name = 'conversation_exchanges'
**Why human:** npx prisma db push foi executado no worktree local do executor. Não existe migration file em prisma/migrations/ (WR-02 do REVIEW.md). A presença da tabela em ambiente de staging ou produção não pode ser verificada por grep.

### 2. Comportamento do cap de 50 sob carga concorrente (CR-01)

**Test:** Enviar 10 requisições simultâneas para o mesmo usuário e toolKind via ferramenta de load test (ex: `hey` ou `k6`), depois verificar count no banco
**Expected:** COUNT nunca excede 50 após qualquer burst de requests
**Why human:** O code review interno (CR-01 em 06-REVIEW.md) documenta que a transação usa READ COMMITTED (padrão PostgreSQL/Prisma), não SERIALIZABLE. Dois requests concorrentes podem ambos ler count=49 e ambos inserir, resultando em count=51. Verificável apenas com teste de carga real. O fix documentado em CR-01 é adicionar `{ isolationLevel: "Serializable" }` ao prisma.$transaction — não foi aplicado.

---

## Gaps Summary

**1 gap bloqueante (SC4 do ROADMAP):**

O Success Criteria 4 do ROADMAP — "Endpoints CRUD de conversations respondem com os dados corretos e retornam erro 401 para requisições não autenticadas" — não foi implementado. Nenhum dos dois planos executados (06-01 e 06-02) incluiu este SC. O repositório intencionalmente expõe apenas escrita (D-08: "Phase 7 adiciona endpoints de leitura"). Entretanto, a Fase 7 foi planejada apenas para carregamento frontend — seus SCs não mencionam criação de endpoints HTTP de leitura explicitamente.

O ROADMAP também marca a Phase 6 no milestone summary como "API CRUD de exchanges" — o que não foi entregue.

**Nota sobre SC4 e Phase 7:** Os planos da Fase 7 são "TBD". Os endpoints GET de conversations são tecnicamente necessários para que o SC1 da Fase 7 seja atingível ("exchanges anteriores aparecem no chat"). É razoável que esses endpoints sejam criados na Fase 7 como parte dos seus planos TBD. No entanto, o ROADMAP os atribui explicitamente à Fase 6 — portanto constituem um gap desta fase.

**Sugestão:** Se o desenvolvedor considera que os endpoints GET/DELETE pertencem à Fase 7 (o que é arquiteturalmente coerente), o SC4 do ROADMAP deve ser movido para a Fase 7 ou explicitamente marcado como "deferred to Phase 7" com uma nota de escopo. Com essa correção, o status da Fase 6 poderia ser reavaliado como passed.

---

_Verified: 2026-05-29T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
