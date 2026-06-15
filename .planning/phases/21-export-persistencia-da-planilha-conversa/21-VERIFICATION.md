---
phase: 21-export-persistencia-da-planilha-conversa
verified: 2026-06-14T22:35:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 2/5
  gaps_closed:
    - "CR-02: colisão de key derivada em seedToGridState sobrescreve coluna no reload"
    - "WR-04: spec ativo >32KB vira placeholder {truncated:true} e cai no SAMPLE_SPEC"
    - "WR-03: saveActiveSpreadsheetSpec engole o erro; rota sempre 200; save perdido marcado como salvo"
    - "CR-01: resetToSeed dispara auto-save que ressuscita unified_table com SAMPLE_SPEC após o DELETE"
  gaps_remaining: []
  regressions: []
gaps: []
deferred: []
---

# Phase 21: Export & Persistência da Planilha+Conversa — Relatório de Verificação (Re-verificação)

**Phase Goal:** O usuário pode exportar a planilha (CSV/XLSX com fórmulas calculadas, anti-injeção) e tanto a planilha quanto a conversa associada são salvas e recuperadas entre sessões; "Nova conversa" limpa chat e reseta a planilha de forma coerente.
**Verified:** 2026-06-14T22:35:00Z
**Status:** passed
**Re-verification:** Sim — após fechamento de gaps (plano 21-03)

## Resumo da Re-verificação

A verificação anterior retornou **gaps_found (2/5)** com quatro defeitos de perda de dados (CR-01, CR-02, WR-03, WR-04). O plano 21-03 foi executado para fechá-los. Esta re-verificação leu o **código-fonte real** (não as alegações do SUMMARY) e executou as suítes de regressão. **Os quatro gaps estão genuinamente fechados na fonte**, cada um coberto por regressão que exercita o modo de falha real (mockando apenas a fronteira de banco, nunca o helper sob teste). Export (SC1/SC2) e hidratação da conversa (SC4) permanecem verdes — sem regressão. **Status: passed (5/5).**

## Goal Achievement

### Observable Truths (Success Criteria do ROADMAP)

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | Exportar para CSV com valores de fórmula já calculados (não texto) | ✓ VERIFIED | `table-export.ts:buildCsv` consome `displayRows` (valores computados); `sanitizeCellForExport`+quoting RFC 4180. Sem regressão. |
| 2 | Exportar para XLSX com valores calculados + anti-injeção (SEC-04) | ✓ VERIFIED | `buildXlsx` escreve cell-objects `{t:"s", v: sanitizeCellForExport(...)}` (nunca infere fórmula); `DANGEROUS_LEAD=/^[=+\-@\t\r\n]/` cobre os leads perigosos. Sem regressão. |
| 3 | Ao voltar à tela única, a planilha recarrega no estado deixado (seed/upload/IA) | ✓ VERIFIED | **CR-02 FECHADO:** `seedToGridState` (l.39-51) desambigua keys via Set+sufixo, escreve em `newRow[resolvedKey]` (l.58) — colisão preserva ambas as colunas; schema `superRefine` (l.59-72) rejeita keys colidentes. **WR-04 FECHADO:** `guardActiveSpecSize` (l.78-86) LANÇA em oversize (sem placeholder); `MAX_ACTIVE_SPEC_BYTES`=512KB acomoda 200×26 pt-BR. **WR-03 FECHADO:** `saveActiveSpreadsheetSpec` (l.195-220) não tem try/catch que engole — propaga; rota (l.32-38) mapeia para 500; cliente só avança `lastSavedRef` em `res.ok` (l.224-225). |
| 4 | Ao recarregar, a conversa do chat associada recarrega (histórico visível) | ✓ VERIFIED | `page.tsx:18` `findUnifiedConversationExchanges(user.id)` → `initialExchanges` → `<UnifiedChatTool>`; teste D-03 hidrata o thread. Sem regressão. |
| 5 | Export e persistência funcionam p/ seed/branco E upload; "Nova conversa" limpa e reseta coerentemente | ✓ VERIFIED | Export OK p/ qualquer origem (Truth 1/2). Persistência de upload protegida por CR-02/WR-04 (Truth 3). **CR-01 FECHADO:** `resetToSeed` (l.197-200) pré-marca `lastSavedRef` com o specJson do reset ANTES do dispatch → o efeito (l.215) retorna cedo → "Nova conversa" não ressuscita a linha `unified_table` via auto-save. |

