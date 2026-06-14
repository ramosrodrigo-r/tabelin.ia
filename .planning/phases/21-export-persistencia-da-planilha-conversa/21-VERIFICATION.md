---
phase: 21-export-persistencia-da-planilha-conversa
verified: 2026-06-14T18:05:00Z
status: gaps_found
score: 2/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Ao recarregar a tela única, a planilha do usuário é recarregada no estado em que foi deixada (seed/upload/edições da IA)"
    status: failed
    reason: >-
      O round-trip de persistência não é garantido para casos reais e plausíveis.
      (1) CR-02: seedToGridState usa a key derivada da coluna como índice de RowData
      sem garantir unicidade; duas colunas que colidam na mesma key derivada
      (nomes duplicados ou que normalizam para a mesma string — comuns em spec
      gerado por LLM ou importado) sobrescrevem dados silenciosamente no reload.
      O schema (tableColumnSchema) NÃO exige key/name únicos, então o spec
      persistido pode legalmente conter colisões. (2) WR-04: spec acima de 32 KB
      é persistido como placeholder {truncated:true}; no reload o safeParse falha,
      retorna null e o usuário cai no SAMPLE_SPEC — a planilha grande inteira é
      perdida. O teto de 200 linhas × 26 colunas com conteúdo pt-BR pode exceder
      32 KB legitimamente. (3) WR-03: saveActiveSpreadsheetSpec engole o erro e a
      rota sempre retorna 200; uma gravação que falha é marcada como salva pelo
      cliente (lastSavedRef atualizado) e nunca reagendada — perda silenciosa do
      último estado.
    artifacts:
      - path: "apps/web/src/components/app/workspace-state-context.tsx"
        issue: "seedToGridState (l.31-44) escreve newRow[resolvedKey] sem dedupe de key — colisão sobrescreve coluna (CR-02)"
      - path: "apps/web/src/server/tools/conversation-repository.ts"
        issue: "guardPayloadSize (l.52-55) persiste placeholder truncado p/ specs >32KB; getActiveSpreadsheetSpec (l.147) descarta no read -> SAMPLE_SPEC (WR-04). saveActiveSpreadsheetSpec (l.185-187) engole erro, retorna void (WR-03)"
      - path: "apps/web/src/app/api/workspace/state/route.ts"
        issue: "POST sempre retorna 200 porque o helper nunca lança; falha de gravação invisível ao cliente (WR-03)"
      - path: "packages/shared/src/unified-chat/schema.ts"
        issue: "tableColumnSchema (l.22-25) não exige unicidade de key/name — habilita a colisão do CR-02"
    missing:
      - "Garantir keys únicas ao derivar em seedToGridState (sufixar índice em colisão) e/ou validar unicidade no schema ao persistir"
      - "Para o spec ativo: rejeitar gravação com erro explícito quando >32KB OU elevar o teto p/ acomodar o máximo do schema (200×26), em vez de persistir placeholder descartável"
      - "saveActiveSpreadsheetSpec deve propagar a falha (ou retornar booleano) para a rota mapear 500, evitando que o cliente marque como salvo um save perdido"
  - truth: "Export e persistência funcionam tanto para planilha de seed/em branco quanto de upload CSV/XLSX; \"Nova conversa\" limpa chat e reseta a planilha de forma coerente"
    status: partial
    reason: >-
      O export funciona para qualquer origem (seed/blank/upload) — VERIFICADO.
      Porém a PERSISTÊNCIA para planilha de upload é justamente a mais exposta aos
      defeitos do SC-3 (CR-02 com nomes de coluna de import/LLM; WR-04 com sheets
      grandes). Além disso, o "Nova conversa" NÃO reseta de forma coerente no banco
      (CR-01): o DELETE da linha unified_table é desfeito pelo auto-save debancado
      (1.5s), que recria a linha com SAMPLE_SPEC. O usuário pede para limpar, mas o
      banco fica com um spec sample que não existia antes, e a ordem
      delete-vs-autosave é não-determinística. Não há coordenação entre o reset e
      a supressão do auto-save.
    artifacts:
      - path: "apps/web/src/features/unified-chat/unified-chat-tool.tsx"
        issue: "handleNewConversation (l.115) chama resetToSeed() que muda specJson e dispara o auto-save POST após DELETE (CR-01)"
      - path: "apps/web/src/components/app/workspace-state-context.tsx"
        issue: "resetToSeed (l.148) -> RESET_TO_SEED(SAMPLE_SPEC) muda specJson; useEffect (l.168-188) agenda POST de SAMPLE_SPEC sem supressão"
      - path: "apps/web/src/app/api/conversations/unified/route.ts"
        issue: "DELETE remove unified_table (ALL_UNIFIED_TOOL_KINDS) mas é ressuscitado pelo auto-save concorrente"
    missing:
      - "Coordenar reset e auto-save: marcar lastSavedRef para o estado de reset antes do dispatch (suprime o POST) OU tratar RESET_TO_SEED(SAMPLE) como limpar persistência (delete sem re-create) OU aguardar (await) o DELETE antes de resetar com auto-save suprimido"
      - "Corrigir CR-02/WR-04 (ver gap anterior) para que a persistência de upload sobreviva ao reload"
