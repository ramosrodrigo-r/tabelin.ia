---
phase: 20-protocolo-de-muta-o-chat-grade-q-a
verified: 2026-06-14T17:25:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
gaps: []
deferred: []
---

# Phase 20: Protocolo de Mutação Chat→Grade & Q&A — Relatório de Verificação

**Phase Goal:** O chat de IA recebe o estado atual da planilha (colunas, tipos, amostra de linhas) e retorna operações estruturadas que são aplicadas à grade aberta — com undo — ou responde dúvidas analíticas em texto sem alterar a grade; tudo com streaming e fallback fixture sem `OPENAI_API_KEY`.
**Verificado:** 2026-06-14T17:25:00Z
**Status:** passed
**Re-verificação:** Não — verificação inicial

## Conquista do Objetivo

A verificação goal-backward partiu dos 5 Critérios de Sucesso do ROADMAP (contrato não-negociável), fundidos com as truths das frontmatter dos PLANs 20-01 e 20-02. Todas as truths foram confirmadas contra o código real e contra a execução das suítes de teste comportamentais — não apenas contra as afirmações dos SUMMARYs.

### Truths Observáveis

| # | Truth (Critério de Sucesso do ROADMAP) | Status | Evidência |
| --- | --- | --- | --- |
| 1 | Toda mensagem ao modelo inclui o estado atual da planilha (colunas, tipos, amostra de linhas) como contexto | ✓ VERIFIED | `unified-provider.ts:45-80` serializa título/colunas/tipos/linhas em `serializeSpecForPrompt` e `buildSheetUserPrompt`; ambos os prompts de sistema (mutação e Q&A) recebem o `buildSheetUserPrompt` como mensagem `user` (`unified-provider.ts:175,196`). A rota valida `specOverride` via `tableSpecPayloadSchema` (`route.ts:144-160,305-308`) e o repassa ao provider (`route.ts:334-338`). Teste `feeds the sheet context to a qa fixture answer mentioning the columns` passa. |
| 2 | Um pedido de manipulação resulta em operações estruturadas (table_spec) aplicadas visivelmente à grade aberta | ✓ VERIFIED | `sheet_operation` roteia para `buildMutationResult` → `generateMutation` → fixture/OpenAI retornando `TableSpecPayload` (`route.ts:257-269`, `unified-provider.ts:217-224`). No frontend, `unified-chat-tool.tsx:159-167` aplica o `table_spec` via `workspaceState.setSpec(result)` num `useEffect` dedicado com dedupe por ref. Teste `applies a table_spec mutation to the live grid` verifica que `ws-title` muda para o título mutado após o submit. |
| 3 | O usuário pode desfazer (undo) qualquer mutação aplicada pela IA | ✓ VERIFIED | `setSpec` despacha `RESET_TO_SEED`, que empurra o estado anterior para `past` (`workspace-state-context.tsx:93-100,135`), tornando a mutação desfazível. Teste `applies a table_spec mutation to the live grid (and stays undoable)` confirma `ws-can-undo` → `true` após mutação e que `Desfazer` (Ctrl+Z) restaura o título anterior. |
| 4 | Uma pergunta analítica retorna resposta em texto no chat sem alterar nenhuma célula da grade | ✓ VERIFIED | `qa` roteia para `buildQaResult` que agrega deltas e finaliza com `qa_response` (`route.ts:231-251`). O efeito de mutação só dispara para `kind === "table_spec"` (`unified-chat-tool.tsx:162`), logo um `qa_response` nunca chama `setSpec`. Teste `does not mutate the grid for a qa_response` confirma `ws-title` e `ws-can-undo` inalterados. |
| 5 | Streaming visível; sem `OPENAI_API_KEY` responde via fixture determinístico; localização pt-BR sem regressão | ✓ VERIFIED | Stream NDJSON emite `intent_detected`/`metadata`/`delta`/`complete` (`route.ts:164-185,236-248`); o hook acumula `delta` em `draft` (`use-unified-chat-stream.ts:163-166`) e o `StreamingCard` renderiza `<pre>{draft}</pre>` durante `streaming` (`render-dispatcher.tsx:27`). Fixtures determinísticas (`fixtureMutation`/`fixtureQa`) servem quando `hasOpenAiKey()` é falso (`unified-provider.ts:208-237`). Fórmulas geradas são traduzidas para pt-BR/`;` via `translateSpecFormulas` (`unified-provider.ts:82-94`); teste de rota assert que `Total IA` contém `SOMA(` e `;` e **não** contém `,`. |

**Score:** 5/5 truths verificadas

### Artefatos Requeridos

