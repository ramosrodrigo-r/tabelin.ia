# Phase 17: Desligar Monetização & Cota — Research

**Researched:** 2026-06-11
**Domain:** Remoção cirúrgica de monetização/cota (Mercado Pago, checkout, webhooks, plano Pro, entitlement gates, usage ledger, UI de upsell) num monorepo pnpm Next.js + Prisma, sem quebrar a rota de chat que permanece
**Confidence:** HIGH (todos os achados verificados por leitura direta do código e grep; nenhuma dependência de conhecimento de treinamento)

> Esta fase é **remoção comprovada**, não construção. Não há CONTEXT.md (fase ainda não discutida — o operador roda em modo yolo e prefere pular discuss-phase). A pesquisa abaixo deriva o conjunto de deleção/edição por inventário concreto de arquivos.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLEAN-04 | Toda a monetização/cota é removida — checkout, provedor de pagamento (Mercado Pago), webhooks, plano Pro, entitlement gates, sistema de cota/usage ledger e UI de upsell/limite (§5.4) | Inventário de blast radius completo (seção Blast Radius), seam chat↔gate mapeado (seção Seam), distinção delete-vs-desacoplar (seção Símbolos Compartilhados), impacto em testes catalogado |
</phase_requirements>

---

## Summary

A monetização do Tabelin.IA está implementada em **três camadas acopladas**:

1. **Provedor de pagamento (Mercado Pago)** — `apps/web/src/server/billing/` (4 arquivos: `mercado-pago-client.ts`, `checkout-service.ts`, `webhook-service.ts`, `entitlements.ts`), as rotas `app/api/billing/checkout/route.ts` e `app/api/billing/mercado-pago/webhook/route.ts`, a página `app/(billing)/billing/return/page.tsx`, a dependência npm `mercadopago@^3.0.0` e o bloco `# Billing` do `.env.example`. **Esta camada é puramente OUT — deleta inteira.**

2. **Cota / usage ledger** — `apps/web/src/server/usage/` (`quota-service.ts` com `reserveToolUse`/`confirmToolUse`/`releaseToolUse`, `quota-types.ts`), alimentado por `FREE_QUOTAS` e tipos em `packages/shared/src/billing/schema.ts`. **A lógica de gate é OUT; o ledger é debitado em CADA chamada da rota de chat sobrevivente.**

3. **Entitlement (plano Pro) como gate** — `getUserEntitlement`/`getCachedEntitlement`, `ensureProUser`, e o evento de stream `quota_warning`/`lastFreeUse`. Espalhado pela rota de chat, pela `workspace/layout.tsx`, pelo `Topbar` (badge Pro + suporte Pro), pelo `UnifiedChatTool` (banners de upsell + gating de anexo) e pelos `server/ai/*-stream.ts`.

**A descoberta crítica de escopo:** a rota de chat sobrevivente (`app/api/chat/unified/route.ts`) e os componentes de UI (`Topbar`, `UnifiedChatTool`, `workspace/layout.tsx`) **misturam** três responsabilidades num mesmo arquivo: (a) gating de cota/Pro — OUT nesta fase; (b) ramos de tools avulsos (formula/sql/regex/script/template/ocr/file_analysis) — OUT, mas de propriedade da **Phase 18**; (c) gating de anexo Pro — acoplado à ingestão de arquivo, que a **Phase 19** reescreve. Phase 17 deve **desacoplar o gate cirurgicamente sem deletar os ramos de tool nem reescrever a ingestão**, deixando esses para 18/19.

**Outra descoberta crítica:** `getUserEntitlement`/`getCachedEntitlement` **não pode ser deletado nesta fase** — as páginas de tool de propriedade da Phase 18 (`workspace/sql/page.tsx`, `ocr/page.tsx`, `regex/page.tsx`, `scripts/page.tsx`, `templates/page.tsx`, `file-analysis/page.tsx`) ainda o importam e passam `entitlement` adiante. Removê-lo agora quebra o typecheck dessas páginas. A migration Prisma destrutiva (drop das tabelas `Entitlement`/`UsageLedger`/`BillingCheckout`/`PaymentEvent`) é de propriedade explícita da **Phase 22 (CLEAN-08)** — Phase 17 deixa as tabelas órfãs no schema, removendo apenas o **código que as usa como gate**.

