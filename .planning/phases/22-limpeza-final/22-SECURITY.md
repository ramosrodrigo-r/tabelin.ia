---
phase: 22
slug: limpeza-final
status: draft
threats_open: 1
asvs_level: 1
created: 2026-06-15
mode: retroactive-stride
---

# Phase 22 — Security

> Contrato de segurança da fase: registro de ameaças (STRIDE retroativo), riscos aceitos e trilha de auditoria.
> **Modo:** RETROACTIVE-STRIDE — nenhum `<threat_model>` existia em PLAN.md. O registro abaixo
> foi construído a partir do que a fase efetivamente entregou (migration destrutiva, remoção de
> deps/assets, ajustes em docs/env), e cada ameaça foi então verificada contra o código entregue.

---

## Resumo da Auditoria

A fase 22 ("Limpeza Final") é uma fase de **remoção**, não de adição de superfície. O risco de
segurança dominante não é exposição de dados novos, mas **perda de dados** (Tampering / Denial of
Service por destruição) via a migration `DROP TABLE` em 7 tabelas — incluindo tabelas financeiras
(`BillingCheckout`, `Entitlement`, `UsageLedger`, `PaymentEvent`). Esse risco já foi levantado no
code review como **WR-01** e marcado como *skipped* (guidance operacional, sem fix de código seguro)
no `22-REVIEW-FIX.md`. Esta auditoria **não duplica** WR-01; eleva-o a ameaça STRIDE formal
(T-22-01) e o classifica como **risco aceito documentado** com condição de deploy obrigatória.

Verificações secundárias (vazamento de segredos em docs/env, referências residuais a integrações
removidas, preservação de dados de usuário) foram todas **fechadas** por grep no código entregue.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Migration → banco de produção/staging | A migration `20260615010643_remove_orphaned_models` aplicada por `prisma migrate deploy` no pipeline de deploy executa DDL destrutivo (`DROP TABLE`) | Linhas potencialmente existentes em 7 tabelas, incluindo dados financeiros auditáveis (billing/payment) |
| Repositório público/compartilhado → leitor | `.env.example`, `README.md` versionados no git | Nomes de variáveis e placeholders de configuração (sem valores reais) |
| Schema Prisma → dados de usuário | Remoção de relações FK no modelo `User` | Dados de `User` e `ConversationExchange` (PII, histórico de conversas) — devem ser preservados |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-22-01 | Tampering / Denial of Service (perda de dados irreversível) | `prisma/migrations/20260615010643_remove_orphaned_models/migration.sql:31-50` (DROP TABLE em 7 tabelas, incl. billing/payment) | accept | Risco aceito com **condição de deploy obrigatória**: rodar a checagem de contagem (=0) das 7 tabelas antes de `migrate deploy` em qualquer ambiente com dados. Ver Accepted Risks Log AR-01. Atado a WR-01 (`22-REVIEW.md`) e à decisão de skip em `22-REVIEW-FIX.md`. | **open** |
| T-22-02 | Information Disclosure (vazamento de segredo) | `.env.example` | mitigate | Verificado: arquivo contém apenas placeholders (`replace-with-a-long-random-secret`, `OPENAI_API_KEY=""`); bloco `# Billing` renomeado para `# Support` com email/WhatsApp de suporte vazios. Nenhum segredo de Mercado Pago/Stripe/payment presente. | closed |
| T-22-03 | Information Disclosure (vazamento via docs) | `README.md` | mitigate | Verificado: README cita apenas **nomes** de variáveis (`OPENAI_API_KEY`, `BETTER_AUTH_SECRET`) como documentação; nenhum valor de segredo, connection string com credencial real, ou chave embutida. | closed |
| T-22-04 | Tampering (destruição de dados de usuário/PII) | `prisma/schema.prisma` | mitigate | Verificado: modelos `User`, `Session`, `Account`, `Verification` e `ConversationExchange` preservados intactos (schema.prisma:10-84). Relação `User → ConversationExchange` mantida com FK `onDelete: Cascade`. A migration só dropa FKs das tabelas órfãs; não toca dados de usuário. | closed |
| T-22-05 | Elevation of Privilege / Logic flaw (referência pendente a modelo removido) | `apps/**`, `packages/**` | mitigate | Verificado: zero chamadas residuais `prisma.toolRequest/.entitlement/.usageLedger/.billingCheckout/.uploadedFile/.chatMessage/.paymentEvent` no código de aplicação. Remoção completa, sem caminho de runtime que tente acessar tabela inexistente. | closed |
| T-22-06 | Information Disclosure (integração sensível removida ainda referenciada com credencial) | repositório versionado | mitigate | Verificado: referências residuais a "Mercado Pago"/"Stripe" existem apenas em docs de planejamento (`AGENTS.md`, `PRD.md`, `PRD-MILESTONE-PLANILHA-VIVA.md`) como texto histórico/de escopo — sem chaves, tokens ou env vars de pagamento. `PRD-MILESTONE` documenta explicitamente a remoção da monetização. Migration `init` antiga retém `CREATE TABLE` (histórico imutável, correto). | closed |

*Status: open · closed*
*Disposition: mitigate (controle no código) · accept (risco documentado) · transfer (terceiro)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-22-01 / WR-01 | A migration `DROP TABLE` é destrutiva e irreversível para 7 tabelas, incluindo financeiras (`BillingCheckout`, `Entitlement`, `UsageLedger`, `PaymentEvent`). Editar o `.sql` de uma migration já versionada/aplicada provoca **checksum mismatch** em `_prisma_migrations` e trava o `migrate deploy` — pior que o defeito (ver `22-REVIEW-FIX.md`, motivo do skip). O risco é **aceito** sob a condição de deploy abaixo. **Condição obrigatória antes de promover a staging/produção:** rodar a checagem de contagem das 7 tabelas (`SELECT count(*) ... → 0 em todas`) e registrar o resultado; se algum ambiente tiver linhas, arquivar/exportar antes. Contexto v3.0: o produto pivotou para Planilha Viva e a monetização nunca entrou em produção (PRD-MILESTONE D3), portanto a expectativa é tabelas vazias — mas **isso deve ser confirmado por contagem, não assumido**. | pending (requer aprovação humana antes do deploy de produção) | 2026-06-15 |

*Riscos aceitos não ressurgem em auditorias futuras desta fase.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-15 | 6 | 5 | 1 | gsd-security-auditor (retroactive-stride) |

---

## Unregistered Flags (nova superfície de ataque sem mapeamento)

Nenhuma. O `## Threat Flags` não existe no `22-01-SUMMARY.md` (fase de remoção; `tech-tracking.added: []`).
Nenhuma nova superfície de ataque foi introduzida — a fase apenas remove modelos, deps e assets.

---

## Sign-Off

- [x] Todas as ameaças têm disposição (mitigate / accept / transfer)
- [x] Risco aceito documentado no Accepted Risks Log (AR-01)
- [ ] `threats_open: 0` confirmado — **NÃO**: T-22-01 permanece `open` até a aprovação humana da condição de deploy de AR-01 (checagem de contagem das 7 tabelas)
- [ ] `status: verified` definido no frontmatter

**Approval:** pending — bloqueado em AR-01. A fase não introduz vulnerabilidade explorável, mas
o aceite formal do risco de perda de dados (T-22-01) exige assinatura humana + execução da checagem
de contagem antes do deploy de produção.
