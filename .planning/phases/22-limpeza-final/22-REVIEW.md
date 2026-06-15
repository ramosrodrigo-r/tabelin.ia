---
phase: 22-limpeza-final
reviewed: 2026-06-14T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - prisma/migrations/20260615010643_remove_orphaned_models/migration.sql
  - prisma/schema.prisma
  - apps/web/package.json
  - apps/web/src/components/app/workspace-state-context.tsx
  - apps/web/src/features/unified-chat/components/table-grid-panel.tsx
  - apps/web/src/features/unified-chat/hooks/use-formula-engine.ts
  - apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Fase 22: Relatório de Revisão de Código

**Reviewed:** 2026-06-14
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Resumo

A fase 22 ("limpeza-final") removeu 7 modelos Prisma órfãos (`ToolRequest`,
`Entitlement`, `UsageLedger`, `BillingCheckout`, `UploadedFile`, `ChatMessage`,
`PaymentEvent`), removeu dependências npm não usadas (`node-cron`, `recharts`,
`@types/node-cron`) e aplicou correções de lint cirúrgicas em quatro arquivos
`.ts`/`.tsx`.

Foco da revisão adversarial: verificar se a limpeza introduziu regressões.
Resultado da verificação de regressão:

- **Modelos Prisma removidos:** nenhuma referência residual em `apps/` ou
  `packages/` (`prisma.toolRequest`, `.entitlement`, `.uploadedFile`,
  `.chatMessage`, etc. — zero ocorrências). A relação `ConversationExchange`
  em `User` é a única mantida e está íntegra.
- **Migration:** ordem de drops correta — todas as `DropForeignKey` (linhas
  13-29) precedem as `DropTable` (linhas 31-50). `PaymentEvent` não tem FK,
  logo sua ausência de `DropForeignKey` é correta.
- **Deps removidas:** `node-cron` e `recharts` não têm imports residuais no
  código (grep limpo).
- **Lint fixes:** os marcadores `void _exhaustive` / `void _removed` /
  `void _separator` são preservadores de comportamento (ver IN-01). O rename
  `separator → _separator` em `resolveArgument` é seguro: o parâmetro nunca foi
  referenciado no corpo, nem antes nem depois (confirmado contra `bab7858^`).
- **Type fix** em `use-unified-chat-stream.ts`: o guard adicionado é uma
  melhoria de robustez, não uma regressão (ver IN-02).

Nenhum bug de regressão correctness-impacting foi introduzido pela limpeza. As
duas warnings abaixo são defeitos **pré-existentes** que residem dentro do
escopo de arquivos revisados — não foram causados pela fase 22, mas seguem como
defeitos válidos no código submetido.

## Warnings

### WR-01: Perda de dados silenciosa em destinos de DROP TABLE não confirmados

**File:** `prisma/migrations/20260615010643_remove_orphaned_models/migration.sql:31-50`
**Issue:** A migration executa `DROP TABLE` em 7 tabelas. Os próprios avisos
gerados pelo Prisma no topo do arquivo ("If the table is not empty, all the data
it contains will be lost") confirmam o risco. Se algum ambiente (produção,
staging) ainda tiver linhas em `Entitlement`, `BillingCheckout`, `UsageLedger`
ou `PaymentEvent` — tabelas ligadas a billing/pagamento — a aplicação dessa
migration destrói esses dados de forma irreversível, sem backup nem etapa de
verificação. Para tabelas de billing, isso é uma perda de dados financeiros
auditáveis.
**Fix:** Antes de promover essa migration a produção, garantir explicitamente
que as tabelas estão vazias (ou que os dados foram arquivados). Documentar no
plano de deploy uma checagem prévia, por exemplo:
```sql
-- Rodar ANTES de aplicar a migration; deve retornar 0 em todas
SELECT
  (SELECT count(*) FROM "Entitlement")      AS entitlement,
  (SELECT count(*) FROM "BillingCheckout")  AS billing_checkout,
  (SELECT count(*) FROM "UsageLedger")      AS usage_ledger,
  (SELECT count(*) FROM "PaymentEvent")     AS payment_event,
  (SELECT count(*) FROM "ToolRequest")      AS tool_request,
  (SELECT count(*) FROM "UploadedFile")     AS uploaded_file,
  (SELECT count(*) FROM "ChatMessage")      AS chat_message;
```
Se o v3.0 nunca colocou dados nessas tabelas em nenhum ambiente, registrar isso
no SUMMARY para fechar o risco. Defeito pré-existente ao desenho da limpeza, mas
diretamente atado ao artefato entregue na fase.

