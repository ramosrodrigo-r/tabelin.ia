---
phase: 06-persistence-layer
plan: "02"
subsystem: persistence
tags: [route-handlers, conversation-history, saveConversationExchange, integration]
dependency_graph:
  requires:
    - saveConversationExchange() (apps/web/src/server/tools/conversation-repository.ts)
  provides:
    - save de exchange Formula generate (apps/web/src/app/api/tools/formula/generate/route.ts)
    - save de exchange Formula explain (apps/web/src/app/api/tools/formula/explain/route.ts)
    - save de exchange SQL generate (apps/web/src/app/api/tools/sql/generate/route.ts)
    - save de exchange Regex generate (apps/web/src/app/api/tools/regex/generate/route.ts)
    - save de exchange Regex explain (apps/web/src/app/api/tools/regex/explain/route.ts)
    - save de exchange Scripts generate (apps/web/src/app/api/tools/scripts/generate/route.ts)
    - save de exchange Template generate (apps/web/src/app/api/tools/template/generate/route.ts)
  affects:
    - apps/web/src/app/api/tools/ (todos os 7 handlers de geração)
tech_stack:
  added: []
  patterns:
    - saveConversationExchange() chamada após confirmToolUse() e recordToolRequest() em todos os handlers
    - Import de conversation-repository adicionado aos 7 handlers via alias @/server/tools/
    - userPrompt mapeado com campo correto por handler (formula=formula, regex=pattern, outros=prompt)
    - toolKind "script" (sem 's') consistente com recordToolRequest() existente
key_files:
  created: []
  modified:
    - apps/web/src/app/api/tools/formula/generate/route.ts
    - apps/web/src/app/api/tools/formula/explain/route.ts
    - apps/web/src/app/api/tools/sql/generate/route.ts
    - apps/web/src/app/api/tools/regex/generate/route.ts
    - apps/web/src/app/api/tools/regex/explain/route.ts
    - apps/web/src/app/api/tools/scripts/generate/route.ts
    - apps/web/src/app/api/tools/template/generate/route.ts
decisions:
  - "saveConversationExchange inserida APÓS confirmToolUse em todos os handlers — exchanges só persistidos para gerações bem-sucedidas (T-06-07)"
  - "userPrompt usa campo correto por handler: formula/explain=parsed.data.formula, regex/explain=parsed.data.pattern, demais=parsed.data.prompt"
  - "toolKind 'script' (sem 's') consistente com recordToolRequest() existente no scripts handler"
  - "userId sempre vem de user.id (sessão autenticada), nunca do body do request (T-06-06)"
metrics:
  duration: "2m 53s"
  completed: "2026-05-29"
  tasks_completed: 3
  files_modified: 7
---

# Phase 6 Plan 02: Integração de saveConversationExchange nos Route Handlers Summary

saveConversationExchange() integrada nos 7 route handlers de tools com mapeamento correto de campos por handler, ordem garantida após confirmToolUse(), e TypeScript compilando sem erros.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Integrar save nos handlers Formula e SQL | b6fdaba | formula/generate, formula/explain, sql/generate |
| 2 | Integrar save nos handlers Regex, Scripts e Template | 6360b15 | regex/generate, regex/explain, scripts/generate, template/generate |
| 3 | Verificação end-to-end da integração completa | (verificação pura) | — (sem modificações) |

## What Was Built

### Padrão de integração aplicado (uniforme em todos os 7 handlers)

1. **Import adicionado** ao bloco de imports existente de cada handler:
   ```typescript
   import { saveConversationExchange } from "@/server/tools/conversation-repository";
   ```

2. **Chamada inserida** após `confirmToolUse()` / `record*ToolRequest()`, antes do `return new Response(...)`:
   ```typescript
   // NOVO — Phase 6
   await saveConversationExchange({
     userId: user.id,
     toolKind: "...",
     mode: "...",
     // platform/dialect por handler
     userPrompt: parsed.data.CAMPO_CORRETO,
     assistantPayload: payload
   });
   ```

