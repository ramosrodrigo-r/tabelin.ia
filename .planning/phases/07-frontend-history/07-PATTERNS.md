# Phase 7: Frontend History — Mapa de Padrões

**Mapeado:** 2026-05-29
**Arquivos analisados:** 9 (3 novos, 6 modificados)
**Análogos encontrados:** 9 / 9

---

## Classificação de Arquivos

| Arquivo novo / modificado | Role | Data Flow | Análogo mais próximo | Qualidade |
|---------------------------|------|-----------|----------------------|-----------|
| `apps/web/src/server/tools/conversation-repository.ts` (modificar — adicionar `findConversationExchanges` + `deleteConversationExchanges`) | service | CRUD | `apps/web/src/server/file-analysis/file-repository.ts` | exact |
| `apps/web/src/app/api/conversations/[tool]/route.ts` (criar — método DELETE) | controller | request-response | `apps/web/src/app/api/tools/formula/generate/route.ts` | role-match |
| `apps/web/src/components/app/topbar.tsx` (modificar — adicionar botão + popover) | component | event-driven | `apps/web/src/components/app/topbar.tsx` (próprio arquivo) | exact |
| `apps/web/src/app/(workspace)/workspace/page.tsx` (modificar — prefetch de exchanges) | route / server component | request-response | `apps/web/src/app/(workspace)/workspace/sql/page.tsx` | exact |
| `apps/web/src/app/(workspace)/workspace/sql/page.tsx` (modificar) | route / server component | request-response | `apps/web/src/app/(workspace)/workspace/page.tsx` | exact |
| `apps/web/src/app/(workspace)/workspace/regex/page.tsx` (modificar) | route / server component | request-response | `apps/web/src/app/(workspace)/workspace/page.tsx` | exact |
| `apps/web/src/app/(workspace)/workspace/scripts/page.tsx` (modificar) | route / server component | request-response | `apps/web/src/app/(workspace)/workspace/page.tsx` | exact |
| `apps/web/src/app/(workspace)/workspace/templates/page.tsx` (modificar) | route / server component | request-response | `apps/web/src/app/(workspace)/workspace/page.tsx` | exact |
| `apps/web/src/features/formula/formula-tool.tsx` (modificar — seed de exchanges + seletores) + análogos SQL/Regex/Scripts/Template | component | event-driven | `apps/web/src/features/formula/formula-tool.tsx` (próprio) | exact |

---

## Atribuições de Padrão

### `apps/web/src/server/tools/conversation-repository.ts` — funções novas

**Análogo:** `apps/web/src/server/file-analysis/file-repository.ts`

Este arquivo já existe e contém `saveConversationExchange`. As duas novas funções
(`findConversationExchanges` e `deleteConversationExchanges`) seguem o padrão do
`file-repository.ts`: importação isolada (`"server-only"`), guard IDOR (sempre
`userId` + chave de domínio), try/catch silencioso com `console.warn`, retorno
`null` / `[]` em caso de erro.

**Padrão de importação + guard IDOR** (file-repository.ts linhas 1-4 e 41-49):
```typescript
import "server-only";
import { prisma } from "@/server/db/client";

// IDOR guard — tanto userId quanto a chave de domínio precisam estar no where
export async function findUploadedFileByIdAndUser(id: string, userId: string) {
  try {
    return await prisma.uploadedFile.findFirst({
      where: { id, userId }   // nunca buscar só por id
    });
  } catch {
    console.warn("UploadedFile lookup failed.");
    return null;
  }
}
```

**Padrão de leitura com ordenação** (file-repository.ts linhas 73-86):
```typescript
export async function getRecentMessages(uploadedFileId: string, limit = 10) {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { uploadedFileId },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    return messages.reverse();   // retornar em ordem cronológica
  } catch {
    console.warn("getRecentMessages failed.");
    return [];   // nunca throw — caller recebe array vazio
  }
}
```

**Padrão de deleção em massa** (conversation-repository.ts linhas 37-39 — já presente no save):
```typescript
await tx.conversationExchange.deleteMany({
  where: { id: { in: toDelete.map((r) => r.id) } },
});
```

**Schema do model alvo** (prisma/schema.prisma linhas 193-206):
```prisma
model ConversationExchange {
  id               String   @id @default(cuid())
  userId           String
  toolKind         String
  mode             String
  platform         String?
  dialect          String?
  userPrompt       String   @db.Text
  assistantPayload Json     @db.Json
  createdAt        DateTime @default(now())
  @@index([userId, toolKind, createdAt])
}
```