**Primary recommendation:** Remover as três camadas em commits atômicos isolados, MAS adotar a regra de seam: a rota de chat sai do estado "reserve→confirm/release" para "executa sem gate"; os ramos de tool e a ingestão de arquivo permanecem intactos (passam a rodar sem cota); os símbolos de entitlement compartilhados com páginas Phase-18 são mantidos e documentados como exceção até a Phase 18/22 limparem o resto. Migration Prisma fica para Phase 22.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Provedor de pagamento (Mercado Pago SDK, preference, webhook signature) | API / Backend (`server/billing`) | — | Lógica de servidor pura, sem consumidor IN; deleta inteira |
| Checkout (criar preferência, persistir BillingCheckout) | API / Backend (`api/billing/checkout`) | Database (tabela `BillingCheckout`) | Rota POST + serviço; tabela fica órfã p/ Phase 22 |
| Webhook de pagamento (ativar/revogar Pro) | API / Backend (`api/billing/mercado-pago/webhook`) | Database (`PaymentEvent`, `Entitlement`) | Endpoint público + idempotência; deleta rota e serviço |
| Cota / usage ledger (reserve/confirm/release) | API / Backend (`server/usage`) | Database (`UsageLedger`) | Gate transacional na rota de chat; remove o gate, ledger fica órfão |
| Entitlement como gate (`ensureProUser`, `getUserEntitlement`) | API / Backend + Frontend Server (SSR layout) | Database (`Entitlement`) | **Compartilhado** com páginas de tool Phase-18 — desacopla do chat, mantém símbolo |
| UI de upsell (badge Pro, banner de limite, CTA upgrade) | Browser / Client (`UnifiedChatTool`, `Topbar`) | — | Componentes React; remove blocos condicionais de upsell |
| Página de retorno de billing | Frontend Server (SSR `(billing)/billing/return`) | — | Página inteira OUT; deleta route group |

---

## Blast Radius — Inventário Concreto de Arquivos

> Verificado por grep (`mercado.?pago`, `checkout`, `webhook`, `entitlement`, `quota`, `usage`, `reserveToolUse`, `pro_required`, `upsell`) + leitura direta. `[VERIFIED: codebase grep + read]` em todos os itens abaixo.

### A. DELETAR INTEIRO (puramente OUT, zero consumidor IN sobrevivente)

| Arquivo | O que é | Nota |
|---------|---------|------|
| `apps/web/src/server/billing/mercado-pago-client.ts` | SDK MP, `getBillingConfig`, `createMercadoPagoClient` | Único importador de `mercadopago` npm |
| `apps/web/src/server/billing/checkout-service.ts` | `createCheckout`, `getCheckoutByReference` | Grava `BillingCheckout` |
| `apps/web/src/server/billing/webhook-service.ts` | `processMercadoPagoWebhook` + validação de assinatura HMAC | Grava `PaymentEvent`, chama activate/revoke |
| `apps/web/src/app/api/billing/checkout/route.ts` | POST `/api/billing/checkout` | SC#1 |
| `apps/web/src/app/api/billing/mercado-pago/webhook/route.ts` | POST webhook MP | SC#1 |
| `apps/web/src/app/(billing)/billing/return/page.tsx` | Página de retorno pós-pagamento | Route group `(billing)` inteiro fica vazio → remover |
| `apps/web/src/server/usage/quota-service.ts` | `reserveToolUse`/`confirmToolUse`/`releaseToolUse` | Gate transacional do ledger |
| `apps/web/src/server/usage/quota-types.ts` | re-export de tipos de cota | Diretório `server/usage/` fica vazio → remover |

### B. EDITAR — desacoplar gate, manter o resto (a rota e a UI que SOBREVIVEM)

