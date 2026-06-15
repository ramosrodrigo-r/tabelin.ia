---
phase: 22-limpeza-final
fixed_at: 2026-06-14T00:00:00Z
review_path: .planning/phases/22-limpeza-final/22-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 1
skipped: 1
status: partial
---

# Fase 22: Relatório de Correção de Revisão de Código

**Corrigido em:** 2026-06-14
**Revisão de origem:** .planning/phases/22-limpeza-final/22-REVIEW.md
**Iteração:** 1

**Resumo:**
- Findings em escopo: 2 (apenas Warnings — não há Críticos)
- Corrigidos: 1
- Pulados: 1

## Issues Corrigidos

### WR-02: Asserção de tipo não verificada mascara payload mal-formado

**Arquivos modificados:** `packages/shared/src/unified-chat/schema.ts`, `apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts`
**Commit:** 9233107
**Correção aplicada:**

A causa-raiz era que o schema do shared tipava o metadata do stream como
`z.unknown()` (no evento `metadata`) e o payload do evento `complete` jamais
declara um campo `metadata` (`unifiedCompletePayloadSchema` =
`tableSpecPayload | qaResponsePayload`). Por isso a asserção
`(event.payload as { metadata: UnifiedChatStreamMetadata }).metadata` contornava
o sistema de tipos sem garantia alguma sobre a forma do valor.

Correção, fiel ao Fix sugerido (derivar do schema / validar com safeParse):

1. **`packages/shared/src/unified-chat/schema.ts`** — adicionado o sub-schema
   `unifiedChatStreamMetadataSchema = z.object({ mode: z.string(), providerModel:
   z.string() })`, tipado o evento `metadata` com ele (substituindo `z.unknown()`)
   e exportado o tipo inferido `UnifiedChatStreamMetadata`. Agora o metadata do
   stream é validado em runtime no ponto de parse.

2. **`apps/web/src/.../use-unified-chat-stream.ts`** —
   - O tipo local duplicado `UnifiedChatStreamMetadata` foi substituído por um
     re-export do tipo canônico do shared (API pública do hook preservada;
     confirmado que nenhum consumidor externo importa esse tipo do hook).
   - No evento `metadata`, removido o cast `as UnifiedChatStreamMetadata`:
     `event.metadata` já é estreitado pelo schema.
   - No evento `complete`, substituída a asserção cega por
     `unifiedChatStreamMetadataSchema.safeParse(...)`; só quando `success` é
     `true` o valor é atribuído a `finalMetadata`. Payloads mal-formados são
     descartados em vez de propagados para `setMetadata` a jusante.

**Verificação:** `pnpm -w run typecheck` passa em `packages/shared` e `apps/web`
após `prisma generate`. Mudança preserva o comportamento do caminho feliz (o
backend emite `{ mode, providerModel }` no evento `metadata`, linha 212 de
`route.ts`) e endurece o caminho de fallback do evento `complete`.

## Issues Pulados

### WR-01: Perda de dados silenciosa em destinos de DROP TABLE não confirmados

**Arquivo:** `prisma/migrations/20260615010643_remove_orphaned_models/migration.sql:31-50`
**Motivo:** skipped — guidance operacional/pré-deploy, sem mudança de código-fonte segura aplicável.

O finding diz respeito a uma migration Prisma **já aplicada** e versionada. O
próprio Fix do review é explicitamente operacional ("Antes de promover essa
migration a produção, garantir... Documentar no plano de deploy uma checagem
prévia... registrar no SUMMARY"), não uma edição do artefato.

Editar o `.sql` de uma migration já aplicada é inseguro e introduziria uma
regressão maior que o defeito: o Prisma registra o checksum de cada migration em
`_prisma_migrations` e valida no `prisma migrate deploy`. Alterar o conteúdo
(ex.: adicionar guardas `IF EXISTS` ou contagens defensivas) provocaria
checksum mismatch e travaria o deploy em qualquer ambiente que já tenha aplicado
a migration. Não há, portanto, uma edição de código que o fixer possa aplicar
com segurança a este artefato.

Ação recomendada (humana, fora do escopo de fix automático): antes de promover a
migration a staging/produção, rodar a checagem de contagem sugerida no review
(`SELECT count(*)` nas 7 tabelas, esperando 0 em todas) e registrar o resultado
no SUMMARY da fase. Se o v3.0 nunca populou essas tabelas em nenhum ambiente,
documentar isso para fechar o risco.

**Issue original:** A migration executa `DROP TABLE` em 7 tabelas (incluindo
tabelas de billing/pagamento — `Entitlement`, `BillingCheckout`, `UsageLedger`,
`PaymentEvent`). Se algum ambiente ainda tiver linhas, a aplicação destrói esses
dados de forma irreversível, sem backup nem etapa de verificação.

---

_Corrigido: 2026-06-14_
_Fixer: Claude (gsd-code-fixer)_
_Iteração: 1_