**Implementação alvo das novas funções** (copiar estrutura acima, adaptar para ConversationExchange):
```typescript
// Leitura — IDOR: userId + toolKind, ordenado por createdAt asc
export async function findConversationExchanges(userId: string, toolKind: string) {
  try {
    return await prisma.conversationExchange.findMany({
      where: { userId, toolKind },
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    console.warn("ConversationExchange read skipped.", err);
    return [];
  }
}

// Delete hard — IDOR: userId + toolKind em todas as queries
export async function deleteConversationExchanges(userId: string, toolKind: string) {
  try {
    return await prisma.conversationExchange.deleteMany({
      where: { userId, toolKind },
    });
  } catch (err) {
    console.warn("ConversationExchange delete skipped.", err);
    return null;
  }
}
```

---

### `apps/web/src/app/api/conversations/[tool]/route.ts` (novo — DELETE)

**Análogo:** `apps/web/src/app/api/tools/formula/generate/route.ts`

**Padrão de importações** (route.ts linhas 1-9):
```typescript
import { NextResponse } from "next/server";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { deleteConversationExchanges } from "@/server/tools/conversation-repository";
```

**Padrão de autenticação** (route.ts linhas 11-15):
```typescript
export async function DELETE(request: Request, { params }: { params: { tool: string } }) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }
  // ...
}
```

**Padrão de validação de enum** — `toolKind` deve ser validado contra os valores
reconhecidos antes de qualquer query (mesma lógica de D-09 da Phase 6 e do padrão de
`toolKind` em conversation-repository.ts):
```typescript
const VALID_TOOL_KINDS = ["formula", "sql", "regex", "scripts", "template"] as const;
type ToolKind = typeof VALID_TOOL_KINDS[number];

function isValidToolKind(value: string): value is ToolKind {
  return VALID_TOOL_KINDS.includes(value as ToolKind);
}

const toolKind = params.tool;
if (!isValidToolKind(toolKind)) {
  return NextResponse.json({ error: "Tool invalido." }, { status: 400 });
}
```

**Padrão de resposta de sucesso** (pattern de route.ts linha 94):
```typescript
// Após deleteConversationExchanges(user.id, toolKind):
return NextResponse.json({ ok: true }, { status: 200 });
```

**Padrão de erro de servidor** (route.ts linhas 65-68):
```typescript
} catch {
  return NextResponse.json({ error: "Erro interno." }, { status: 500 });
}
```

---

### `apps/web/src/components/app/topbar.tsx` (modificar)

**Análogo:** próprio arquivo (`apps/web/src/components/app/topbar.tsx`)

Este arquivo é modificado para receber uma prop opcional `toolKind?: string` e
renderizar o botão "Nova conversa" + popover de confirmação quando `toolKind` estiver
presente. A mecânica do popover replica exatamente o padrão `.account-menu-container` /
`.account-menu` já existente no mesmo arquivo.

**Padrão de estado do menu existente** (topbar.tsx linhas 21 e 39-81):
```tsx
const [showAccountMenu, setShowAccountMenu] = useState(false);

// Container com position: relative — âncora do dropdown
<div className="account-menu-container">
  <button
    className="ghost-button"
    type="button"
    onClick={() => setShowAccountMenu(!showAccountMenu)}
    aria-expanded={showAccountMenu}
    aria-haspopup="true"
  >
    {user.email}
  </button>
  {showAccountMenu ? (
    <div className="account-menu" role="menu">
      {/* itens */}
    </div>
  ) : null}
</div>
```

**CSS do dropdown existente** (globals.css linhas 309-324):
```css
.account-menu-container {
  position: relative;
}
.account-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 10;
  width: 220px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  box-shadow: 0 8px 24px rgb(15 23 42 / 12%);
  padding: 8px;
}
```

**Padrão ghost-button** (globals.css linhas 168-187):
```css
.ghost-button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fff;
  color: var(--text);
  cursor: pointer;
  padding: 0 12px;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.ghost-button:hover {
  border-color: rgb(11 107 87 / 40%);
  background: rgb(11 107 87 / 5%);
  color: var(--primary);
}
```

**Estrutura alvo do botão "Nova conversa" no topbar** — adicionar antes do
`.account-menu-container` existente, dentro de `.topbar-actions`:
```tsx
// Props novas: toolKind?: string, onNewConversation?: () => void
// Estado novo:
const [showNewConvPopover, setShowNewConvPopover] = useState(false);

// No JSX, dentro de .topbar-actions:
{toolKind ? (
  <div className="account-menu-container">
    <button
      className="ghost-button"
      type="button"
      onClick={() => setShowNewConvPopover(!showNewConvPopover)}
      aria-expanded={showNewConvPopover}
      aria-haspopup="dialog"
    >
      Nova conversa
    </button>
    {showNewConvPopover ? (
      <div
        className="account-menu"
        role="dialog"
        aria-label="Confirmar exclusão do histórico"
      >
        <p style={{ margin: 0, padding: "4px 8px 8px", fontSize: 14 }}>
          Apagar o histórico deste tool? Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: "flex", gap: 8, padding: "0 4px 4px" }}>
          <button
            className="ghost-button"
            type="button"
            style={{ color: "var(--destructive)", borderColor: "var(--destructive)" }}
            onClick={handleDeleteHistory}
          >
            Apagar histórico
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => setShowNewConvPopover(false)}
          >
            Cancelar
          </button>
        </div>
      </div>
    ) : null}
  </div>
) : null}
```

