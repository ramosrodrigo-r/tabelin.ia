---
phase: 08-multi-turn-llm-context
audit_type: threat-mitigation-verification
asvs_level: 1
block_on: high
threats_total: 14
threats_closed: 14
threats_open: 0
result: SECURED
audited: 2026-06-01
---

# Phase 08 — Multi-turn LLM Context — Security Audit

Verificação das mitigações declaradas no threat register (autorado em plan time)
contra o código implementado. Cada mitigação foi confirmada por evidência
`file:line`; threats de disposição `accept` foram validados confirmando que o
racional de risco aceito se sustenta (nenhum código contradiz a premissa).

**Resultado:** SECURED — 14/14 threats CLOSED, 0 OPEN.

Arquivos de implementação NÃO foram modificados (read-only). Único arquivo
produzido: este `08-SECURITY.md`.

---

## Threat Register — Status Verificado

| Threat ID | Categoria (STRIDE) | Disposição | Status | Evidência (file:line) |
|-----------|--------------------|------------|--------|------------------------|
| T-08-01 | Tampering (prompt-injection via histórico) | mitigate | CLOSED | `context-messages.ts:63-103` (serializeAssistant emite só artefato+explanation por kind; nunca metadata/warnings/assumptions/JSON cru). Teste: `context-messages.test.ts:55-59` (`not.toContain("metadata")`, `not.toContain("{")`, `not.toContain('"kind"')`) |
| T-08-02 | Denial of Service (token exhaustion) | mitigate | CLOSED | `context-messages.ts:117-147` (truncateHistory: slice(-MAX_EXCHANGES=10) linha 121 + corte por SAFE_TOKEN_BUDGET=4000 linhas 142-144). Testes: `context-messages.test.ts:305` (25→≤10), `:335` (corte por budget), `:360` (retém a mais recente) |
| T-08-03 | Information Disclosure (kind desconhecido) | accept | CLOSED (risco aceito) | `context-messages.ts:99-101` (default → return null, sem throw). Teste: `context-messages.test.ts:209-221` (kind desconhecido pulado, não lança) |
| T-08-04 | Information Disclosure (vazamento cross-tool) | mitigate | CLOSED | toolKind literal por stream: `sql-stream.ts:38` ("sql"), `regex-stream.ts:44` ("regex"), `scripts-stream.ts:46` ("script" singular), `template-stream.ts:34` ("template") |
| T-08-05 | Tampering (explain recebendo contexto) | mitigate | CLOSED | `regex-stream.ts:67-89` (branch explain usa array de mensagens literal; NÃO referencia buildToolContextMessages, buildMultiTurnSystemPrompt nem history). RegexModeInput tipo explain não tem campo history (`regex-stream.ts:18-20`) |
| T-08-06 | Denial of Service (token overflow no caminho real) | mitigate | CLOSED | `context-messages.ts:208` (buildToolContextMessages chama truncateHistory internamente). Invocado pelos 4 streams: `sql-stream.ts:38`, `regex-stream.ts:43`, `scripts-stream.ts:46`, `template-stream.ts:34` |
| T-08-07 | Elevation of Privilege / IDOR (cross-user) | mitigate | CLOSED | Routes lêem com `user.id` da sessão (`getSessionFromCookieHeader`): `sql/...route.ts:12,31`, `regex/...route.ts:12,31`, `scripts/...route.ts:12,31`, `template/...route.ts:13,39`. Repository filtra `where { userId, toolKind, mode }` `conversation-repository.ts:98`. ID nunca vem do body |
| T-08-08 | Information Disclosure (cross-tool, MULTI-03) | mitigate | CLOSED | toolKind literal por route (mesmas linhas de T-08-07); `scripts/...route.ts:31` usa "script" singular. Teste de regressão: `multi-turn-context.test.ts:144-152` (`toHaveBeenCalledWith(...,"script")` + `not.toHaveBeenCalledWith(...,"scripts")`) |
| T-08-09 | Denial of Service (falha de leitura derruba fluxo) | accept/mitigate | CLOSED | `conversation-repository.ts:103-106` (catch → console.warn + return []). Routes sem try/catch extra ao redor da leitura. Testes 200 com []: `multi-turn-context.test.ts:233-291` (4 tools) |
| T-08-10 | Tampering (Pro gate contornado no template) | mitigate | CLOSED | `template/...route.ts:19-23` (Pro gate → 403) executa ANTES de `findConversationExchanges` em `:39`. Teste: `multi-turn-context.test.ts:294-309` (não-Pro → 403 e `findConversationExchanges` `not.toHaveBeenCalled`) |
| T-08-GAP-01 | Tampering (rótulo "[Resposta anterior]") | accept | CLOSED (risco aceito) | `context-messages.ts:75,82,89,96` (rótulo é prefixo de texto em cada kind; o stripping de campos permanece — só artefato+explanation são emitidos). Não amplia superfície |
| T-08-GAP-02 | Spoofing (instrução system multi-turn) | accept | CLOSED (risco aceito) | `context-messages.ts:166-176` (buildMultiTurnSystemPrompt: texto 100% literal no código, concatenado a basePrompt; nenhum input externo interpolado). Sem vetor de injeção novo |
| T-08-GAP-03 | Information Disclosure (histórico rotulado) | accept | CLOSED (risco aceito) | Histórico já era enviado pré-rótulo; rótulo muda forma, não conteúdo. Truncagem T-08-02 (`context-messages.ts:117-147`) e MAX_EXCHANGES preservados |
| T-08-GAP-SC | Tampering (supply chain) | accept | CLOSED (risco aceito) | Nenhuma dependência nova. SUMMARYs declaram `tech-stack.added: []` (`08-03-SUMMARY.md:21`). Nenhum import de pacote novo nos arquivos auditados |

