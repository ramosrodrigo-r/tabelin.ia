---
phase: 17
slug: desligar-monetiza-o-cota
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-15
---

# Phase 17 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Fase 17 "Desligar Monetização & Cota" removeu toda a superfície de monetização/cota
> (checkout Mercado Pago, webhooks, endpoints de plano Pro, gates de entitlement, ledger
> de uso, UI de upsell) preservando intacta a rota de chat/streaming. A preocupação central —
> que nenhum gate de auth/entitlement ficasse exposto ou fosse removido de forma a abrir acesso —
> foi verificada por grep direto na implementação (não por documentação/intenção).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Cliente não autenticado → POST /api/chat/unified | Entrada não confiável; sessão exigida ANTES de qualquer trabalho | cookie de sessão, prompt, upload |
| Cliente autenticado → handler de streaming | Após auth, todo usuário tem acesso pleno ao chat (Pro removido — intencional) | prompt, NDJSON stream |
| Servidor (layout SSR) → Topbar (client) | A prop entitlement deixa de cruzar; nenhuma decisão de acesso na UI depende dela | sessão de usuário |
| Internet pública → POST /api/billing/mercado-pago/webhook | Endpoint público (HMAC) DELETADO → 404; nenhum handler não autenticado órfão remanesce | (n/a — rota removida) |
| Mercado Pago (painel externo) → webhook configurado | Config vive fora do git; rota deletada retorna 404 automaticamente | (n/a — rota removida) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-17-01 | Elevation of Privilege | api/chat/unified/route.ts | mitigate | `getSessionFromCookieHeader` + `return 401` preservados; auth roda ANTES de validatePrompt/classifyIntent | closed |
| T-17-02 | Tampering | unified-route.test.ts (regressão) | mitigate | Teste `"rejects unauthenticated requests"` (status 401) presente; suíte verde no commit | closed |
| T-17-03 | Information Disclosure | inputs prompt/upload | accept | `validatePrompt`, schemas Zod e MAX_UPLOAD_BYTES intactos (V5 ASVS) — não tocados na fatia | closed |
| T-17-04 | Elevation of Privilege | workspace/layout.tsx | mitigate | Remoção de getCachedEntitlement preservou `getCachedUser()` + `redirect("/sign-in")` | closed |
| T-17-05 | Information Disclosure | smoke.spec.ts / globals.css | mitigate | CTAs de upgrade + classes de upsell removidas; sem links residuais para rotas de billing deletadas | closed |
| T-17-06 | Spoofing | webhook deletado / painel MP | accept | route.ts removido → 404; nenhum handler órfão. Higiene externa (desativar webhook no painel) recomendada, não bloqueante | closed |
| T-17-07 | Elevation of Privilege | api/billing/checkout (deletado) | mitigate | Rota + serviço removidos juntos; zero imports órfãos de checkout-service/webhook-service/mercado-pago-client | closed |
| T-17-08 | Tampering | entitlements.ts | mitigate | Só activate/revoke removidos; `getUserEntitlement` preservado intacto no commit da fase (2779711) | closed |
| T-17-SC | Tampering | remoção da dep mercadopago | accept | Operação é REMOÇÃO de dependência (não instalação) — sem superfície de supply-chain nova | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Threat Verification Evidence

| Threat ID | Verification | Evidence |
|-----------|--------------|----------|
| T-17-01 | grep | `getSessionFromCookieHeader` x2 em route.ts; `status: 401` na linha 277 (antes de validatePrompt L281 e classifyIntent L318); gate symbols (reserveToolUse/confirmToolUse/releaseToolUse/ensureProUser/getUserEntitlement/quotaCheck/quota_exceeded/pro_required) = 0 matches; classifyIntent x2 |
| T-17-02 | grep + test | `tests/unified-route.test.ts:99` `it("rejects unauthenticated requests")` + `:107 expect(response.status).toBe(401)`; refs a quota/billing no teste = 0 |
| T-17-03 | grep | validatePrompt/MAX_UPLOAD_BYTES/safeParse/z./schema = 7 matches em route.ts (validação preservada) |
| T-17-04 | grep | `(workspace)/workspace/layout.tsx`: `getCachedUser()` L16 + `redirect("/sign-in")` L19; getCachedEntitlement/entitlement = 0 em layout.tsx e page.tsx |
| T-17-05 | grep | globals.css quota-warning/quota-blocked/pro-badge = 0; smoke.spec.ts Assinar Pro/quota block/quota_warning = 0; topbar isPro/Suporte Pro/UserEntitlement = 0; hook quotaBlocked/proBlocked/lastFreeUse/quota_warning/quota_exceeded/pro_required = 0 |
| T-17-06 | filesystem | `src/app/api/billing/mercado-pago/webhook/route.ts` ausente; diretório `src/app/api/billing` removido inteiro |
| T-17-07 | filesystem + grep | checkout/route.ts, mercado-pago-client.ts, checkout-service.ts, webhook-service.ts ausentes; `(billing)/billing/return/page.tsx` + route group removidos; imports órfãos de checkout-service/webhook-service/mercado-pago-client = 0 em src; refs a api/billing/checkout|webhook em src = 0 |
| T-17-08 | git show | `git show 2779711:.../entitlements.ts` → getUserEntitlement = 1, activate/revokeProEntitlement = 0. (Arquivo posteriormente removido pela Phase 18 commit 4ddce50, após os consumidores saírem — ação legítima de fase downstream, fora do escopo de auditoria da Phase 17.) |
| T-17-SC | grep | mercadopago em package.json = 0; mercadopago em src = 0; .env.example MP/PRO_PRICE vars = 0; NEXT_PUBLIC_PRO_SUPPORT_EMAIL = 1 (preservado p/ Phase 18); 3 testes de billing OUT deletados |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-17-01 | T-17-03 | Validação de input (validatePrompt/Zod/MAX_UPLOAD_BYTES) é pré-existente e fora do escopo desta fase de remoção; permanece intacta e verificada (7 matches). | gsd-security-auditor | 2026-06-15 |
| AR-17-02 | T-17-06 | Endpoint de webhook removido → 404; nenhum handler órfão. Risco residual é apenas operacional (webhook ainda configurado no painel Mercado Pago externo), mitigado por recomendação não-bloqueante de desativá-lo pós-deploy. | gsd-security-auditor | 2026-06-15 |
| AR-17-SC | T-17-SC | Fase consiste apenas em remoções de código + remoção de dependência; nenhum pacote novo entra. Sem superfície de supply-chain nova; checkpoint de legitimidade não se aplica. | gsd-security-auditor | 2026-06-15 |

*Accepted risks do not resurface in future audit runs.*

---

## Unregistered Flags

Nenhum. Os três SUMMARY.md (17-01/02/03) não contêm seção `## Threat Flags` — nenhuma nova superfície de ataque foi registrada durante a implementação. A fase é puramente subtrativa (remoção de superfície de monetização/cota), o que reduz a superfície de ataque em vez de expandi-la. Verificação de defesa em HEAD: zero referências a `api/billing/checkout`, `api/billing/mercado-pago` ou `mercadopago` em `apps/web/src`.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-15 | 9 | 9 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-15