### WR-02: Asserção de tipo não verificada mascara payload mal-formado

**File:** `apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts:179-181`
**Issue:** O guard `event.payload && typeof event.payload === "object" &&
"metadata" in event.payload` confirma apenas que a *chave* `metadata` existe —
não que seu valor seja um `UnifiedChatStreamMetadata` (com `mode` e
`providerModel` strings). A asserção
`(event.payload as { metadata: UnifiedChatStreamMetadata }).metadata` aceita
qualquer valor sob `metadata` (inclusive `null`, número, ou objeto sem os
campos esperados), que então é gravado em `setMetadata` e consumido a jusante
como se fosse válido. Como `event` já passou por
`unifiedStreamEventSchema.parse`, o risco prático é baixo *se* o schema validar
`payload.metadata` — mas a asserção contorna o sistema de tipos sem essa
garantia explícita aqui.
**Fix:** Derivar o metadata do tipo já validado pelo schema em vez de asserir.
Se `unifiedStreamEventSchema` já tipa `event.payload.metadata`, o cast é
desnecessário e pode ser removido — deixe o TypeScript estreitar o tipo a
partir do schema. Se não tipa, validar com um `safeParse` do sub-schema de
metadata antes do `setMetadata`.

## Info

### IN-01: Marcadores `void _var` são ruído de lint que poderia ser eliminado na origem

**File:** `apps/web/src/components/app/workspace-state-context.tsx:142`,
`apps/web/src/features/unified-chat/components/table-grid-panel.tsx:284`,
`apps/web/src/features/unified-chat/hooks/use-formula-engine.ts:199,446`
**Issue:** As correções de lint adotaram o padrão `void _exhaustive;` /
`void _removed;` / `void _separator;` para suprimir `no-unused-vars`. Funciona e
preserva comportamento, mas o `void` é puramente cosmético: nos casos de
destructure-omit (`const { [key]: _removed, ...rest } = r`) e de parâmetro não
usado (`_separator`), a convenção idiomática é configurar a regra de lint para
ignorar identificadores prefixados com `_` (`argsIgnorePattern`/`varsIgnorePattern`:
`^_`), eliminando a necessidade das linhas `void`.
**Fix:** Adicionar ao ESLint:
```js
"@typescript-eslint/no-unused-vars": ["warn", {
  argsIgnorePattern: "^_",
  varsIgnorePattern: "^_",
  destructuredArrayIgnorePattern: "^_"
}]
```
e remover as linhas `void _*`. Melhoria de manutenibilidade; sem impacto
funcional.

### IN-02: Guard `_exhaustive: never` é dead code defensivo (ok, documentar intenção)

**File:** `apps/web/src/components/app/workspace-state-context.tsx:140-144`,
`apps/web/src/features/unified-chat/components/table-grid-panel.tsx:52-56`
**Issue:** O branch `default` com `const _exhaustive: never = action` é
inalcançável em tempo de execução quando o `Action` union está completo — é um
guard de exaustividade em tempo de compilação. Está correto e é boa prática,
mas o `void _exhaustive` adicionado pela fase 22 só existe para silenciar o lint
sobre uma variável que existe somente para forçar o erro de tipo. Sem ação
obrigatória — apenas confirmando que não é bug.
**Fix:** Nenhuma correção necessária. Opcionalmente, substituir por
`assertNever(action)` (helper compartilhado) para tornar a intenção explícita e
remover o `void`.

### IN-03: `datasource db` sem `url` no schema (pré-existente, fora do escopo da fase)

**File:** `prisma/schema.prisma:5-7`
**Issue:** O bloco `datasource db` declara apenas `provider = "postgresql"`, sem
campo `url`. Isso é pré-existente (idêntico em `bab7858^`) e provavelmente
intencional, pois a URL é injetada via adapter (`@prisma/adapter-pg`) em runtime.
Registrado apenas para completude — não foi tocado pela fase 22 e não é um
defeito da limpeza.
**Fix:** Nenhuma ação na fase 22. Se a intenção é confiar 100% no driver
adapter, considerar um comentário no schema documentando que `url` é provido
programaticamente, para evitar confusão futura.

---

_Reviewed: 2026-06-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