deferred: []
---

# Phase 21: Export & Persistência da Planilha+Conversa — Relatório de Verificação

**Phase Goal:** Export da planilha (CSV/XLSX com fórmulas calculadas, sem injeção) e persistência — ao recarregar a tela única, tanto a planilha viva quanto a conversa do chat associada são recarregadas no mesmo estado, tanto para planilha de seed/em branco quanto de upload; "Nova conversa" limpa chat e reseta a planilha de forma coerente.
**Verified:** 2026-06-14T18:05:00Z
**Status:** gaps_found
**Re-verification:** No — verificação inicial

## Goal Achievement

### Observable Truths (Success Criteria do ROADMAP)

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | Exportar para CSV com valores de fórmula já calculados (não texto) | ✓ VERIFIED | `table-export.ts:buildCsv` consome `displayRows` (valores computados pelo `useFormulaEngine`); `table-grid-panel.tsx:461-463` `handleExportCsv` usa `displayRows`; botão "Exportar CSV" wired (l.636-637) |
| 2 | Exportar para XLSX com valores calculados + sanitização contra injeção (SEC-04) | ✓ VERIFIED | `buildXlsx` escreve cell-objects `{t:"s", v: sanitizeCellForExport(...)}` (nunca infere fórmula); `DANGEROUS_LEAD`/`LEADING_NEUTRALIZERS` cobrem `= + - @ TAB CR LF` e neutralizadores iniciais; botão wired (l.644-647) |
| 3 | Ao voltar à tela única, a planilha recarrega no estado deixado (seed/upload/IA) | ✗ FAILED | Hidratação server-side wired (layout→shell→provider), MAS round-trip quebra: CR-02 (colisão de key derivada sobrescreve coluna), WR-04 (>32KB vira placeholder e cai no SAMPLE_SPEC), WR-03 (save falho marcado como salvo) |
| 4 | Ao recarregar, a conversa do chat associada recarrega (histórico visível) | ✓ VERIFIED | `page.tsx:18` `findUnifiedConversationExchanges(user.id)` → mapeia → `initialExchanges` em `<UnifiedChatTool>`; `UnifiedChatTool` hidrata `setExchanges` inicial. (Caveat: WR-05 — cast sem validação — é warning, não quebra o caminho feliz) |
| 5 | Export e persistência funcionam p/ seed/branco E upload; "Nova conversa" limpa e reseta coerentemente | ✗ PARTIAL | Export: OK p/ qualquer origem. Persistência de upload: exposta a CR-02/WR-04. "Nova conversa": CR-01 — DELETE de `unified_table` é desfeito pelo auto-save que recria SAMPLE_SPEC; estado final não-determinístico |

