---
phase: 17-desligar-monetiza-o-cota
reviewed: 2026-06-11T23:40:20Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - apps/web/package.json
  - apps/web/src/app/(workspace)/workspace/__tests__/layout.test.tsx
  - apps/web/src/app/(workspace)/workspace/layout.tsx
  - apps/web/src/app/(workspace)/workspace/page.tsx
  - apps/web/src/app/api/chat/unified/route.ts
  - apps/web/src/components/app/topbar.tsx
  - apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts
  - apps/web/src/features/unified-chat/unified-chat-tool.tsx
  - apps/web/src/server/billing/entitlements.ts
  - apps/web/src/styles/globals.css
  - apps/web/tests/e2e/smoke.spec.ts
  - apps/web/tests/topbar.test.tsx
  - apps/web/tests/unified-chat-tool.test.tsx
  - apps/web/tests/unified-route.test.ts
findings:
  critical: 0
  warning: 2
  info: 0
  total: 2
status: issues_found
---

# Fase 17: Relatório de Revisão de Código

**Revisado em:** 2026-06-11T23:40:20Z
**Profundidade:** standard
**Arquivos revisados:** 14
**Status:** issues_found

## Resumo

A fase 17 removeu as barreiras de cota/entitlement da rota unificada, removeu a UI de upsell/cota do Topbar e do chat unificado, podou a camada Mercado Pago, removeu a dependência `mercadopago` e manteve `getUserEntitlement` como exceção documentada para páginas antigas que ainda saem na Fase 18. Na rota `POST /api/chat/unified`, a remoção está coerente: não há mais `reserveToolUse`/`confirmToolUse`/`releaseToolUse`/`ensureProUser`, autenticação e validação de upload de 5 MB permanecem, e os fluxos de streaming recebem `undefined` no parâmetro opcional antes usado para `lastFreeUse`.

Foram encontrados dois problemas reais em arquivos revisados: um bug de UI no fluxo de clarificação de tabela, onde os botões de geração/confirmação disparam a requisição mas não renderizam nem arquivam a resposta, e uma suíte Playwright de smoke que ficou desalinhada com a tela unificada e com a rota `/api/chat/unified`.

## Críticos

Nenhum achado crítico.

## Avisos

### WR-01: Ações "Gerar mesmo assim" e "Confirmar e Gerar" fazem request, mas não exibem nem arquivam a resposta

**Arquivo:** `apps/web/src/features/unified-chat/unified-chat-tool.tsx:166`, `apps/web/src/features/unified-chat/unified-chat-tool.tsx:265`, `apps/web/src/features/unified-chat/unified-chat-tool.tsx:279`, `apps/web/src/features/unified-chat/unified-chat-tool.tsx:285`, `apps/web/src/features/unified-chat/unified-chat-tool.tsx:377`

**Problema:** O `useEffect` que arquiva uma resposta terminal retorna imediatamente quando `submittedText` ou `submittedContext` estão vazios (`linha 166`). A renderização da troca "ao vivo" também depende de `submittedText && stream.status !== "idle"` (`linha 377`). Isso funciona para `submitPrompt`, porque ele popula esses estados antes de chamar `stream.submit`.

Os manipuladores de clarificação `handleSkipClarification` e `handleConfirmSpec`, porém, chamam `stream.submit` diretamente (`linhas 279-293`). Depois que a pergunta de clarificação já foi arquivada, `submittedText` foi limpo; portanto, ao clicar "Gerar mesmo assim" ou "Confirmar e Gerar", a requisição é enviada, mas a nova resposta não aparece na conversa e também não é adicionada a `exchanges` quando o stream completa.

Os testes atuais cobrem apenas que a segunda request contém `overrideGenerate`/`specOverride` (`apps/web/tests/unified-chat-tool.test.tsx:519-568`), mas não verificam que o resultado da segunda resposta fica visível. Isso deixa o bug passar mesmo com a suíte verde.

**Impacto:** Usuários que usam o fluxo de tabela podem clicar para gerar a tabela final e receber uma tela aparentemente parada ou ainda mostrando apenas o card anterior, apesar de o backend ter respondido.

**Correção sugerida:** Fazer esses dois handlers passarem pelo mesmo caminho de submissão que popula estado de renderização/arquivamento, ou preencher `submittedText`/`submittedContext` antes de chamar `stream.submit`. Adicionar testes que cliquem em "Gerar mesmo assim" e "Confirmar e Gerar" e esperem o resultado final aparecer na thread.

### WR-02: `smoke.spec.ts` continua exercitando rotas/botões antigos e falha contra a tela unificada atual

**Arquivo:** `apps/web/tests/e2e/smoke.spec.ts:176`, `apps/web/tests/e2e/smoke.spec.ts:191`, `apps/web/tests/e2e/smoke.spec.ts:200`, `apps/web/tests/e2e/smoke.spec.ts:229`, `apps/web/tests/e2e/smoke.spec.ts:248`, `apps/web/tests/e2e/smoke.spec.ts:276`, `apps/web/src/app/(workspace)/workspace/page.tsx:4`, `apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts:111`, `apps/web/src/features/unified-chat/unified-chat-tool.tsx:419`

**Problema:** A suíte Playwright ainda simula e interage com os fluxos antigos. O smoke de fórmula intercepta `**/api/tools/formula/generate` e clica no botão "Gerar formula" (`linhas 176-196`), mas a página `/workspace` agora renderiza `UnifiedChatTool`, envia para `/api/chat/unified` e expõe o envio pelo botão "Enviar". As suítes seguintes ainda navegam para `/workspace/scripts`, `/workspace/sql`, `/workspace/regex`, `/workspace/file-analysis` e `/workspace/ocr` (`linhas 200-371`), apesar de a experiência principal revisada ser a tela unificada.

**Impacto:** Quando Playwright for executado, esses testes tendem a timeoutar em seletores/rotas que não correspondem mais ao produto atual. Como `pnpm -r test` roda Vitest e não Playwright, a fase pode parecer verde enquanto a principal cobertura E2E está obsoleta.

**Correção sugerida:** Reescrever os smokes para a experiência unificada: interceptar `/api/chat/unified`, usar o botão "Enviar" e validar os payloads/renderizadores do chat unificado. Enquanto as páginas antigas aguardam a Fase 18, remover ou isolar os cenários que dependem das rotas antigas.

## Verificação

- `pnpm --filter web test unified-chat-tool unified-route topbar layout` — passou (4 arquivos, 45 testes)

---

_Revisado em: 2026-06-11T23:40:20Z_
_Revisor: Codex (gsd-code-reviewer)_
_Profundidade: standard_
