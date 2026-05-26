---
phase: 03-multi-tool-generation-suite
reviewed: 2026-05-25T00:00:00Z
depth: standard
files_reviewed: 43
files_reviewed_list:
  - apps/web/package.json
  - apps/web/src/app/api/tools/regex/explain/route.ts
  - apps/web/src/app/api/tools/regex/generate/route.ts
  - apps/web/src/app/api/tools/scripts/generate/route.ts
  - apps/web/src/app/api/tools/sql/generate/route.ts
  - apps/web/src/app/api/tools/template/generate/route.ts
  - apps/web/src/app/(workspace)/workspace/regex/page.tsx
  - apps/web/src/app/(workspace)/workspace/scripts/page.tsx
  - apps/web/src/app/(workspace)/workspace/sql/page.tsx
  - apps/web/src/app/(workspace)/workspace/templates/page.tsx
  - apps/web/src/components/app/sidebar.tsx
  - apps/web/src/features/regex/components/regex-input-panel.tsx
  - apps/web/src/features/regex/components/regex-output-panel.tsx
  - apps/web/src/features/regex/hooks/use-regex-stream.ts
  - apps/web/src/features/regex/regex-tool.tsx
  - apps/web/src/features/scripts/components/scripts-input-panel.tsx
  - apps/web/src/features/scripts/components/scripts-output-panel.tsx
  - apps/web/src/features/scripts/hooks/use-scripts-stream.ts
  - apps/web/src/features/scripts/scripts-tool.tsx
  - apps/web/src/features/sql/components/sql-input-panel.tsx
  - apps/web/src/features/sql/components/sql-output-panel.tsx
  - apps/web/src/features/sql/hooks/use-sql-stream.ts
  - apps/web/src/features/sql/sql-tool.tsx
  - apps/web/src/features/template/components/template-input-panel.tsx
  - apps/web/src/features/template/components/template-output-panel.tsx
  - apps/web/src/features/template/hooks/use-template-stream.ts
  - apps/web/src/features/template/template-tool.tsx
  - apps/web/src/server/ai/destructive-classifier.ts
  - apps/web/src/server/ai/regex-stream.ts
  - apps/web/src/server/ai/scripts-stream.ts
  - apps/web/src/server/ai/sql-stream.ts
  - apps/web/src/server/ai/template-stream.ts
  - apps/web/src/server/tools/tool-repository.ts
  - packages/shared/src/index.ts
  - packages/shared/src/regex/fixtures.ts
  - packages/shared/src/regex/schema.ts
  - packages/shared/src/scripts/fixtures.ts
  - packages/shared/src/scripts/schema.ts
  - packages/shared/src/sql/fixtures.ts
  - packages/shared/src/sql/schema.ts
  - packages/shared/src/template/fixtures.ts
  - packages/shared/src/template/schema.ts
  - prisma/schema.prisma
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
status: issues_found
---

# Fase 03: Relatório de Code Review

**Revisado em:** 2026-05-25
**Profundidade:** standard
**Arquivos revisados:** 43
**Status:** issues_found

## Resumo

A fase 03 introduz quatro novos tools de geração (Regex, Scripts, SQL, Template) com uma
arquitetura coesa: schemas Zod no pacote shared, server actions com classificador destrutivo,
hooks de streaming no cliente e painéis de entrada/saída. A estrutura geral é sólida e segue
os padrões estabelecidos pelo tool de Formula existente.

Foram identificados dois problemas críticos: ausência de limite de tamanho nos campos de
entrada (risco de abuso de custo com a API OpenAI) e fixture ausente para o tipo
`airtable_script` (retorna fixture errada em ambiente sem `OPENAI_API_KEY`). Cinco warnings
cobrem: loop de streaming sem tratamento de erros de rede, `JSON.parse` sem try/catch nos
hooks, regex de classificação UPDATE com falso negativo em multi-statement, lógica de warning
destrutivo inconsistente entre SQL e Scripts, e duplicação de lógica de classificação no
frontend.

---

## Critical Issues

### CR-01: Ausência de `maxLength` nos schemas de entrada — risco de abuso de custo OpenAI

**Arquivo:** `packages/shared/src/regex/schema.ts:4`, `packages/shared/src/scripts/schema.ts:19`, `packages/shared/src/sql/schema.ts:22`, `packages/shared/src/template/schema.ts:3`