**Score:** 2/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `apps/web/src/features/unified-chat/lib/table-export.ts` | CSV/XLSX builders + sanitização | ✓ VERIFIED | Existe e wired (origem Phase 15, commit c91ec5d). Substantivo: 133 linhas, fórmulas via displayRows, SEC-04 hardened |
| `apps/web/src/server/tools/conversation-repository.ts` | Helpers de persistência | ⚠️ STUB-LIKE | Existe e wired, mas saveActiveSpreadsheetSpec engole erro (WR-03) e guardPayloadSize corrompe specs grandes (WR-04) |
| `apps/web/src/app/api/workspace/state/route.ts` | POST persistência | ⚠️ ORPHANED-SEMANTICS | Existe e wired, mas sempre 200 (não reflete falha real) |
| `apps/web/src/components/app/workspace-state-context.tsx` | initialSpec + auto-save | ⚠️ DEFECTIVE | Existe e wired; seedToGridState (CR-02) e auto-save sem coordenação de reset (CR-01) |
| `apps/web/src/app/(workspace)/workspace/layout.tsx` | Carrega spec server-side | ✓ VERIFIED | `getActiveSpreadsheetSpec(user.id)` → `initialSpec` |
| `apps/web/src/app/(workspace)/workspace/page.tsx` | Carrega histórico server-side | ✓ VERIFIED | `findUnifiedConversationExchanges` → `initialExchanges` |
| `apps/web/src/components/app/workspace-shell.tsx` | Encaminha initialSpec | ✓ VERIFIED | `<WorkspaceStateProvider initialSpec={...}>` |
| `apps/web/src/features/unified-chat/unified-chat-tool.tsx` | Reset coerente + hidratação | ⚠️ DEFECTIVE | handleNewConversation chama resetToSeed (dispara CR-01); hidrata initialExchanges sem validação (WR-05) |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `table-grid-panel.tsx` | `table-export.ts` | `buildCsv/buildXlsx(currentColumns, displayRows)` | ✓ WIRED | displayRows = valores computados |
| `layout.tsx` | `conversation-repository.ts` | `getActiveSpreadsheetSpec(user.id)` → `initialSpec` | ✓ WIRED | |
| `page.tsx` | `conversation-repository.ts` | `findUnifiedConversationExchanges` → `initialExchanges` | ✓ WIRED | |
| `workspace-state-context.tsx` | `/api/workspace/state` | `fetch POST` debancado | ⚠️ WIRED-MAS-DEFEITUOSO | Falha silenciosa (WR-03); ressuscita após delete (CR-01) |
| `unified-chat-tool.tsx` | `workspace-state-context.tsx` | `resetToSeed()` em handleNewConversation | ⚠️ WIRED-MAS-INCOERENTE | Conflita com DELETE concorrente (CR-01) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| TableGridPanel export | `displayRows` | `useFormulaEngine(currentColumns, rows)` | Sim — fórmulas avaliadas | ✓ FLOWING |
| WorkspaceStateProvider | `initialPresent` | `getActiveSpreadsheetSpec` (DB) via prop | Parcial — null/placeholder/colisão → SAMPLE_SPEC | ⚠️ HOLLOW (reload nem sempre traz o estado real) |
| UnifiedChatTool | `initialExchanges` | `findUnifiedConversationExchanges` (DB) | Sim — query real findMany | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Testes unitários da persistência (provider, rota, reset) | `vitest run` nos 3 arquivos da fase | 27 passed (3 files) | ✓ PASS (mas não cobrem o race CR-01 nem o caminho real WR-03/WR-04 — testam unidades isoladas; o teste de 500 da rota mocka o helper p/ rejeitar, o que o helper real nunca faz) |
| Export wired a botão com displayRows | grep `handleExportCsv/Xlsx` + `displayRows` | Confirmado l.461-469, 636-647 | ✓ PASS |

### Requirements Coverage

| Requirement | Source (REQUIREMENTS.md) | SUMMARY claim | Status | Evidence |
| ----------- | ------------------------ | ------------- | ------ | -------- |
| PERS-01 | Export CSV com fórmulas calculadas (RF-05) | SUMMARY 21-01 mapeou PERS-01 a "persistência" (incorreto) | ✓ SATISFIED (por código da Phase 15) | `buildCsv` + displayRows wired. ⚠️ DISCREPÂNCIA: nenhum plano/summary da Phase 21 implementou export — código pré-existe da Phase 15 (c91ec5d). Os SUMMARYs reatribuíram PERS-01/02 a trabalho de persistência |
| PERS-02 | Export XLSX com fórmulas calculadas (RF-05) | SUMMARY 21-01 mapeou PERS-02 a "auto-save" (incorreto) | ✓ SATISFIED (por código da Phase 15) | `buildXlsx` + sanitização wired. Mesma discrepância de atribuição acima |
| PERS-03 | Planilha salva/recuperada entre sessões (RF-06) | SUMMARY 21-02 PERS-03 | ✗ BLOCKED | Round-trip quebra (CR-02/WR-04/WR-03) — ver Truth 3 |
| PERS-04 | Conversa salva/recuperada entre sessões (RF-06) | SUMMARY 21-02 PERS-04 | ✓ SATISFIED | Hidratação server-side do histórico wired — ver Truth 4 |