---

## Accepted Risks Log

Threats de disposição `accept` — racional confirmado contra o código (nenhum
trecho contradiz a premissa de risco aceito):

### T-08-03 — Information Disclosure (kind desconhecido pulado)
- **Racional:** payload com `kind` desconhecido retorna `null` e é pulado sem
  throw; payloads são gravados pelo próprio backend (não input direto do usuário).
- **Verificação:** `context-messages.ts:99-101` confirma `return null` no default;
  `:217` pula exchange quando serialização é null. Sem caminho que vaze o payload cru.
- **Risco residual:** baixo. Aceito.

### T-08-GAP-01 — Tampering (rótulo "[Resposta anterior]")
- **Racional:** rótulo é prefixo de prosa; não altera o field-stripping existente
  nem amplia a superfície de injeção.
- **Verificação:** `context-messages.ts:75,82,89,96` — rótulo precede apenas
  artefato+explanation; metadata/warnings continuam descartados. Confirmado.
- **Risco residual documentado no código (WR-02, `context-messages.ts:54-59`):**
  corpo do artefato e userPrompt são texto influenciado pelo usuário, replayed como
  contexto. Field-stripping NÃO é defesa de injeção — histórico tratado como
  não-confiável por design. Aceito explicitamente no plano.

### T-08-GAP-02 — Spoofing (instrução system hardcoded)
- **Racional:** texto literal no código-fonte, não interpolado de input externo.
- **Verificação:** `context-messages.ts:166-176` — string literal concatenada;
  apenas `basePrompt` (também literal nos streams) e nenhum dado de usuário entram.
  Aceito.

### T-08-GAP-03 — Information Disclosure (histórico rotulado revela artefato anterior)
- **Racional:** histórico já trafegava antes do rótulo; mudança é de forma, não de
  conteúdo. Limites de truncagem mantidos.
- **Verificação:** truncateHistory (`context-messages.ts:117-147`) e MAX_EXCHANGES=10
  inalterados. Aceito.

### T-08-GAP-SC — Tampering (supply chain / npm install)
- **Racional:** nenhuma dependência nova adicionada nesta fase.
- **Verificação:** `08-03-SUMMARY.md:21` (`added: []`); arquivos auditados importam
  apenas módulos internos já existentes e o SDK `openai` pré-existente. Aceito.

---

## Unregistered Flags

Nenhuma.

O `## Threat Flags` do `08-03-SUMMARY.md:106-112` declara explicitamente "Nenhuma
nova superfície de segurança foi introduzida" e mapeia cada item para threats
existentes (T-08-07/08/09/10). Os demais SUMMARYs (08-01/02/04) não introduzem
superfície nova. Nenhuma flag órfã detectada.

---

## Audit Trail

**Arquivos de implementação verificados (read-only):**
- `apps/web/src/server/ai/context-messages.ts` — serializeAssistant, truncateHistory, buildMultiTurnSystemPrompt, buildToolContextMessages
- `apps/web/src/server/ai/sql-stream.ts` — toolKind "sql", truncagem via buildToolContextMessages
- `apps/web/src/server/ai/regex-stream.ts` — toolKind "regex"; branch explain isolado de history
- `apps/web/src/server/ai/scripts-stream.ts` — toolKind "script" singular
- `apps/web/src/server/ai/template-stream.ts` — toolKind "template"
- `apps/web/src/app/api/tools/sql/generate/route.ts` — user.id sessão, leitura no try
- `apps/web/src/app/api/tools/regex/generate/route.ts` — user.id sessão, mode generate
- `apps/web/src/app/api/tools/scripts/generate/route.ts` — toolKind "script" singular
- `apps/web/src/app/api/tools/template/generate/route.ts` — Pro gate antes da leitura
- `apps/web/src/server/tools/conversation-repository.ts` — where {userId,toolKind,mode}, skip-on-error, READ_LIMIT, guardPayloadSize

**Testes consultados como evidência:**
- `apps/web/tests/context-messages.test.ts` — serialização sem metadata, truncagem 25/budget, rótulo, kind desconhecido
- `apps/web/tests/multi-turn-context.test.ts` — toolKind por route, isolamento "script" singular, skip-on-error 200, Pro gate 403 antes da leitura

**Método por disposição:**
- `mitigate` (T-08-01/02/04/05/06/07/08/10): grep do padrão de mitigação nos arquivos citados + confirmação de teste evidenciando.
- `accept` (T-08-03/09-parcial/GAP-01/GAP-02/GAP-03/GAP-SC): confirmação de que o código não contradiz o racional de risco aceito; registrado no Accepted Risks Log.

**Config aplicada:** asvs_level=1, block_on=high. Nenhum threat high permanece
aberto — sem condição de bloqueio acionada.

**Constatação:** todas as 14 mitigações declaradas estão presentes no código nos
locais corretos e aplicadas a TODOS os entry points (4 streams + 4 routes), não
apenas a um. Nenhum gap de implementação. Nenhuma escalada necessária.