**Issue:** Todos os schemas de request definem apenas `min(3)` (ou `min(1)`) no campo `prompt`/`pattern`, sem limite superior. Um usuário autenticado pode enviar um payload de centenas de KB que passa pela validação, reserva quota e é enviado integralmente à API OpenAI. Como a quota-service controla contagem de chamadas (não volume de tokens), isso permite consumo irrestrito de tokens por chamada. O mesmo vale para `pattern` no explain de regex.

**Fix:**
```typescript
// packages/shared/src/regex/schema.ts
export const regexGenerateRequestSchema = z.object({
  prompt: z.string().trim().min(3, "Descreva o padrao antes de gerar.").max(2000, "Descricao muito longa.")
});

export const regexExplainRequestSchema = z.object({
  pattern: z.string().trim().min(1, "Cole uma expressao regular antes de explicar.").max(500, "Expressao muito longa.")
});

// Idem para scriptGenerateRequestSchema.prompt (max: 2000)
// Idem para sqlGenerateRequestSchema.prompt (max: 2000)
// Idem para templateGenerateRequestSchema.prompt (max: 2000)
```

---

### CR-02: Fixture ausente para `airtable_script` — retorna VBA em modo sem API key

**Arquivo:** `packages/shared/src/scripts/fixtures.ts:1-31`, `apps/web/src/server/ai/scripts-stream.ts:21`

**Issue:** `SCRIPT_FIXTURES` contém apenas duas entradas: `vba` e `apps_script`. Quando `OPENAI_API_KEY` não está definida (ambiente de desenvolvimento ou testes), a linha:

```typescript
const fixture = SCRIPT_FIXTURES.find((f) => f.metadata.scriptType === request.scriptType) ?? SCRIPT_FIXTURES[0];
```

cai no fallback `SCRIPT_FIXTURES[0]` (VBA) para qualquer request com `scriptType: "airtable_script"`. O cliente recebe código VBA quando pediu Airtable Script, com `metadata.scriptType` sobrescrito para `airtable_script` — o que faz o highlight errado no painel (usa `"text"` ao invés de `"javascript"`, pois a fixture tem `scriptType: "airtable_script"` no metadata após o spread). Mais grave: em testes automatizados que verificam o conteúdo retornado, o comportamento é silenciosamente incorreto.

**Fix:**
```typescript
// packages/shared/src/scripts/fixtures.ts — adicionar terceira fixture
export const SCRIPT_FIXTURES: ScriptGenerateResponse[] = [
  // ... vba e apps_script existentes ...
  {
    kind: "script",
    code: 'output.set("message", "Total: " + input.config.total);',
    explanation: "Exemplo de Airtable Script que exibe o total configurado na saída.",
    assumptions: ["O campo 'total' está configurado como parâmetro de entrada do script."],
    warnings: [],
    isDestructive: false,
    metadata: { mode: "generate", scriptType: "airtable_script", isDestructive: false, providerModel: "fixture" }
  }
];
```

---

## Warnings

### WR-01: Loop de streaming sem tratamento de erros de rede — status "error" nunca setado em falha de conexão

**Arquivo:** `apps/web/src/features/regex/hooks/use-regex-stream.ts:74-90`, `apps/web/src/features/scripts/hooks/use-scripts-stream.ts:70-86`, `apps/web/src/features/sql/hooks/use-sql-stream.ts:70-86`, `apps/web/src/features/template/hooks/use-template-stream.ts:79-95`

**Issue:** O `while(true)` que lê o stream não tem bloco `try/catch`. Se a conexão cair após o streaming ter iniciado (ex: usuário perde internet, servidor fecha a conexão abruptamente), `reader.read()` lança um `TypeError` (ex: "network error") que sobe como exceção não capturada. O estado `status` permanece `"streaming"` indefinidamente, prendendo o usuário numa UI de carregamento sem saída.

**Fix:**
```typescript
// Envolver o loop de leitura em try/catch em todos os quatro hooks
setStatus("streaming");
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

try {
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      // JSON.parse também deve ser protegido (ver WR-02)
      const event = regexStreamEventSchema.parse(JSON.parse(line));
      // ... handlers de eventos
    }
  }
} catch {
  setStatus("error");
  setError("Conexao interrompida. Tente novamente.");
}
```

---

### WR-02: `JSON.parse` sem try/catch nos hooks de stream — exceção não tratada em payload malformado

**Arquivo:** `apps/web/src/features/regex/hooks/use-regex-stream.ts:82`, `apps/web/src/features/scripts/hooks/use-scripts-stream.ts:78`, `apps/web/src/features/sql/hooks/use-sql-stream.ts:78`, `apps/web/src/features/template/hooks/use-template-stream.ts:87`