**Nota de atribuição de requisitos:** REQUIREMENTS.md define PERS-01 e PERS-02 como os requisitos de EXPORT (CSV/XLSX). Os SUMMARYs da Phase 21 descrevem PERS-01 como "persistência do estado" e PERS-02 como "auto-save debancado" — uma reatribuição incorreta dos IDs. O export propriamente dito foi implementado na Phase 15 e apenas continua wired. Todos os 4 IDs estão contabilizados; PERS-01/02 satisfeitos por código pré-existente, PERS-03 bloqueado, PERS-04 satisfeito.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `conversation-repository.ts` | 185-187 | catch que só console.warn e retorna void | 🛑 Blocker | Save falho invisível ao cliente (WR-03) |
| `conversation-repository.ts` | 52-55 | retorna placeholder `{truncated:true}` em vez de rejeitar | 🛑 Blocker | Sheet grande perdida no reload (WR-04) |
| `workspace-state-context.tsx` | 41 | `newRow[resolvedKey] = ...` sem dedupe de key | 🛑 Blocker | Colisão de coluna sobrescreve dados (CR-02) |
| `unified-chat-tool.tsx` | 115 | resetToSeed sem coordenar com DELETE/auto-save | 🛑 Blocker | "Nova conversa" ressuscita SAMPLE_SPEC (CR-01) |
| `unified-chat-tool.tsx` | ~80 | `as UnifiedCompletePayload` sem safeParse | ⚠️ Warning | Payload persistido inválido pode quebrar render (WR-05) |

### Human Verification Required

Não roteado para verificação humana porque os defeitos são observáveis no código (lógica de coordenação ausente, placeholder descartável, escrita por key colidente). São gaps determináveis estaticamente, não dúvidas de comportamento visual/runtime. Após correção, recomenda-se UAT manual do round-trip (reload com sheet de upload grande e com nomes de coluna duplicados) e do "Nova conversa" (confirmar que o banco fica limpo, não com SAMPLE_SPEC).

### Gaps Summary

O **export (SC 1, 2)** está genuinamente implementado e wired — CSV e XLSX usam `displayRows` (fórmulas já calculadas) e preservam a sanitização anti-injeção SEC-04. Esses critérios passam, embora o código de export seja herança da Phase 15 e não trabalho desta fase (os SUMMARYs reatribuíram os IDs PERS-01/02 incorretamente).

A **persistência da planilha (SC 3, parte do SC 5)** NÃO é uma garantia confiável de round-trip. Três defeitos de perda de dados, todos confirmados no código e no schema:

- **CR-02 (BLOCKER):** `seedToGridState` indexa `RowData` pela key derivada da coluna; o schema não força unicidade, então colunas com nomes que colidam (plausível em spec de LLM/import) sobrescrevem-se silenciosamente no reload.
- **WR-04 (BLOCKER):** specs acima de 32 KB são persistidos como placeholder e descartados no read, jogando o usuário no SAMPLE_SPEC — a planilha grande inteira some.
- **WR-03 (BLOCKER):** uma gravação que falha retorna 200; o cliente marca como salva e nunca retenta.

O **reset coerente do "Nova conversa" (SC 5)** está quebrado por **CR-01 (BLOCKER):** o DELETE da linha `unified_table` é desfeito pelo auto-save debancado, que recria a linha com SAMPLE_SPEC sem nenhuma coordenação. O estado final no banco é não-determinístico e diferente de "limpo".

A **persistência da conversa (SC 4)** está corretamente fiada server-side e passa, com a ressalva menor do WR-05 (cast sem validação no boundary de hidratação).

Os 27 testes da fase passam, mas testam unidades isoladas: não exercitam a corrida entre delete e auto-save (CR-01), nem os caminhos reais de WR-03/WR-04 (o teste de 500 mocka o helper para rejeitar, comportamento que o helper real nunca produz). Passar nos testes não comprova a garantia de round-trip.

**Conclusão goal-backward:** distinguindo "edge case, núcleo funciona" de "garantia central quebrada" — aqui a garantia central de persistência (SC 3) e de reset coerente (SC 5) está quebrada para casos realistas (upload, sheets grandes, nomes de coluna duplicados, falha de gravação, fluxo de "Nova conversa"), não apenas em edge cases exóticos. Status: **gaps_found**.

---

_Verificado: 2026-06-14T18:05:00Z_
_Verifier: Claude (gsd-verifier)_