### Mapeamento de campos implementado

| Handler | toolKind | mode | platform | dialect | userPrompt |
|---------|----------|------|----------|---------|------------|
| formula/generate | "formula" | "generate" | parsed.data.platform | parsed.data.formulaLanguage | parsed.data.prompt |
| formula/explain | "formula" | "explain" | parsed.data.platform | parsed.data.formulaLanguage | parsed.data.formula |
| sql/generate | "sql" | "generate" | (omitido) | parsed.data.dialect | parsed.data.prompt |
| regex/generate | "regex" | "generate" | (omitido) | (omitido) | parsed.data.prompt |
| regex/explain | "regex" | "explain" | (omitido) | (omitido) | parsed.data.pattern |
| scripts/generate | "script" | "generate" | (omitido) | parsed.data.scriptType | parsed.data.prompt |
| template/generate | "template" | "generate" | (omitido) | (omitido) | parsed.data.prompt |

### Verificações executadas na Task 3

- `grep -rl "saveConversationExchange" apps/web/src/app/api/tools/ | wc -l` retornou **7**
- `grep -rl "conversation-repository" apps/web/src/app/api/tools/ | wc -l` retornou **7**
- formula/explain: `userPrompt: parsed.data.formula` confirmado
- regex/explain: `userPrompt: parsed.data.pattern` confirmado
- scripts/generate: `toolKind: "script"` confirmado (sem 's')
- `await saveConversationExchange` aparece em linha maior que `await confirmToolUse` em todos os 7 handlers
- `npx tsc --noEmit` retornou exit code 0

## Deviations from Plan

Nenhum. Plano executado exatamente como escrito. Todos os campos e a ordem de chamadas seguiram o mapeamento do 06-PATTERNS.md sem desvios.

## Threat Model Coverage

| Threat ID | Status | Implementation |
|-----------|--------|----------------|
| T-06-05 (auth bypass) | Accepted — guard existente mantido | getSessionFromCookieHeader() permanece inalterado em todos os handlers; userId vem exclusivamente de user.id |
| T-06-06 (IDOR via userId) | Mitigated | userId passado como user.id (sessão autenticada) em todos os 7 handlers; nenhum handler passa userId do body |
| T-06-07 (save antes de confirmToolUse) | Mitigated | saveConversationExchange() inserida APÓS confirmToolUse() em todos os handlers (verificado com grep de linhas) |
| T-06-08 (falha de persistência quebra resposta) | Accepted | try/catch silencioso no conversation-repository.ts absorve exceções; falha de histórico não propaga |
| T-06-SC (npm installs) | Accepted | Nenhum pacote novo instalado; todos os imports usam módulos existentes do projeto |

## Known Stubs

Nenhum stub identificado. As integrações usam dados reais do request e do payload retornado pelo LLM.

## Threat Flags

Nenhuma nova superfície de segurança introduzida. Os handlers existentes foram modificados apenas com adição de import e uma chamada de persistência auxiliar; nenhum novo endpoint, path de auth, ou acesso a arquivo foi criado.

## Self-Check: PASSED

- [x] 7 handlers contêm import de conversation-repository (`grep -rl ... | wc -l` retornou 7)
- [x] 7 handlers contêm saveConversationExchange (`grep -rl ... | wc -l` retornou 7)
- [x] formula/explain usa parsed.data.formula como userPrompt
- [x] regex/explain usa parsed.data.pattern como userPrompt
- [x] scripts/generate usa toolKind "script" (sem 's')
- [x] saveConversationExchange é chamada APÓS confirmToolUse em todos os 7 handlers (verificado por número de linha)
- [x] TypeScript: exit code 0 em npx tsc --noEmit no workspace web
- [x] Commit b6fdaba existe: feat(06-02) formula e sql
- [x] Commit 6360b15 existe: feat(06-02) regex, scripts e template