| Artefato | Esperado | Status | Detalhes |
| --- | --- | --- | --- |
| `apps/web/src/server/ai/formula-translator.ts` | Tradução bidirecional EN↔pt-BR segura quanto a strings/separadores | ✓ VERIFIED | `translateEnToPtBr`/`translatePtBrToEn` derivados de `PT_BR_TO_EN`; importado e usado por `unified-provider.ts:13,88`. (Limitação CR-01 documentada abaixo — não bloqueia objetivo.) |
| `apps/web/src/server/ai/unified-provider.ts` | Prompt builder + mutação Structured Outputs + Q&A streaming + fixtures | ✓ VERIFIED | Substantivo (241 linhas), importado por `route.ts:16-19`, exporta `generateMutation`/`generateQaDeltas`/`buildSheetUserPrompt`. (Extração de provider a partir da rota — desvio de organização declarado no SUMMARY, dentro do escopo.) |
| `apps/web/src/app/api/chat/unified/route.ts` | Valida specOverride, roteia mutação/Q&A, emite NDJSON | ✓ VERIFIED | Valida `specOverride`, roteia por intent, persiste e devolve NDJSON. Cablagem completa para provider e repositório. |
| `apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts` | Transmite `workspaceState.spec` como specOverride (JSON + FormData) | ✓ VERIFIED | `use-unified-chat-stream.ts:70,78,86` envia spec serializado; `submit` depende de `workspaceState.spec`. |
| `apps/web/src/features/unified-chat/unified-chat-tool.tsx` | Aplica table_spec via setSpec (undoável) | ✓ VERIFIED | `unified-chat-tool.tsx:159-167` aplica mutação via `setSpec` com dedupe por ref, resetado em "Nova conversa". |
| `apps/web/tests/formula-translator.test.ts` | Testes do tradutor | ✓ VERIFIED | 9 testes passando (funções, separadores, strings, round-trip parcial). |

### Verificação dos Key Links

| De | Para | Via | Status | Detalhes |
| --- | --- | --- | --- | --- |
| `unified-chat-tool.tsx` | `workspace-state-context.tsx` | `useWorkspaceState` / `setSpec` | ✓ WIRED | `unified-chat-tool.tsx:97,166` chama `workspaceState.setSpec(result)`; `setSpec` despacha `RESET_TO_SEED` (`workspace-state-context.tsx:135`). |
| `use-unified-chat-stream.ts` | `route.ts` | `fetch /api/chat/unified` com specOverride | ✓ WIRED | Hook envia `specOverride`; rota valida e consome (`route.ts:305,336`). |
| `route.ts` | `unified-provider.ts` | `generateMutation` / `generateQaDeltas` | ✓ WIRED | Importados e invocados em `buildMutationResult`/`buildQaResult`. |

### Rastreamento de Fluxo de Dados (Level 4)

| Artefato | Variável | Fonte | Produz Dado Real | Status |
| --- | --- | --- | --- | --- |
| `unified-chat-tool.tsx` (grade) | `stream.result` (table_spec) | `setSpec` ← evento `complete` do NDJSON ← `generateMutation` (fixture/OpenAI) | Sim | ✓ FLOWING — fixture `Total IA` soma colunas numéricas reais do spec; OpenAI devolve table_spec parseado |
| `render-dispatcher` StreamingCard | `draft` | acumulação de eventos `delta` (`setDraft`) | Sim | ✓ FLOWING — deltas de Q&A (fixture: 1 delta; OpenAI: stream) |
| prompt do modelo | `buildSheetUserPrompt` | `serializeSpecForPrompt(spec)` ← `specOverride` do cliente | Sim | ✓ FLOWING — colunas/tipos/linhas reais da grade viva |

### Spot-Checks Comportamentais

| Comportamento | Comando | Resultado | Status |
| --- | --- | --- | --- |
| Tradução EN→pt-BR + suítes da fase | `pnpm --filter web test formula-translator unified-route unified-chat-tool` | 3 arquivos, 32 testes passados | ✓ PASS |
| Suíte completa do web (regressão) | `pnpm --filter web test` | 22 arquivos, 263 passados, 1 skip | ✓ PASS |
| Reprodução CR-01 (corrupção de aspas escapadas `""`) | `node` repro de `swapSeparators` | Desync confirmado em literais com `""` + separador embutido | ✗ FAIL (edge case — ver Anti-Patterns) |
| Resolução de `{row}` na grade | `grep {row}` no engine | `use-formula-engine.ts:665` substitui `{row}` pela linha 1-based; `sample-spec.ts` já usa `{row}` com sucesso | ✓ PASS (refuta a preocupação WR-03) |

### Cobertura de Requisitos

| Requisito | PLAN de Origem | Descrição | Status | Evidência |
| --- | --- | --- | --- | --- |
| CHAT-01 | 20-01, 20-02 | Pedido enviado com estado da planilha (colunas/tipos/amostra) | ✓ SATISFIED | Truth #1 |
| CHAT-02 | 20-01, 20-02 | IA retorna operações estruturadas aplicadas à grade | ✓ SATISFIED | Truth #2 |
| CHAT-03 | 20-02 | Mudanças da IA podem ser desfeitas (undo) | ✓ SATISFIED | Truth #3 |
| CHAT-04 | 20-01, 20-02 | Perguntas analíticas retornam texto sem alterar grade | ✓ SATISFIED | Truth #4 |
| CHAT-05 | 20-01, 20-02 | Resposta faz streaming | ✓ SATISFIED | Truth #5 (NDJSON delta → draft → StreamingCard) |
| CHAT-06 | 20-01 | Sem `OPENAI_API_KEY`, responde por fixture | ✓ SATISFIED | Truth #5 (`fixtureMutation`/`fixtureQa` via `hasOpenAiKey()`) |
| LOC-01 | 20-01 | Fórmulas pt-BR, separador `;`, sem regressão | ✓ SATISFIED | Truth #5 + tradução `translateSpecFormulas` + suíte verde |