| Arquivo | Editar | Manter |
|---------|--------|--------|
| `apps/web/src/app/api/chat/unified/route.ts` | Remover imports de `quota-service` e `getUserEntitlement`; remover `ensureProUser`; remover bloco `reserveToolUse`/429; remover todos os `confirmToolUse`/`releaseToolUse`; remover gate de anexo Pro (linhas ~370-375) e o gate `template`+Pro (~474-477); remover `quotaCheck.lastFreeUse` passado aos `create*EventStream` | TODA a lógica de classificação de intent, os switch-cases de tool (Phase 18 os remove), o loop de clarificação, a ingestão de arquivo (Phase 19), o save/record de exchange. **Streaming permanece idêntico.** |
| `apps/web/src/components/app/topbar.tsx` | Remover `isPro`, badge `pro-badge`/`Sparkles`, a seção "Suporte Pro" do menu de conta, e a prop `entitlement` (ou mantê-la como `_` se Phase-18 ainda passar) | Topbar enxuta (sessão, privacidade, nova conversa) |
| `apps/web/src/features/unified-chat/unified-chat-tool.tsx` | Remover `isPro`, os 3 blocos `quota-warning`/`quota-blocked`/`proBlocked` (linhas ~466-485), `disabled={stream.quotaBlocked}`, guarda `stream.quotaBlocked\|\|stream.proBlocked` no submit, gating de drop `if(!isPro)return`, prop `entitlement` | Chat, RenderDispatcher, IntentPill, ChatInput, anexo (Phase 19 reescreve) |
| `apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts` | Remover estados `quotaBlocked`/`proBlocked`/`lastFreeUse`, os branches `403 pro_required`/`429 quota_exceeded`, o handler do evento `quota_warning` | Todo o resto do stream NDJSON |
| `apps/web/src/app/(workspace)/workspace/layout.tsx` | Remover `getCachedEntitlement`, a prop `entitlement` passada ao `Topbar` | Shell, split, SAMPLE_SPEC |
| `apps/web/src/app/(workspace)/workspace/page.tsx` | Remover `getCachedEntitlement` e prop `entitlement` para `UnifiedChatTool` | Render do chat |
| `apps/web/src/styles/globals.css` | Remover classes `.quota-warning`, `.quota-blocked`, `.pro-badge` | Resto do CSS |

### C. MANTER (compartilhado com IN ou com Phase-18) — documentar como exceção (SC#4)

| Símbolo | Por que fica |
|---------|--------------|
| `getUserEntitlement` / `getCachedEntitlement` / `entitlements.ts` / `request-cache.ts` | **Páginas de tool de propriedade da Phase 18** (`workspace/sql\|ocr\|regex\|scripts\|templates\|file-analysis/page.tsx`) ainda importam e passam `entitlement`. Deletar agora quebra typecheck. Phase 18 remove essas páginas; Phase 22 dropa a tabela. Documentar como exceção comprovada de SC#4. |
| `activateProEntitlement` / `revokeProEntitlement` (em `entitlements.ts`) | Só consumidos pelo `webhook-service.ts` que é deletado em A — então **podem** ser removidos junto, mas ficam no mesmo arquivo de `getUserEntitlement` que precisa sobreviver. Decisão: remover as duas funções de ativação/revogação (sem consumidor após A), manter `getUserEntitlement`. |
| `mercadopago` em `package.json` | CLEAN-09 (deps órfãs) é de propriedade da **Phase 22**. Pode-se remover já que o único import sai em A, mas a regra do PRD coloca limpeza de deps na 22. Recomendação: **remover já** (é trivialmente comprovável que o único import some) OU deixar p/ 22 — decisão do planner. |
| `packages/shared/src/billing/schema.ts` (`FREE_QUOTAS`, `UserEntitlement`, `PlanId`, etc.) | `UserEntitlement` ainda é tipo de `getUserEntitlement` que sobrevive até Phase 18/22. `FREE_QUOTAS` perde consumidor com a deleção de `quota-service`. Manter o arquivo; opcionalmente podar `FREE_QUOTAS` se zero consumidor — mas é mais seguro deixar a poda do shared schema para Phase 22. |
| Evento `quota_warning` em `packages/shared/src/unified-chat/schema.ts` (linha 135) | Produzido por `server/ai/*-stream.ts` (formula/sql/regex/script/template/file-chat) — esses streams são de propriedade da **Phase 18**. Phase 17 para de **passar** `lastFreeUse` na rota de chat (o evento nunca dispara), mas o schema do evento fica até Phase 18 remover os streams. |

---

## O Seam: onde o gate envolve o streaming

`[VERIFIED: read apps/web/src/app/api/chat/unified/route.ts]`