**Issue:** `JSON.parse(line)` e `regexStreamEventSchema.parse(...)` (que pode lançar `ZodError`) são chamados sem try/catch. Se o servidor enviar uma linha com JSON inválido (truncamento de buffer, caractere inesperado), a exceção propaga para fora do `useCallback`, sem setar `status: "error"`. O erro aparece apenas no console do navegador, sem feedback ao usuário. Este problema é separado do WR-01 porque pode ocorrer mesmo com conexão estável (ex: bug no servidor enviando linha parcial).

**Fix:**
```typescript
for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const parsed = JSON.parse(line);
    const event = regexStreamEventSchema.safeParse(parsed);
    if (!event.success) continue; // ignorar eventos desconhecidos graciosamente
    const ev = event.data;
    if (ev.type === "metadata") { setMetadata(ev.metadata); }
    // ... demais handlers
  } catch {
    // linha malformada — ignorar e continuar
  }
}
```

---

### WR-03: Regex UPDATE sem WHERE no classificador ignora ponto-e-vírgula — falso negativo em multi-statement

**Arquivo:** `apps/web/src/server/ai/destructive-classifier.ts:38-44`

**Issue:** O padrão `/\bUPDATE\b(?![^;]*\bWHERE\b)/i` usa lookahead negativo que consome até o fim da string (`[^;]*` não está limitado ao statement atual). Se o código gerado contiver dois statements separados por `;` — um `UPDATE sem WHERE` seguido de qualquer statement com `WHERE` — o lookahead pode consumir o `WHERE` do segundo statement e classificar o UPDATE incorretamente como não-destrutivo.

Exemplo que produz falso negativo:
```sql
UPDATE usuarios SET ativo = 0;
SELECT * FROM logs WHERE id = 1;
```

O `hasSqlDestructiveDelete` resolve isso corretamente com `split(";")`. O UPDATE deveria usar a mesma abordagem.

**Fix:**
```typescript
// Em destructive-classifier.ts, substituir a verificação de UPDATE
function hasSqlDestructiveUpdate(code: string): boolean {
  const statements = code.split(/;/);
  return statements.some((stmt) => {
    const trimmed = stmt.trim().toUpperCase();
    return trimmed.startsWith("UPDATE") && !trimmed.includes("WHERE");
  });
}

// Na função classifyDestructive:
const hasOtherDestructive = [
  /\bDROP\b/i,
  /\bTRUNCATE\b/i
].some((pattern) => pattern.test(code));

return hasOtherDestructive || hasSqlDestructiveDelete(code) || hasSqlDestructiveUpdate(code);
```

---

### WR-04: Warning de script destrutivo usa mensagem genérica hardcoded, ignorando o classificador do servidor

**Arquivo:** `apps/web/src/features/scripts/components/scripts-output-panel.tsx:68-76`

**Issue:** O painel de scripts exibe sempre a mesma mensagem genérica quando `result.isDestructive` é `true`:

```tsx
<p>Esta operacao remove dados da planilha ou base permanentemente. Nao pode ser desfeita.</p>
```

O painel de SQL faz diferente: tem uma função `getSqlWarningMessage` que analisa o conteúdo e retorna mensagem contextual (ex: "DELETE sem WHERE...", "DROP/TRUNCATE..."). O classificador do servidor (`getDestructiveMessage`) já gera a mensagem correta para scripts, mas esse valor nunca é enviado ao cliente — apenas o booleano `isDestructive` chega no payload. O resultado é que todos os scripts destrutivos mostram o mesmo aviso genérico independentemente do padrão detectado (DeleteFile vs Rows.Delete), reduzindo a utilidade do aviso de segurança.

**Fix (opção mais simples):** Adicionar o campo `destructiveMessage` no response schema:
```typescript
// packages/shared/src/scripts/schema.ts
export const scriptGenerateResponseSchema = z.object({
  // ...campos existentes...
  isDestructive: z.boolean().default(false),
  destructiveMessage: z.string().optional(), // mensagem contextual do servidor
  metadata: scriptMetadataSchema
});
```

E no servidor (`scripts-stream.ts`), popular o campo com `getDestructiveMessage(code, "script")` quando `isDestructive` for `true`. O painel então usa `result.destructiveMessage ?? "mensagem genérica"`.

---

### WR-05: Lógica de classificação destrutiva duplicada no frontend com padrões divergentes do servidor

**Arquivo:** `apps/web/src/features/sql/components/sql-output-panel.tsx:11-23`

**Issue:** `getSqlWarningMessage` no frontend reimplementa a detecção de operações destrutivas com expressões regulares diferentes das usadas em `destructive-classifier.ts` no servidor. Exemplo de divergência:

- **Servidor** (`destructive-classifier.ts:38`): `/\bUPDATE\b(?![^;]*\bWHERE\b)/i`
- **Frontend** (`sql-output-panel.tsx:19`): `/UPDATE\b(?![\s\S]*\bWHERE\b)/` — sem flag `i`, sem `\b` no início, sem delimitador de statement

Isso significa que o servidor pode marcar `isDestructive: true` (usando `getDestructiveMessage`) mas o frontend pode selecionar uma mensagem errada (ou vice-versa). A fonte da verdade deve ser o servidor. A mensagem contextual deveria vir no payload, não ser recalculada no cliente.

**Fix:** Adotar a mesma solução do WR-04: incluir `destructiveMessage` no `sqlGenerateResponseSchema` e popular no servidor com `getDestructiveMessage(query, "sql")`. O frontend usa diretamente `result.destructiveMessage` e elimina `getSqlWarningMessage`.

---

## Info

### IN-01: `warnings` prop não utilizada nos painéis de output

**Arquivo:** `apps/web/src/features/regex/components/regex-output-panel.tsx:16`, `apps/web/src/features/scripts/components/scripts-output-panel.tsx:27`, `apps/web/src/features/sql/components/sql-output-panel.tsx:37`, `apps/web/src/features/template/components/template-output-panel.tsx:17`

**Issue:** Todos os quatro painéis de output recebem a prop `warnings: string[]` na assinatura, mas nenhum a renderiza. Os eventos `warning` do stream são processados nos hooks e acumulados no estado, mas nunca chegam a ser exibidos na UI. O campo `warnings` existe nos schemas (para SQL: alertas sobre performance de query; para regex: avisos sobre padrões ambíguos), mas é silenciosamente descartado. Usuários não recebem esses avisos.

**Fix:** Adicionar renderização dos warnings nos painéis, similar ao `note-block` existente:
```tsx
{warnings.length > 0 ? (
  <div className="note-block warning">
    <h3>Avisos</h3>
    <ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
  </div>
) : null}
```

---

### IN-02: `metadata` prop não utilizada em `TemplateOutputPanel`

**Arquivo:** `apps/web/src/features/template/components/template-output-panel.tsx:13`

**Issue:** A prop `metadata: TemplateMetadata | null` é declarada na interface do componente, mas nunca é consumida no JSX. Diferente dos outros painéis que exibem `dialectLabel` ou `scriptTypeLabel`, o template não tem metadados visuais a exibir (o schema só tem `mode` e `providerModel`). A prop pode ser removida da interface para evitar ruído, ou mantida para consistência futura. Como está, TypeScript não acusa erro mas é dead prop.

**Fix:** Remover a prop da interface e do componente pai, ou adicionar um comentário explicando a intenção de uso futuro:
```typescript
// Opção 1: remover da interface do componente e do call-site em template-tool.tsx
// Opção 2: manter com comentário
/** @reserved para uso futuro: exibir modelo provedor quando houver múltiplos providers */
metadata: TemplateMetadata | null;
```

---

### IN-03: Fixture de SQL tem apenas dialeto `postgresql` — outros dialetos retornam fixture PostgreSQL em dev

**Arquivo:** `packages/shared/src/sql/fixtures.ts:1-23`

**Issue:** `SQL_FIXTURES` tem uma única entrada com `dialect: "postgresql"`. Quando `OPENAI_API_KEY` não está definida e o usuário seleciona `mysql`, `sqlserver`, `oracle` ou `bigquery`, o `.find()` falha e cai no fallback `SQL_FIXTURES[0]` (PostgreSQL), retornando fixture de PostgreSQL com `metadata.dialect` sobrescrito. Similarmente ao CR-02 (scripts), o comportamento em dev/teste não corresponde ao de produção. O impacto é menor (não há highlight específico por dialeto SQL, ao contrário de VBA vs JS nos scripts), mas compromete a fidelidade dos testes.

**Fix:** Adicionar pelo menos uma fixture por dialeto, ou documentar explicitamente que o modo fixture usa sempre PostgreSQL como placeholder:
```typescript
// Opção simples: comentário explícito na função
// Em sql-stream.ts:
// Nota: em dev sem API key, sempre retorna fixture PostgreSQL independente do dialeto selecionado.
// Para testes de integração reais, defina OPENAI_API_KEY.
```

---

_Revisado em: 2026-05-25_
_Revisor: Claude (gsd-code-reviewer)_
_Profundidade: standard_