**Padrão de `handleDeleteHistory`** — chama `DELETE /api/conversations/[tool]`,
limpa estado local via callback prop, fecha popover:
```tsx
async function handleDeleteHistory() {
  await fetch(`/api/conversations/${toolKind}`, { method: "DELETE" });
  onNewConversation?.();
  setShowNewConvPopover(false);
}
```

> Accessibilidade: adicionar `useEffect` para fechar com Esc e click-outside,
> retornar foco ao trigger após fechar — segue o mesmo padrão que seria necessário
> no `.account-menu` se ele exigisse acessibilidade completa.

---

### Pages server component — prefetch de exchanges

**Análogo:** `apps/web/src/app/(workspace)/workspace/page.tsx` (Formula)
e `apps/web/src/app/(workspace)/workspace/sql/page.tsx` (SQL)

Todos os 5 pages seguem exatamente o mesmo padrão: importam `getCachedUser` /
`getCachedEntitlement`, aguardam os dois e passam como props ao tool component.
A modificação da Phase 7 acrescenta uma terceira busca: `findConversationExchanges`.

**Padrão atual** (workspace/page.tsx linhas 1-9):
```typescript
import { FormulaTool } from "@/features/formula/formula-tool";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";

export default async function WorkspacePage() {
  const user = await getCachedUser();
  const entitlement = await getCachedEntitlement(user!.id);

  return <FormulaTool entitlement={entitlement} />;
}
```

**Padrão modificado para Phase 7** — acrescentar `findConversationExchanges`
e passar `initialExchanges` para o tool component:
```typescript
import { FormulaTool } from "@/features/formula/formula-tool";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";
import { findConversationExchanges } from "@/server/tools/conversation-repository";

export default async function WorkspacePage() {
  const user = await getCachedUser();
  const entitlement = await getCachedEntitlement(user!.id);
  // D-10: erro de leitura não bloqueia — findConversationExchanges retorna [] em caso de falha
  const initialExchanges = await findConversationExchanges(user!.id, "formula");

  return <FormulaTool entitlement={entitlement} initialExchanges={initialExchanges} />;
}
```

> Aplicar o mesmo delta nos outros 4 pages (`sql`, `regex`, `scripts`, `templates`),
> trocando `"formula"` pelo `toolKind` correspondente.

---

### Tool components — seed de exchanges e seletores (Formula, SQL, Regex, Scripts, Template)

**Análogo:** `apps/web/src/features/formula/formula-tool.tsx` (padrão canônico)

Todos os 5 tool components seguem estrutura idêntica. A modificação da Phase 7
consiste em:
1. Aceitar prop `initialExchanges` (array dos exchanges persistidos).
2. Usar o array como valor inicial do `useState` de `exchanges`.
3. Restaurar seletores (platform, dialect, mode) a partir do exchange mais recente.

**Estado atual — exchanges começa vazio** (formula-tool.tsx linhas 33):
```tsx
const [exchanges, setExchanges] = useState<FormulaExchange[]>([]);
```

**Padrão modificado — seed com dados do servidor**:
```tsx
// Tipo importado do repository ou mapeado localmente
type PersistedExchange = {
  id: string;
  userPrompt: string;
  assistantPayload: unknown;
  mode: string;
  platform: string | null;
  dialect: string | null;
  createdAt: Date;
};

export function FormulaTool({
  entitlement,
  initialExchanges = [],
}: {
  entitlement: UserEntitlement;
  initialExchanges?: PersistedExchange[];
}) {
  // Mapear exchanges persistidos para FormulaExchange na inicialização
  const [exchanges, setExchanges] = useState<FormulaExchange[]>(() =>
    initialExchanges.map((ex) => ({
      id: ex.id,
      userText: ex.userPrompt,
      status: "complete" as const,
      result: (ex.assistantPayload as FormulaCompletePayload) ?? null,
      metadata: null,
      warnings: [],
      error: "",
    }))
  );

  // D-08: restaurar seletores do exchange mais recente
  const lastEx = initialExchanges[initialExchanges.length - 1];
  const [platform, setPlatform] = useState<FormulaPlatform>(
    (lastEx?.platform as FormulaPlatform) ?? "excel"
  );
  const [formulaLanguage, setFormulaLanguage] = useState<FormulaLanguage>(
    (lastEx?.dialect as FormulaLanguage) ?? "pt-BR"
  );
  const [mode, setMode] = useState<FormulaMode>(
    (lastEx?.mode as FormulaMode) ?? "generate"
  );
  // ... restante do estado inalterado
```