**Score:** 5/5 truths verified

### Fechamento dos Gaps (rastreado do baseline anterior)

| Gap | Defeito original | Correção verificada na fonte | Regressão (modo de falha real) |
| --- | ---------------- | ---------------------------- | ------------------------------ |
| CR-02 | `newRow[resolvedKey]` sem dedupe → colisão sobrescreve | `seedToGridState` Set+sufixo (workspace-state-context.tsx l.39-51); `deriveColumnKey` compartilhado; `superRefine` (schema.ts l.59-72) | `workspace-state-context.test.tsx` round-trip de colisão (2 keys distintas, `Set(values).size===2`); `unified-schema.test.ts` 3 casos de unicidade |
| WR-04 | `{truncated:true}` placeholder p/ >32KB → SAMPLE_SPEC | `guardActiveSpecSize` LANÇA (conversation-repository.ts l.78-86); `MAX_ACTIVE_SPEC_BYTES`=512KB | `conversation-repository-active-spec.test.ts`: 200×26 pt-BR intacto (sem `truncated`); oversize `rejects.toThrow` + `create` não chamado — **contra helper real** |
| WR-03 | catch engole erro → rota sempre 200 | try/catch removido; `saveActiveSpreadsheetSpec` propaga (l.195-220); rota → 500 (route.ts l.32-38); cliente só avança ref em `res.ok` | `conversation-repository-active-spec.test.ts`: Prisma rejeita → `rejects.toThrow("db down")` contra helper real; `workspace-state-route.test.ts`: 500, sem `ok` na resposta |
| CR-01 | resetToSeed dispara auto-save pós-DELETE | `resetToSeed` pré-marca `lastSavedRef` (workspace-state-context.tsx l.197-200) | `workspace-state-context.test.tsx`: reset+avança debounce → `fetch` não chamado; `unified-chat-tool.test.tsx`: e2e timers reais, zero POST de estado pós-reset |

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/shared/src/unified-chat/schema.ts` | `deriveColumnKey` + `superRefine` de unicidade | ✓ VERIFIED | `deriveColumnKey` exportado (l.36-38); `superRefine` rejeita key efetiva colidente (l.59-72) |
| `apps/web/src/server/tools/conversation-repository.ts` | `guardActiveSpecSize` lança; `saveActiveSpreadsheetSpec` propaga | ✓ VERIFIED | `MAX_ACTIVE_SPEC_BYTES` 512KB (l.38); `guardActiveSpecSize` lança (l.78-86); save sem catch-engole (l.195-220) |
| `apps/web/src/app/api/workspace/state/route.ts` | POST mapeia falha → 500 | ✓ VERIFIED | catch → 500 sem `{ok:true}` e sem vazar detalhe (l.35-38) |
| `apps/web/src/components/app/workspace-state-context.tsx` | dedupe de key + supressão do auto-save | ✓ VERIFIED | `seedToGridState` Set+sufixo (l.39-51); `gridStateToSpecJson` (l.76-87); `resetToSeed` pré-marca ref (l.197-200) |
| `apps/web/tests/conversation-repository-active-spec.test.ts` | Regressões do helper real (oversize, propagação) | ✓ VERIFIED | 105 linhas; mocka só Prisma; testa helper real (oversize rejeitado, propagação, 200×26 intacto) |
| `apps/web/src/features/unified-chat/lib/table-export.ts` | CSV/XLSX + anti-injeção | ✓ VERIFIED | Sem regressão; `buildCsv/buildXlsx` via `displayRows`; SEC-04 intacto |
| `apps/web/src/app/(workspace)/workspace/page.tsx` | Hidratação do histórico | ✓ VERIFIED | `findUnifiedConversationExchanges` → `initialExchanges` |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `route.ts` | `conversation-repository.ts` | `saveActiveSpreadsheetSpec` lança → rota 500 | ✓ WIRED | Helper propaga; catch da rota mapeia 500 |
| `workspace-state-context.tsx` | `/api/workspace/state` | auto-save suprimido quando `resetToSeed` pré-marca `lastSavedRef` | ✓ WIRED | `specJson === lastSavedRef.current` retorna cedo (l.215) |
| `schema.ts` | `workspace-state-context.tsx` | `deriveColumnKey` compartilhado (sem drift) | ✓ WIRED | Importado em l.3 e usado em `seedToGridState` (l.41) |
| `page.tsx` | `conversation-repository.ts` | `findUnifiedConversationExchanges` → `initialExchanges` | ✓ WIRED | Sem regressão |
| `table-grid-panel.tsx` | `table-export.ts` | `buildCsv/buildXlsx(currentColumns, displayRows)` | ✓ WIRED | Sem regressão |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| WorkspaceStateProvider | `initialPresent` | `getActiveSpreadsheetSpec` (DB) via prop | Sim — round-trip agora preserva colisão e specs grandes; falha de save não é mascarada | ✓ FLOWING |
| TableGridPanel export | `displayRows` | `useFormulaEngine(currentColumns, rows)` | Sim — fórmulas avaliadas | ✓ FLOWING |
| UnifiedChatTool | `initialExchanges` | `findUnifiedConversationExchanges` (DB) | Sim — query real findMany | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Regressões dos 4 gaps (5 arquivos) | `vitest run` nos 5 arquivos | 55 passed (5 files) | ✓ PASS |
| Suíte web completa (sem regressão) | `pnpm --filter web test` | 291 passed / 1 skipped (25 files) | ✓ PASS |
| Typecheck repo-wide | `pnpm -r typecheck` | limpo (shared + web) | ✓ PASS |
| Helper real: oversize rejeitado | `conversation-repository-active-spec.test.ts` | `rejects.toThrow` + `create` não chamado | ✓ PASS |
| Helper real: propagação de erro | idem | `rejects.toThrow("db down")` contra helper sem mock | ✓ PASS |

### Qualidade dos Testes (preocupação crítica do baseline)

O baseline rejeitou a fase em parte porque os testes verdes mascaravam as falhas (o teste de 500 da rota mockava o helper para rejeitar artificialmente). A re-verificação confirmou que a nova cobertura **exercita o modo de falha real**:

- `conversation-repository-active-spec.test.ts` importa o **helper real** `saveActiveSpreadsheetSpec` e mocka **apenas o Prisma** (`@/server/db/client`). Oversize dispara `guardActiveSpecSize` real (lança antes de tocar no banco); a rejeição da transação propaga de verdade. **Não há mock que mascare.**
- `workspace-state-context.test.tsx` exercita `seedToGridState`/`resetToSeed` reais; o `fetch` é stub apenas como fronteira de rede. A supressão é observada avançando o debounce e asserindo `fetch` não chamado.
- `unified-chat-tool.test.tsx` (CR-01 e2e) usa timers reais: muta a grade (agenda auto-save legítimo), deixa o debounce passar, zera o contador, então invoca "Nova conversa" e aguarda 1,7s — asserta zero POSTs de `/api/workspace/state`, distinguindo-os do stream `/api/chat/unified`.
- O teste de 500 da rota (`workspace-state-route.test.ts`) ainda mocka o helper para isolar a rota, mas documenta explicitamente que a cobertura do modo de falha real vive na suíte sem mock — isolamento legítimo, não mascaramento.

### Requirements Coverage

| Requirement | Source (REQUIREMENTS.md) | Status | Evidence |
| ----------- | ------------------------ | ------ | -------- |
| PERS-01 | Export CSV com fórmulas calculadas (RF-05) | ✓ SATISFIED | `buildCsv` + `displayRows` + SEC-04 wired (Truth 1) |
| PERS-02 | Export XLSX com fórmulas calculadas (RF-05) | ✓ SATISFIED | `buildXlsx` cell-objects + sanitização (Truth 2) |
| PERS-03 | Planilha salva/recuperada entre sessões (RF-06) | ✓ SATISFIED | Round-trip agora confiável: CR-02/WR-03/WR-04 fechados (Truth 3) |
| PERS-04 | Conversa salva/recuperada entre sessões (RF-06) | ✓ SATISFIED | Hidratação server-side wired (Truth 4) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | Nenhum dos 4 blockers anteriores persiste | — | catch-engole removido; placeholder substituído por throw; dedupe na escrita; supressão de auto-save no reset. Nenhum marcador de débito (TBD/FIXME/XXX) introduzido nos arquivos da fase. |

### Human Verification Required

Nenhum item bloqueante requer verificação humana — todos os defeitos eram observáveis estaticamente e agora têm correção comprovada na fonte + regressão. **Recomendado (não bloqueante) UAT manual de confirmação:** (1) reload com sheet de upload grande (próxima de 200×26) e com nomes de coluna duplicados, confirmando que todos os dados sobrevivem; (2) "Nova conversa" e reload, confirmando que o banco fica limpo (não com SAMPLE_SPEC re-semeado). Estes são checks de confiança end-to-end no runtime real, já cobertos por regressão automatizada no nível de unidade/componente.

### Gaps Summary

Nenhum gap residual. Os quatro defeitos de perda de dados do baseline foram fechados na **fonte real**:

- **CR-02 (FECHADO):** `seedToGridState` desambigua keys colidentes (Set + sufixo de índice) e escreve em `newRow[resolvedKey]`; o schema `superRefine` rejeita keys efetivas colidentes; `deriveColumnKey` é compartilhado entre schema e provider (sem drift). Round-trip de colisão preserva os dados de ambas as colunas — comprovado por regressão.
- **WR-04 (FECHADO):** `guardActiveSpecSize` LANÇA em oversize (sem placeholder descartável); `MAX_ACTIVE_SPEC_BYTES` (512KB) acomoda o pior caso legítimo 200×26 pt-BR com folga. Sheet grande persiste intacta — comprovado contra helper real.
- **WR-03 (FECHADO):** `saveActiveSpreadsheetSpec` propaga a falha; a rota retorna 500; o cliente só avança `lastSavedRef` em resposta OK. Save falho não é mais marcado como salvo — comprovado contra helper real.
- **CR-01 (FECHADO):** `resetToSeed` pré-marca `lastSavedRef` com o specJson do reset antes do dispatch, suprimindo o auto-save; "Nova conversa" não ressuscita a linha `unified_table`. Comprovado por regressão de provider e e2e de componente.

Export (SC1/SC2) e hidratação da conversa (SC4) permanecem verdes sem regressão. Suíte web completa: 291 passed / 1 skipped; typecheck repo-wide limpo. A remoção do órfão `tool-repository.ts` é faxina não relacionada e não afeta as correções.

**Conclusão goal-backward:** a garantia central de persistência (SC3) e de reset coerente (SC5) agora é confiável para os casos realistas que o baseline expôs (upload, sheets grandes, nomes de coluna duplicados, falha de gravação, fluxo de "Nova conversa"), e a qualidade dos testes foi confirmada como exercitando o modo de falha real (sem mock que mascare). Status: **passed (5/5)**.

---

_Verificado: 2026-06-14T22:35:00Z_
_Verifier: Claude (gsd-verifier)_
