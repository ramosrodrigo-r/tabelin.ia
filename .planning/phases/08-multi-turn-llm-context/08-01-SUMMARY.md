---
phase: 08-multi-turn-llm-context
plan: "01"
subsystem: server/ai
tags: [multi-turn, context, serialization, truncation, tdd]
dependency_graph:
  requires: []
  provides:
    - buildToolContextMessages (context-messages.ts)
    - truncateHistory (context-messages.ts)
    - MAX_EXCHANGES (context-messages.ts)
  affects:
    - apps/web/src/server/ai/sql-stream.ts (plan 08-02)
    - apps/web/src/server/ai/regex-stream.ts (plan 08-02)
    - apps/web/src/server/ai/scripts-stream.ts (plan 08-02)
    - apps/web/src/server/ai/template-stream.ts (plan 08-02)
tech_stack:
  added: []
  patterns:
    - "TDD RED→GREEN: testes escritos antes da implementação"
    - "Serialização concisa por tool kind (D-05): artefato + explicação em prosa natural"
    - "Truncagem híbrida: teto N=10 (D-07) + orçamento de tokens chars/4 (D-08)"
    - "Filtro mode='generate' (D-03): exchanges explain descartados"
    - "Skip silencioso para kind desconhecido ou payload malformado (D-09)"
key_files:
  created:
    - apps/web/src/server/ai/context-messages.ts
    - apps/web/tests/context-messages.test.ts
  modified: []
decisions:
  - "SAFE_TOKEN_BUDGET=4000 tokens como orçamento conservador para o histórico, calibrado para gpt-5-mini com margem para system+prompt+resposta"
  - "serializeAssistant retorna null para kind desconhecido e buildToolContextMessages pula o exchange inteiro (par user+assistant omitido)"
  - "truncateHistory aplicada internamente em buildToolContextMessages, antes da serialização — caller (plan 08-02) recebe já truncado"
metrics:
  duration: "18 min"
  completed_date: "2026-05-30"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 8 Plan 01: Context Messages Helper - Resumo

## O que foi construído

Helper compartilhado `context-messages.ts` com serialização concisa por tool + montagem do array de mensagens + truncagem híbrida — o contrato que os 4 stream modules (Plano 02) importarão para injetar contexto multi-turn nas chamadas ao LLM.

## Tarefas executadas

### Task 1: Serializador por tool + montagem do array (RED→GREEN)

**RED (commit `7d8fb79`):** Suite de testes `context-messages.test.ts` escrita com 17 casos cobrindo:
- Serialização SQL, Regex, Scripts, Template — artefato + explicação em prosa natural
- Ausência de `"kind"`, `"metadata"`, `{`, `}` na saída serializada
- Estrutura exata `[system, ...history, user]` e ordem cronológica
- Histórico vazio → `[system, user]` (D-10)
- Filtro de mode `"explain"` (D-03)
- Edge cases: kind desconhecido, campos ausentes

**GREEN (commit `0dd791a`):** Implementação em `context-messages.ts`:
- `serializeAssistant`: discriminação por `kind` → prosa `artefato\n\nexplicação`, retorna `null` para casos inválidos
- `buildToolContextMessages`: filtra por `mode === "generate"`, aplica `truncateHistory`, serializa pares user/assistant, monta array final
- `truncateHistory` e `MAX_EXCHANGES` (Task 2 integrado na mesma entrega)

### Task 2: Truncagem híbrida (RED→GREEN integrado na Task 1)

Implementado no mesmo módulo e coberto pela mesma suite:
- `MAX_EXCHANGES = 10` — teto numérico de trocas (D-07)
- `SAFE_TOKEN_BUDGET = 4000` — orçamento conservador de tokens para histórico
- `estimateTokens`: heurística `Math.ceil(text.length / 4)` (D-08)
- `truncateHistory`: (1) `slice(-10)` → (2) loop removendo trocas mais antigas até `totalTokens <= SAFE_TOKEN_BUDGET`

## Mitigações de segurança aplicadas (threat model)

| Ameaça | Mitigação |
|--------|-----------|
| T-08-01: Prompt injection via histórico | `serializeAssistant` emite apenas artefato + explicação em prosa; descarta `metadata`/`warnings`/`assumptions`/JSON cru. Coberto por teste `expect(content).not.toContain("metadata")` |
| T-08-02: DoS por esgotamento de contexto | `truncateHistory` garante teto de 10 trocas + corte por orçamento de tokens. Coberto por testes com 25 trocas e trocas de 10.000 chars |
| T-08-03: Kind desconhecido | Exchange pulado sem throw; nenhum dado cru vaza para o prompt |

## Resultado dos testes

```
Test Files  1 passed (1)
     Tests  17 passed (17)
```

## Desvios do plano

Nenhum — plano executado exatamente como especificado. Task 2 foi integrada diretamente na implementação da Task 1 (mesmo arquivo, mesma entrega), aproveitando que os testes de truncagem já estavam no mesmo arquivo de teste.

## Stubs conhecidos

Nenhum. O módulo é puro (sem chamadas ao LLM, sem I/O) e todas as funções estão completamente implementadas.

## Self-Check

- `apps/web/src/server/ai/context-messages.ts` existe e exporta `buildToolContextMessages`, `truncateHistory`, `MAX_EXCHANGES`
- `apps/web/tests/context-messages.test.ts` existe com 17 testes verdes
- Commits `7d8fb79` (RED) e `0dd791a` (GREEN) presentes no log

## Self-Check: PASSED