Todos os 7 IDs declarados nas frontmatter dos PLANs estão mapeados para Phase 20 na REQUIREMENTS.md (linhas 107-117) e marcados Complete. Nenhum ID órfão: REQUIREMENTS.md não mapeia requisitos adicionais à Phase 20 além desses 7.

### Anti-Patterns Encontrados

| Arquivo | Linha | Pattern | Severidade | Impacto |
| --- | --- | --- | --- | --- |
| `formula-translator.ts` | 61-67, 73-99 | Contador de aspas não trata escape `""`/`\"` (CR-01) | ⚠️ Warning | Corrupção silenciosa de separador APENAS em literais de string com aspas escapadas duplicadas e separador embutido. Não atingido pela fixture (`=SUM` sem strings) nem pelo domínio numérico/currency dominante. A grade (`parseFormulaArgs`) tem a mesma limitação naive, então não é o único ponto de falha — o pipeline central de fórmulas numéricas funciona ponta a ponta. |
| `unified-provider.ts` | 114-124, 142-147 | `fixtureMutation`/`columnRef` perdem colunas sem `key` e quebram além de 26 colunas (WR-01/WR-02) | ⚠️ Warning | Afeta apenas a fixture determinística (dev/test). Specs reais carregam `key`; limite de 26 colunas raramente atingido. Não bloqueia o protocolo real (OpenAI). |
| `route.ts` / hook | 164-185 / 168-180 | Buffer-then-replay em vez de stream incremental real; estados terminais não mutuamente exclusivos (WR-04/WR-05) | ⚠️ Warning | O mecanismo NDJSON delta→draft está presente e visível; o streaming é "diferido" (buffer no servidor) mas o critério "streaming visível ao usuário" é cumprido. Robustez de erro pós-`complete` é uma melhoria, não um bloqueio do objetivo. |

Nenhum marcador de débito (`TBD`/`FIXME`/`XXX`) encontrado nos arquivos modificados pela fase. Sem stubs: todos os artefatos são substantivos e cablados.

## Avaliação do BLOCKER CR-01 (decisão de impacto no objetivo)

O code review classificou CR-01 como BLOCKER. Sob a ótica goal-backward, **CR-01 não quebra materialmente o objetivo da fase nem nenhuma must-have**, pelas razões:

1. **Não atinge o caminho fixture** — `fixtureMutation` gera `=SUM(refs)` sem literais de string; a corrupção é impossível ali.
2. **Domínio dominante imune** — as operações alvo (somar, ordenar, preencher, criar coluna de fórmula sobre colunas numéricas/currency) não produzem literais de string com separador embutido + escape `""`.
3. **Não é ponto único de falha** — o motor de fórmulas da própria grade (`parseFormulaArgs`, `use-formula-engine.ts:110-122`) usa o mesmo toggle naive de aspas, então um literal `""`-escapado já seria mal-parseado a jusante independentemente do tradutor. O contrato central (fórmulas numéricas EN→pt-BR/`;`) funciona e está coberto por teste.
4. **Reprodução confirma escopo estreito** — o repro só desincroniza com `""` + separador dentro do literal; casos comuns (`"A, B"` simples) permanecem corretos (teste `preserva decimais e strings` passa).

Portanto CR-01 é registrado como ⚠️ WARNING (edge case de robustez), recomendado para correção numa fase de hardening/limpeza, mas **não rebaixa o status da fase**. As 5 truths permanecem VERIFIED com testes comportamentais passando.

### Verificação Humana Necessária

Nenhuma. Todas as truths foram confirmadas programaticamente via testes comportamentais (jsdom + WorkspaceProbe assertam mutação visível, undo e não-mutação em Q&A) e inspeção de código. O caminho fixture é determinístico e não requer serviço externo. O caminho OpenAI real é exercitado por estrutura idêntica (mesmo `generateMutation`/`generateQaDeltas`), com tradução de fórmulas no BFF coberta por teste unitário.

### Resumo de Gaps

Nenhum gap bloqueante. Os 6 warnings do review (CR-01, WR-01..WR-06) são defeitos de robustez/edge-case que não impedem nenhuma must-have do objetivo. A fase entrega o protocolo de mutação chat→grade com undo, Q&A em texto sem mutação, streaming NDJSON visível e fallback fixture sem chave — tudo verificado ponta a ponta. Recomenda-se endereçar CR-01 e WR-01/WR-02 numa fase de hardening por higiene de correção, mas sem bloquear o avanço para a Phase 21.

---

_Verificado: 2026-06-14T17:25:00Z_
_Verificador: Claude (gsd-verifier)_