**Padrão do chat-thread existente** (formula-tool.tsx linhas 86-118) — renderização
dos exchanges já está correta; exchanges históricos entram na mesma estrutura:
```tsx
{(exchanges.length > 0 || (submittedText && stream.status !== "idle")) ? (
  <div className="chat-thread">
    {exchanges.map((ex) => (
      <div key={ex.id} className="chat-exchange">
        <div className="user-bubble">{ex.userText}</div>
        <FormulaOutputPanel
          status={ex.status}
          draft=""
          result={ex.result}
          metadata={ex.metadata}
          warnings={ex.warnings}
          error={ex.error}
          onRetry={submit}
        />
      </div>
    ))}
    {/* exchange em streaming — inalterado */}
  </div>
) : null}
```

**Callback `onNewConversation`** — recebido do Topbar (via prop ou contexto),
limpa o estado local:
```tsx
function handleNewConversation() {
  setExchanges([]);
  setSubmittedText("");
  stream.reset?.();   // se o hook expõe reset
}
```

> Para SQL, o análogo é `sql-tool.tsx` (sem `platform` / `formulaLanguage`; só
> `dialect`). Para Regex, `regex-tool.tsx` (sem `platform` / `dialect`; só `mode`).
> Para Scripts, `scripts-tool.tsx` (`scriptType` em vez de `platform`). Para Template,
> `template-tool.tsx` (sem seletores de domínio — apenas `mode` implícito "generate").

---

## Padrões Compartilhados

### Autenticação em route handlers
**Fonte:** `apps/web/src/app/api/tools/formula/generate/route.ts` linhas 11-15
**Aplicar em:** `DELETE /api/conversations/[tool]/route.ts`
```typescript
const user = getSessionFromCookieHeader(request.headers.get("cookie"));
if (!user) {
  return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
}
```

### IDOR guard nas queries de banco
**Fonte:** `apps/web/src/server/file-analysis/file-repository.ts` linhas 41-49
**Aplicar em:** `findConversationExchanges` e `deleteConversationExchanges`
```typescript
// Sempre filtrar por userId E toolKind — nunca por toolKind sozinho
where: { userId, toolKind }
```

### Silenciar erros de leitura/escrita no repository
**Fonte:** `apps/web/src/server/tools/conversation-repository.ts` linhas 56-59
**Aplicar em:** `findConversationExchanges` e `deleteConversationExchanges`
```typescript
} catch (err) {
  console.warn("ConversationExchange read skipped.", err);
  return [];   // não re-throw — não bloqueia o usuário
}
```

### Ghost button (UI)
**Fonte:** `apps/web/src/styles/globals.css` linhas 168-187
**Aplicar em:** botão "Nova conversa" no topbar e botão "Cancelar" no popover
```css
.ghost-button { border: 1px solid var(--border); background: #fff; color: var(--text); }
.ghost-button:hover { border-color: rgb(11 107 87 / 40%); color: var(--primary); }
```

### Dropdown ancorado (popover de confirmação)
**Fonte:** `apps/web/src/components/app/topbar.tsx` linhas 39-81 + `globals.css` linhas 309-324
**Aplicar em:** popover "Confirmar exclusão" no Topbar
```css
/* reutilizar .account-menu-container + .account-menu — sem CSS novo */
.account-menu { position: absolute; top: calc(100% + 8px); right: 0; z-index: 10; }
```

### Prefetch server-side via getCachedUser / getCachedEntitlement
**Fonte:** `apps/web/src/app/(workspace)/workspace/page.tsx` linhas 1-9
**Aplicar em:** todos os 5 pages de tool de texto
```typescript
const user = await getCachedUser();
const entitlement = await getCachedEntitlement(user!.id);
// Acrescentar na Phase 7:
const initialExchanges = await findConversationExchanges(user!.id, "formula");
```

---

## Sem Análogo

Nenhum arquivo desta fase ficou sem análogo. Todos os padrões necessários existem
no codebase atual.

---

## Metadata

**Escopo de busca:** `apps/web/src/`, `prisma/`
**Arquivos lidos:** 17
**Data de extração:** 2026-05-29