A rota `POST /api/chat/unified` hoje tem este envelope de gate ao redor do handler:

```
POST(request):
  user = sessão (MANTÉM — auth fica)
  parse + validate prompt (MANTÉM)
  if file && !ensureProUser → 403 pro_required      ← REMOVER (gate de anexo Pro)
  quotaCheck = reserveToolUse(...)                   ← REMOVER
  if !quotaCheck.allowed → 429 quota_exceeded        ← REMOVER
  try {
    ... ingestão de arquivo (MANTÉM — Phase 19)
       releaseToolUse on file error                  ← REMOVER (só a chamada)
    classifyIntent (MANTÉM)
    if (file_analysis|ocr) && !file → release+needs_file  ← REMOVER só o release
    switch(resolvedToolKind):
      case formula/sql/regex/script/template:
        confirmToolUse(...)                          ← REMOVER (só a chamada)
        ...resolve + record + save (MANTÉM)
        createXEventStream(payload, quotaCheck.lastFreeUse, ...) ← tirar 2º arg
      case unified_table:
        clarification path: releaseToolUse            ← REMOVER (só a chamada)
        generation path: confirmToolUse               ← REMOVER (só a chamada)
  } catch { releaseToolUse; 502 }                     ← REMOVER só o release
```

**Regra do seam:** o streaming (`responseFromStream`, `createEventStream`, `prefixIntentEvent`, NDJSON) é **estruturalmente independente** do gate. O gate é um pré-filtro (reserve→429) e três pós-hooks (confirm/release). Remover o gate = apagar 1 bloco de pré-check + ~8 chamadas confirm/release/`.lastFreeUse`, sem tocar em nenhuma linha de stream. **Após a remoção, qualquer usuário autenticado streama sem bloqueio (SC#2).**

⚠️ **Cuidado com escopo Phase 18:** os `switch`-cases (formula/sql/regex/script/template/unified_table) e a ingestão de arquivo NÃO são de Phase 17. Mantenha-os funcionando — só rodando sem cota. A tentação de "já que estou aqui, deleto os tools" pertence à Phase 18 e violaria o princípio de commit atômico isolado (SC#5).

---

## Runtime State Inventory

> Fase de remoção/refactor. Cada categoria respondida explicitamente.

| Categoria | Itens encontrados | Ação |
|-----------|-------------------|------|
| **Stored data** | Tabelas Postgres `Entitlement`, `UsageLedger`, `BillingCheckout`, `PaymentEvent` (em `prisma/migrations/20260529174520_init/migration.sql`) contêm dados de runtime (planos ativos, ledger de cota). | **Nenhuma migration nesta fase.** Drop destrutivo é CLEAN-08 / **Phase 22**, que precisa preservar User/Spreadsheet. Phase 17 deixa as tabelas órfãs; remove só o código que as lê/grava. |
| **Live service config** | Webhook do Mercado Pago configurado no painel MP apontando para `${appUrl}/api/billing/mercado-pago/webhook`. Não vive no git. | A rota é deletada → webhook passa a retornar 404. Nenhuma ação no painel MP necessária para o objetivo (rota fora do ar). Documentar para o operador desativar o webhook no painel MP pós-deploy (higiene externa, não bloqueia). |
| **OS-registered state** | Nenhum. Verificado: sem Task Scheduler/cron/pm2 referenciando billing no repo. | None — verificado por ausência de scripts de processo. |
| **Secrets/env vars** | `.env.example` linhas 10-16: `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `PRO_MONTHLY_PRICE_BRL`, `PRO_ANNUAL_PRICE_BRL`, `NEXT_PUBLIC_PRO_SUPPORT_EMAIL`, `NEXT_PUBLIC_PRO_SUPPORT_WHATSAPP_URL`. `NEXT_PUBLIC_APP_URL` (linha 4) **é compartilhado** (usado por outras coisas além de billing) — manter. | Limpeza de `.env.example`/docs é CLEAN-10 / **Phase 22**. Phase 17 **pode** remover as 4 vars MP/PRO_PRICE já que o código que as lê sai; recomendação: remover já (comprovável) e deixar `NEXT_PUBLIC_PRO_SUPPORT_*` p/ Phase 18 (Topbar suporte Pro). Decisão do planner. |
| **Build artifacts / pacotes instalados** | `mercadopago@^3.0.0` em `apps/web/package.json` (linha 26). Único import: `mercado-pago-client.ts` (deletado em A). | Remover de `package.json` é tecnicamente CLEAN-09 / Phase 22, mas é trivialmente comprovável aqui. Se removido, rodar `pnpm install` para atualizar lockfile. Decisão do planner: remover já ou diferir. |

**A pergunta canônica:** depois que todos os arquivos forem atualizados, que sistemas de runtime ainda têm o estado antigo? → **As 4 tabelas Postgres** (dados preservados intencionalmente até Phase 22) e **o webhook configurado no painel MP** (vira 404 automaticamente; operador desativa no painel quando quiser).

---

## Don't Hand-Roll

| Problema | Não construir | Usar | Por quê |
|----------|---------------|------|---------|
| Verificar zero referências pendentes pós-remoção | Script ad-hoc de busca | `pnpm -r typecheck` + grep dirigido (`reserveToolUse`, `mercadopago`, `quota_exceeded`, `pro_checkout`) | O typecheck do TS já é o detector de imports quebrados mais confiável; grep complementa para strings/rotas |
| Garantir commit atômico bisseccionável | Re-verificar manualmente | Rodar `pnpm -r typecheck && pnpm -r test` antes de cada commit | SC#5 exige árvore verde por commit |
| Saber se um símbolo tem consumidor IN sobrevivente | Suposição | `codegraph_callers` / grep de importadores antes de deletar | Regra de segurança §6: na dúvida, investigar referências antes de remover |

**Key insight:** a maior armadilha desta fase não é técnica, é de **escopo**. O código de cota/entitlement está fisicamente entrelaçado com código que pertence às Phases 18 (tools) e 19 (ingestão). Hand-rolling aqui = deletar demais e invadir fases vizinhas, quebrando a atomicidade.

---

## Common Pitfalls

### Pitfall 1: Deletar `getUserEntitlement` e quebrar páginas Phase-18
**O que dá errado:** remover `entitlements.ts`/`request-cache.ts` inteiro porque "é billing".
**Por que acontece:** o nome do arquivo está em `server/billing/`, parece 100% OUT.
**Como evitar:** `getUserEntitlement`/`getCachedEntitlement` ainda são importados por 6 páginas de tool (`workspace/sql|ocr|regex|scripts|templates|file-analysis/page.tsx`) que só saem na Phase 18. Manter o símbolo, remover apenas `activate/revokeProEntitlement` (sem consumidor após deletar o webhook). Documentar como exceção SC#4.
**Sinais de alerta:** `pnpm -r typecheck` reclama de `Cannot find module '@/server/billing/entitlements'` em arquivos de página de tool.

### Pitfall 2: Invadir a Phase 18 deletando os switch-cases de tool na rota de chat
**O que dá errado:** ao remover o gate da rota `unified`, deletar também os `case formula/sql/...`.
**Por que acontece:** estão no mesmo arquivo e também são "código OUT".
**Como evitar:** Phase 17 só apaga `reserve/confirm/release` + checks de Pro. Os cases permanecem (rodando sem cota). Phase 18 os remove com a redução do dispatcher.
**Sinais de alerta:** o diff da rota toca em mais de ~30 linhas, ou remove `classifyIntent`/`switch`.

### Pitfall 3: Reescrever a ingestão de arquivo (gating de anexo Pro) — território da Phase 19
**O que dá errado:** ao remover `if (file && !ensureProUser) → 403`, refatorar o pipeline de upload.
**Por que acontece:** o gate de Pro está colado na lógica de arquivo.
**Como evitar:** remover só a condição `&& !ensureProUser` e o 403; o `extractContent`/validação de bytes fica intacto (Phase 19 reescreve a ingestão; Phase 19 também depende de `validateFile`/anti-zip-bomb que são compartilhados §6).
**Sinais de alerta:** diff toca em `extractContent`, `MAX_UPLOAD_BYTES`, `parseUnifiedRequest`.

### Pitfall 4: Deixar o evento de stream `quota_warning` órfão quebrar o parse NDJSON
**O que dá errado:** remover o handler de `quota_warning` no hook mas um `*-stream.ts` ainda emite o evento → `unifiedStreamEventSchema.parse` pode falhar se o schema for podado.
**Por que acontece:** produtores (server/ai streams) são Phase 18; consumidor (hook) é Phase 17.
**Como evitar:** **manter** o `quota_warning` no schema do `packages/shared/src/unified-chat/schema.ts`. Phase 17 apenas para de **passar** `lastFreeUse` na rota (evento nunca dispara para o chat) e remove o estado `lastFreeUse` da UI. O schema do evento e os streams ficam para Phase 18.
**Sinais de alerta:** teste flaky "corrupt NDJSON enters the error state" ou parse error em stream de tool.

### Pitfall 5: Worktree sujo do `.planning` contaminar o commit (memória do operador)
**O que dá errado:** `execute-phase` com `.planning` sujo faz o executor commitar deleções pendentes.
**Como evitar:** garantir árvore git limpa antes (já está — só `AICHAT.md` untracked). Se Prisma reclamar em worktree, rodar `pnpm exec prisma generate` antes de typecheck/test (falso-positivo conhecido).

---

## Validation Architecture

> `nyquist_validation: true` no config. Esta fase é regressão-guard: a remoção NÃO pode quebrar o chat sobrevivente.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unit/integração) + Playwright (e2e) |
| Config file | `apps/web/vitest.config.*` (presente — suíte ativa) / `apps/web/playwright` p/ e2e |
| Quick run command | `pnpm --filter web test` (ou `pnpm -r test`) |
| Full suite command | `pnpm -r typecheck && pnpm -r test` |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Comando | Existe? |
|-----|----------|-----------|---------|---------|
| CLEAN-04 / SC#1 | Rotas checkout/webhook/return retornam 404 (removidas) | integração/e2e | `pnpm --filter web test unified-route` + grep de rota | ❌ novo teste leve OU confiar em remoção de arquivo (route some) |
| CLEAN-04 / SC#2 | Chat streama p/ qualquer autenticado sem gate | integração | `pnpm --filter web test unified-route.test.ts` | ✅ existe — **precisa ser EDITADO** (remove mocks de quota/429/403) |
| CLEAN-04 / SC#3 | Zero UI de upsell/badge/limite | componente | `pnpm --filter web test unified-chat-tool.test.tsx topbar.test.tsx` | ✅ existem — **EDITAR** (remover asserts de quota-blocked/pro-badge/Suporte Pro) |
| CLEAN-04 / SC#4 | Busca por reserve/confirm/release/entitlement-gate/quota/mercadopago = zero (exceto exceção documentada) | manual/grep | grep dirigido na verificação | n/a — passo de verify-work |
| CLEAN-04 / SC#5 | `typecheck` + `test` verdes | suite | `pnpm -r typecheck && pnpm -r test` | gate de fase |

### Testes que QUEBRAM e devem ser REMOVIDOS/EDITADOS (impacto)
`[VERIFIED: codebase grep]`

**Remover inteiros (exercitam só capacidade OUT):**
- `apps/web/tests/quota-service.test.ts` — testa `reserveToolUse`/`confirmToolUse`/`releaseToolUse` (módulo deletado)
- `apps/web/tests/billing-checkout.test.ts` — testa `getBillingConfig`/`checkoutRequestSchema` MP
- `apps/web/tests/mercado-pago-webhook.test.ts` — testa `processMercadoPagoWebhook`
- `apps/web/tests/e2e/billing.spec.ts` — fluxo de billing/upsell e2e

**Editar (acoplamento parcial — manter os asserts IN):**
- `apps/web/tests/unified-route.test.ts` — remover mocks `reserveToolUse`/`getUserEntitlement`, casos 429/403 pro_required, asserts de cota; manter classificação/streaming
- `apps/web/tests/unified-chat-tool.test.tsx` — remover asserts de `quota-blocked`/`proBlocked`/upsell; remover prop `entitlement` (ou passar undefined); manter chat
- `apps/web/tests/topbar.test.tsx` — remover casos "Suporte Pro"/badge Pro; manter sessão/privacidade
- `apps/web/src/app/(workspace)/workspace/__tests__/layout.test.tsx` — remover mock `getCachedEntitlement` se a prop sair do layout
- `apps/web/tests/e2e/smoke.spec.ts` — verificar se referencia upsell (grep apontou) e ajustar

> CLEAN-11 (remoção formal de testes de capacidade OUT) é de propriedade da Phase 22, mas testes que **quebram a compilação/execução** desta fase devem ser tratados aqui para manter SC#5 verde. Regra: edite/remova o mínimo para a suíte ficar verde no commit desta fase; a varredura completa de fixtures fica para 22.

### Sampling Rate
- **Por task commit:** `pnpm --filter web test <arquivo-afetado>`
- **Por wave merge:** `pnpm --filter web test`
- **Phase gate:** `pnpm -r typecheck && pnpm -r test` verdes antes de `/gsd:verify-work`

### Wave 0 Gaps
- [ ] (opcional) teste leve confirmando 404/ausência das rotas `api/billing/*` — pode ser substituído por grep na verificação (a remoção do arquivo já garante 404 no Next App Router)
- Nenhum novo framework necessário — Vitest+Playwright já cobrem.

---

## Security Domain

> `security_enforcement: true`, ASVS level 1. Esta fase **remove** superfície de ataque — risco majoritariamente positivo.

### Applicable ASVS Categories
| Categoria | Aplica | Controle |
|-----------|--------|----------|
| V2 Authentication | sim | `getSessionFromCookieHeader`/`getCurrentUser` **permanecem** — a rota de chat continua exigindo auth (401 sem sessão). Não remover a checagem de sessão junto com o gate de cota. |
| V4 Access Control | sim | Após remover entitlement gate, **todo usuário autenticado** tem acesso pleno ao chat. Confirmar que isso é intencional (é — pivô removeu Pro). Garantir que a remoção não abre rota para **não autenticados**. |
| V5 Input Validation | sim | `validatePrompt`, schemas Zod e validação de bytes do upload **permanecem** (§6 compartilhado). Não remover validação ao remover gate. |
| V6 Cryptography | n/a após remoção | `webhook-service.ts` usa `createHmac`/`timingSafeEqual` para assinatura MP — sai inteiro com a deleção do webhook. Nada a re-implementar. |

### Threat Patterns
| Pattern | STRIDE | Mitigação |
|---------|--------|-----------|
| Remover o gate também remove a checagem de auth por engano | Elevation of Privilege | Manter `if (!user) return 401` na rota de chat — só o gate de cota/Pro sai |
| Webhook órfão no painel MP recebendo payloads após rota deletada | Spoofing (sem efeito) | Rota retorna 404; recomendar ao operador desativar o webhook no painel MP (higiene, não bloqueia) |
| Endpoint de checkout deletado mas referenciado por link de UI residual → erro ao usuário | Information Disclosure (baixo) | Grep por `pro_checkout`/`/billing/`/`href` de upsell na verificação (SC#3/SC#4) |

---

## State of the Art

| Antigo | Atual (pós-fase) | Impacto |
|--------|------------------|---------|
| Chat gated por `reserveToolUse` (4 usos/12h free) | Chat sem gate p/ autenticado | Streaming livre; ledger deixa de ser escrito |
| Plano Pro via Mercado Pago | Sem monetização (AbacatePay é milestone futuro §8) | Toda superfície MP fora do ar |
| Topbar com badge Pro + Suporte Pro | Topbar enxuta | UI de plano some |

**Depreciado/obsoleto:** Mercado Pago como provedor — substituído por AbacatePay em milestone futuro (NÃO reintroduzir billing nesta fase).

---

## Assumptions Log

| # | Claim | Section | Risco se errado |
|---|-------|---------|-----------------|
| A1 | Migration Prisma destrutiva (drop tabelas billing/cota) é de propriedade da Phase 22, não 17 | Runtime State / Blast Radius C | Se o planner achar que 17 deve dropar, viola atomicidade e arrisca dados de usuário. ROADMAP confirma CLEAN-08→Phase 22. Baixo risco. |
| A2 | Remover `mercadopago` de `package.json` e as env vars MP **pode** ser feito em 17 (comprovável) OU diferido p/ 22 (CLEAN-09/10) | Blast Radius C / Runtime State | Decisão de escopo. Qualquer escolha é defensável; o planner deve fixar uma para manter atomicidade. |
| A3 | `getUserEntitlement` deve sobreviver à Phase 17 por ser importado por páginas Phase-18 | Blast Radius C / Pitfall 1 | Se Phase 18 já tivesse removido essas páginas, o símbolo poderia sair. Verificado: páginas existem com conteúdo full. Confirmar no plan-check. |
| A4 | Operador desativa o webhook no painel Mercado Pago manualmente pós-deploy | Runtime State / Security | Não bloqueia a fase (rota vira 404 de qualquer forma). Higiene externa. |

---

## Open Questions

1. **Escopo de `package.json`/`.env.example`: limpar em 17 ou diferir para Phase 22 (CLEAN-09/10)?**
   - Sabemos: o único import de `mercadopago` sai em A; as env vars MP/PRO_PRICE perdem leitor.
   - Incerto: o PRD mapeia limpeza de deps/config para Phase 22, mas é trivialmente comprovável aqui.
   - Recomendação: **remover `mercadopago` e as 4 vars MP/PRO_PRICE já em 17** (mantém o commit auto-contido e comprovável), deixando `NEXT_PUBLIC_PRO_SUPPORT_*` para a Phase 18 (acoplado ao Topbar Suporte Pro). Planner decide; documentar a escolha.

2. **`activateProEntitlement`/`revokeProEntitlement` — remover em 17?**
   - Sabemos: só consumidos pelo `webhook-service.ts` (deletado em A).
   - Recomendação: remover as duas funções (ficam sem consumidor), preservando `getUserEntitlement` no mesmo arquivo. Confirma SC#4 com mais força.

3. **Teste de 404 das rotas billing: criar ou confiar na remoção do arquivo?**
   - No Next App Router, deletar `route.ts` já produz 404. Recomendação: confiar na remoção + grep na verificação; não criar teste e2e novo só para isso.

---

## Environment Availability

> Fase de remoção de código/config; sem novas dependências externas. Ferramentas necessárias já em uso no projeto.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| pnpm | typecheck/test/install | ✓ (projeto usa pnpm) | — | — |
| Prisma CLI | `prisma generate` em worktree (falso-positivo conhecido) | ✓ | — | rodar antes de typecheck |
| Vitest / Playwright | suíte de teste | ✓ | — | — |

**Nenhuma dependência faltante.** A remoção de `mercadopago` (se feita) exige `pnpm install` para atualizar o lockfile — sem download novo.

---

## Sources

### Primary (HIGH confidence)
- Leitura direta: `apps/web/src/app/api/chat/unified/route.ts`, `server/billing/*` (4 arquivos), `server/usage/*` (2), `app/api/billing/*` (2 rotas), `app/(billing)/billing/return/page.tsx`, `workspace/layout.tsx`+`page.tsx`, `components/app/topbar.tsx`, `features/unified-chat/unified-chat-tool.tsx`+`hooks/use-unified-chat-stream.ts`, `server/request-cache.ts`, `packages/shared/src/billing/schema.ts`, `prisma/schema.prisma`, `.env.example`
- Grep verificado: símbolos `mercado.?pago`/`checkout`/`webhook`/`entitlement`/`quota`/`reserveToolUse`/`pro_required`/`quota_warning`/`isPro`; importadores de `getUserEntitlement`/`mercadopago`; arquivos de teste acoplados
- `.planning/REQUIREMENTS.md` (CLEAN-04, §5.4, regra §6, traceability), `.planning/ROADMAP.md` (Phase 17/18/22 boundaries), `.planning/STATE.md`, `.planning/config.json`

### Secondary / Tertiary
- Nenhuma fonte web necessária — fase puramente interna ao codebase.

---

## Metadata

**Confidence breakdown:**
- Blast radius / inventário de arquivos: HIGH — grep + leitura direta de cada arquivo
- Seam chat↔gate: HIGH — leitura linha-a-linha da rota
- Distinção delete-vs-manter (símbolos compartilhados): HIGH — importadores verificados por grep
- Boundary com Phase 18/19/22: HIGH — confirmado contra ROADMAP + páginas de tool existentes
- Impacto em testes: HIGH — arquivos de teste lidos/grepados

**Research date:** 2026-06-11
**Valid until:** ~7 dias (codebase em pivô ativo; re-verificar se Phases 18/19 forem replanejadas antes de 17)
