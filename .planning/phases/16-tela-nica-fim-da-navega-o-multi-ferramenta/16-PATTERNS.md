# Phase 16: Tela Única & Fim da Navegação Multi-Ferramenta - Pattern Map

**Mapped:** 2026-06-11
**Files analyzed:** 8 (modified) + 1 new (sample-spec helper, optional) + 6 unchanged-but-affected (redirect targets)
**Analogs found:** 8 / 8 (todos os arquivos a modificar já existem — analog = "estado atual do próprio arquivo" ou um irmão direto)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `apps/web/src/app/(workspace)/workspace/layout.tsx` | layout shell (server component) | request-response (compose tree) | self (estado atual do arquivo) | exact — reescrever in place |
| `apps/web/src/app/(workspace)/workspace/page.tsx` | page composition (server component) | request-response | self (estado atual do arquivo) | exact — diff mínimo |
| `apps/web/src/components/app/topbar.tsx` | topbar / client component | request-response (UI state) | self (estado atual do arquivo) | exact — remover seção, manter resto |
| `apps/web/next.config.ts` | redirect config | request-response (routing) | self (config vazia atual) | exact — adicionar `redirects()` |
| `apps/web/src/styles/globals.css` (`.workspace-*`, `.sidebar*`, `.topbar*`) | CSS shell | n/a (styling) | self (seções `.workspace-*`/`.sidebar*`/`.topbar*` já existentes) | exact — editar in place |
| `apps/web/src/components/app/sidebar.tsx` | nav component (a remover do layout) | request-response | n/a — é o arquivo a desmontar | n/a |
| `apps/web/src/components/app/tool-nav.tsx` | nav component (já órfão) | n/a | n/a — candidato a remoção (discretion) | n/a |
| `apps/web/src/features/unified-chat/lib/sample-spec.ts` (opcional, novo) | utility (constante de dados) | transform (spec estático → prop) | `apps/web/src/server/ai/table-clarifier.ts` (fixture `buildTableSpec`, linhas 266-291) | exact — extrair literal já existente |
| `apps/web/src/app/(workspace)/workspace/{sql,regex,scripts,templates,file-analysis,ocr}/page.tsx` | route (intocados) | n/a | n/a — apenas alvo do redirect, NÃO editar (D-08) | n/a |

## Pattern Assignments

### `apps/web/src/app/(workspace)/workspace/layout.tsx` (layout shell, request-response)

**Analog:** o próprio arquivo (estado atual, 36 linhas) — reescrever in place.

**Estado atual completo** (`apps/web/src/app/(workspace)/workspace/layout.tsx`, linhas 1-36):
```typescript
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";
import { getSupportLinks } from "@/server/support/support-config";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCachedUser();

  if (!user) {
    redirect("/sign-in");
  }

  const entitlement = await getCachedEntitlement(user.id);
  const supportLinks = getSupportLinks();

  return (
    <WorkspaceShell>
      <div className="workspace-page">
        <Topbar user={user} entitlement={entitlement} supportLinks={supportLinks} />
        <div className="workspace-body">
          <Sidebar />
          <main className="workspace-content">
            <div className="workspace-center">{children}</div>
          </main>
        </div>
      </div>
    </WorkspaceShell>
  );
}
```

**O que MANTER inalterado:**
- `import { redirect } from "next/navigation";` + bloco `if (!user) redirect("/sign-in")` — guard de auth (V2/V4 ASVS), não tocar.
- `getCachedEntitlement`, `getCachedUser`, `getSupportLinks` — lidos como hoje (entitlement ainda passado para `Topbar`, D-10).
- `<WorkspaceShell>` wrapper externo — mantém `WorkspaceConversationProvider` (necessário para `Topbar`'s "Nova conversa"/"Apagar histórico" via `useInvokeNewConversation`).
- `<div className="workspace-page">` raiz e `<Topbar .../>` como primeiro filho.

**O que MUDAR:**
1. Remover `import { Sidebar } from "@/components/app/sidebar";` e `<Sidebar />`.
2. Adicionar imports: `TableGridPanel` de `@/features/unified-chat/components/table-grid-panel` e o spec estático (de `sample-spec.ts` ou inline).
3. Substituir o bloco:
```tsx
<div className="workspace-body">
  <Sidebar />
  <main className="workspace-content">
    <div className="workspace-center">{children}</div>
  </main>
</div>
```
por um split de dois painéis (mobile toggle incluído — Pattern 2 do RESEARCH.md):
```tsx
<div className="workspace-body">
  {/* toggle mobile client component, ver abaixo */}
  <WorkspaceSplitToggle /> {/* opcional — pode ser inline aqui ou extraído */}
  <div className="workspace-grid-panel">
    <TableGridPanel spec={SAMPLE_SPEC} />
  </div>
  <div className="workspace-chat-panel">
    {children}
  </div>
</div>
```

**Nota de composição (do RESEARCH.md):** `TableGridPanel` é `"use client"` — pode ser importado e renderizado diretamente dentro de um server component (`layout.tsx`), React permite client components como filhos de server components sem problema. O toggle mobile (estado `useState`) precisa de um wrapper `"use client"` próprio (novo client component pequeno, ex. `workspace-split.tsx`, OU usar CSS puro com `:checked`/radio hack para evitar JS — discretion do planner; RESEARCH.md sugere `useState` em componente client dedicado).

---

### `apps/web/src/app/(workspace)/workspace/page.tsx` (page composition, request-response)

**Analog:** o próprio arquivo (estado atual, 9 linhas).

**Estado atual completo:**
```typescript
import { UnifiedChatTool } from "@/features/unified-chat/unified-chat-tool";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";

export default async function WorkspacePage() {
  const user = await getCachedUser();
  const entitlement = await getCachedEntitlement(user!.id);

  return <UnifiedChatTool entitlement={entitlement} />;
}
```

**Recomendação do RESEARCH.md (Pattern, "Verified: page.tsx atual"):** **manter como está, sem nenhuma mudança.** `page.tsx` continua retornando só `<UnifiedChatTool entitlement={entitlement}/>`, que vira `children` do layout — o layout o posiciona dentro de `.workspace-chat-panel`. `getCachedEntitlement` já é cacheado via `request-cache`, custo de leitura duplicada (layout não lê entitlement, só page) é zero. **Diff esperado nesta page: zero linhas** — toda a mudança fica em `layout.tsx` + CSS.

---

### `apps/web/src/components/app/topbar.tsx` (topbar, request-response/UI state)

**Analog:** o próprio arquivo (197 linhas) — editar in place, removendo a parte de detecção de rota.

**Trecho a REMOVER** (linhas 12-25, função `useWorkspaceToolKind`):
```typescript
/** Deriva o toolKind canônico a partir da URL do workspace atual. */
function useWorkspaceToolKind(): string | undefined {
  const pathname = usePathname();
  if (!pathname) return undefined;
  // Rotas: /workspace (unified), /workspace/sql, /workspace/regex, /workspace/scripts, /workspace/templates
  if (/\/workspace\/sql(\/|$)/.test(pathname)) return "sql";
  if (/\/workspace\/regex(\/|$)/.test(pathname)) return "regex";
  if (/\/workspace\/scripts(\/|$)/.test(pathname)) return "script";
  if (/\/workspace\/templates(\/|$)/.test(pathname)) return "template";
  // Chat unificado é a raiz exata /workspace — NÃO usar prefixo, senão captura
  // /workspace/file-analysis e /workspace/ocr (efêmeros, sem histórico — D-07).
  if (/\/workspace\/?$/.test(pathname)) return "unified";
  return undefined;
}
```

**Trecho a SUBSTITUIR** (linhas 47-49, dentro do componente):
```typescript
  // Deriva toolKind da rota atual — usa prop legada se fornecida (compatibilidade futura)
  const toolKindFromPath = useWorkspaceToolKind();
  const toolKind = toolKindProp ?? toolKindFromPath;
```
por (Pattern 4, opção A do RESEARCH.md — recomendada):
```typescript
  // Única rota alcançável é /workspace — toolKind é sempre "unified"
  const toolKind = toolKindProp ?? "unified";
```

**Imports a remover** (linha 4): `usePathname` de `"next/navigation"` deixa de ser usado — **mas `useRouter` continua usado** (linha 40, `signOut`). Editar:
```typescript
// Antes:
import { usePathname, useRouter } from "next/navigation";
// Depois:
import { useRouter } from "next/navigation";
```

**O que MANTER inalterado:**
- Toda a lógica de `signOut`, `handleDeleteHistory`, `showAccountMenu`/`showNewConvPopover`, `useEffect` de click-outside/Escape — usa `toolKind` (agora literal `"unified"`), continua funcional.
- `isPro`/`pro-badge`/menu de suporte Pro — D-10, billing intacto.
- `<strong className="topbar-brand">Tabelin.IA</strong>` — já existe (linha 102), D-12 já cumprido por reaproveitamento direto (não precisa mover de lugar nenhum, só garantir que continua lá após o corte da Sidebar).

**O que ADICIONAR** (D-11, Pitfall 6 — link `/privacidade` ausente em toda a UI):

Adicionar em `.topbar-actions` (ao lado de `pro-badge`/menu de conta), seguindo o padrão de link simples já usado no menu (`<a href={...} className="menu-item">`, linhas 166-181) mas como item solto na topbar. Sugestão de excerto (estilo `ghost-button` ou link simples):
```tsx
<a href="/privacidade" className="ghost-button">
  Privacidade
</a>
```
Posicionar antes do `account-menu-container` final (linha ~150), dentro de `<div className="topbar-actions">`.

**Tagline opcional (D-12, copy do UI-SPEC):** se adicionada, reaproveitar valores de `.sidebar-brand span` (12px, `var(--muted)`) — copiar para nova classe `.topbar-tagline` em `globals.css` ANTES de remover `.sidebar-brand*` (ver Pitfall 4 / item CSS abaixo). Copy sugerida pelo UI-SPEC: "Planilha viva + chat de IA".

---

### `apps/web/next.config.ts` (redirect config, request-response/routing)

**Analog:** o próprio arquivo (estado atual, 7 linhas — config vazia).

**Estado atual completo:**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true
};

export default nextConfig;
```

**Padrão a aplicar** (Pattern 1 do RESEARCH.md, `redirects()` assíncrono, `permanent: true` → 308):
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/workspace/sql", destination: "/workspace", permanent: true },
      { source: "/workspace/regex", destination: "/workspace", permanent: true },
      { source: "/workspace/scripts", destination: "/workspace", permanent: true },
      { source: "/workspace/templates", destination: "/workspace", permanent: true },
      { source: "/workspace/file-analysis", destination: "/workspace", permanent: true },
      { source: "/workspace/ocr", destination: "/workspace", permanent: true },
    ];
  },
};

export default nextConfig;
```

**Importante:** match exato (`/workspace/sql`), sem `:path*`/wildcard — confirmado por A2 (RESEARCH.md) que nenhuma das 6 pastas tem subrotas dinâmicas. Os 6 `page.tsx` correspondentes **não são editados** (D-08) — `redirects()` intercepta antes do filesystem router.

---

### `apps/web/src/styles/globals.css` (CSS shell)

**Analog:** seções `.workspace-*` (linhas 249-274), `.sidebar*` (linhas 276-338), `.topbar*` (linhas 340-364), responsive `@media (max-width: 600px)` (linhas 945-966).

**Seção atual `.workspace-*`** (linhas 249-274):
```css
/* ── Workspace layout ──────────────────────────────────────────────── */

.workspace-page {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}

.workspace-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.workspace-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: clamp(40px, 22vh, 240px) 24px 64px;
}

.workspace-center {
  width: 100%;
  max-width: 720px;
}
```

**Mudanças:**
1. `.workspace-page`/`.workspace-body` — **manter** (já são a base do split, `display: flex`).
2. `.workspace-content`/`.workspace-center` — **remover** (eram específicos do layout single-column centralizado; o split usa `.workspace-grid-panel`/`.workspace-chat-panel` em vez disso). Confirmar via grep que `workspace-content`/`workspace-center` não são usados em mais nenhum `.tsx` antes de remover (a busca do RESEARCH.md indica uso só no `layout.tsx` que está sendo reescrito).
3. **Adicionar** `.workspace-grid-panel`/`.workspace-chat-panel` + `.workspace-mobile-toggle` conforme Pattern 2 do RESEARCH.md (CSS completo já fornecido lá — copiar literalmente):
```css
.workspace-grid-panel {
  flex: 7;
  min-width: 0;
  overflow: auto;
  padding: 16px;
}

.workspace-chat-panel {
  flex: 3;
  border-left: 1px solid var(--border);
  background: var(--surface);
  overflow: auto;
  padding: 16px;
}

.workspace-mobile-toggle { display: none; }

@media (max-width: 900px) {
  .workspace-body {
    flex-direction: column;
  }

  .workspace-mobile-toggle {
    display: flex;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  .workspace-mobile-toggle button {
    flex: 1;
    min-height: 44px;
    border: none;
    background: none;
    color: var(--muted);
    font-weight: 400;
  }

  .workspace-mobile-toggle button[data-active="true"] {
    color: var(--primary);
    font-weight: 700;
    border-bottom: 2px solid var(--primary);
  }

  .workspace-grid-panel,
  .workspace-chat-panel {
    flex: none;
    width: 100%;
    border-left: none;
  }
}
```
Usar `data-active`/`data-hidden` para visibilidade (consistente com `.sidebar-nav .nav-item[data-active="true"]` e `.tool-pill[data-active="true"]`), não `style={{display:...}}` inline — conforme nota de implementação do RESEARCH.md.

**Seção `.sidebar*`** (linhas 276-338) — a remover, COM CUIDADO (Pitfall 4):
```css
/* ── Sidebar ────────────────────────────────────────────────────────── */

.sidebar { ... width: 220px; border-right: 1px solid var(--border); ... }
.sidebar-brand { display: flex; flex-direction: column; gap: 2px; padding: 0 8px; }
.sidebar-brand strong { font-size: 14px; color: var(--primary); letter-spacing: -0.3px; }
.sidebar-brand span { font-size: 12px; color: var(--muted); }
.sidebar-nav { ... }
.sidebar-nav .nav-item { ... }
.sidebar-nav .nav-item:hover { ... }
.sidebar-nav .nav-item[data-active="true"] { ... font-weight: 600; }
.sidebar-nav .nav-item[data-disabled="true"] { ... }
```

**ANTES de remover:** se for adicionada uma tagline na Topbar (D-12, opcional), copiar os valores de `.sidebar-brand span` (12px / `var(--muted)`) para uma nova classe `.topbar-tagline`. `.topbar-brand` já existe e já tem os valores equivalentes a `.sidebar-brand strong` (15px/700/`var(--primary)`/`letter-spacing: -0.3px`) — **nenhuma cópia necessária para a marca**, ela já está correta em `.topbar-brand` (linhas 353-358). Apenas a tagline (se adicionada) precisa de novo CSS copiado de `.sidebar-brand span`.

**Responsive** (linhas 945-966) — remover a entrada `.sidebar { display: none; }` (linha 950-952) do bloco `@media (max-width: 600px)`, já que `.sidebar` deixa de existir.

**Seção `.tool-nav`/`.tool-pill`** (linhas 502-537 e 712-724, `.chat-input-bottom-nav .tool-nav`/`.tool-pill`) — **discretion**: se `ToolNav`/`bottomNav` forem removidos nesta fase, remover também o bloco `.chat-input-bottom-nav .tool-nav { gap: 4px; }` / `.chat-input-bottom-nav .tool-pill {...}` (linhas 717-724, já CSS morto). O `.tool-nav`/`.tool-pill` top-level (linhas 502-537) **tem outro consumidor** — verificar antes de tocar (RESEARCH.md Pitfall 5 recomenda grep separado por `.tsx` e `.css`).

---

### `apps/web/src/components/app/sidebar.tsx` (componente a desmontar — CLEAN-05)

**Analog:** n/a — é o próprio arquivo a ser removido do `layout.tsx`.

**Estado atual completo** (78 linhas) — usa `usePathname()` para `data-active`, 7 `navItems` (Formula/Scripts/SQL/Regex/Templates/File Analysis/OCR) apontando para `/workspace` + as 6 rotas redirecionadas.

**Decisão (discretion, Open Question 1 do RESEARCH.md):** deletar o arquivo `sidebar.tsx` é coerente com CLEAN-05 (componente de **navegação**, não de funcionalidade de tool) — `D-08` só protege `page.tsx` dos tools e código de domínio, não componentes de nav. Se deletado:
1. Confirmar zero imports restantes: `grep -rn "from \"@/components/app/sidebar\"\|from \"./sidebar\"" apps/web/src` deve retornar zero após editar `layout.tsx`.
2. Remover CSS `.sidebar*` associado (ver acima).

Se mantido (mais conservador), apenas remover o import/uso em `layout.tsx` e deixar o arquivo órfão para Phase 18 — documentar a escolha no PLAN.md.

---

### `apps/web/src/components/app/tool-nav.tsx` (já órfão)

**Analog:** n/a — já confirmado zero imports (`ToolNav` não aparece em nenhum `.tsx`/`.ts`).

**Decisão (discretion):** remover nesta fase (consistente com CLEAN-05, "navegação multi-ferramenta") ou deixar para Phase 18. Se removido, remover também `.chat-input-bottom-nav .tool-nav`/`.tool-pill` do CSS (Pitfall 5). A prop `bottomNav` em `chat-input.tsx` (linhas 18, 33, 81) **não precisa ser tocada** nesta fase mesmo que `ToolNav` seja removido — `bottomNav` já nunca recebe valor hoje; é item de limpeza para Phase 18/22 (Open Question 2 do RESEARCH.md). **Não editar `chat-input.tsx` nesta fase.**

---

### `apps/web/src/features/unified-chat/lib/sample-spec.ts` (NOVO, opcional — utility/transform)

**Analog:** `apps/web/src/server/ai/table-clarifier.ts`, fixture dentro de `buildTableSpec` (linhas 266-291) — extrair o objeto literal já existente.

**Trecho-fonte completo** (`apps/web/src/server/ai/table-clarifier.ts`, linhas 266-291):
```typescript
{
  kind: "table_spec" as const,
  title: "Controle de Gastos",
  columns: [
    { name: "Descrição", type: "text" as const, key: "descricao" },
    { name: "Categoria", type: "text" as const, key: "categoria" },
    { name: "Valor (R$)", type: "currency" as const, key: "valor" },
    { name: "Desconto", type: "currency" as const, key: "desconto" },
    {
      name: "Total",
      type: "formula" as const,
      key: "total",
      formula: "=SOMA(C{row};-D{row})",
    },
  ],
  rowCount: 5,
  rows: [
    { descricao: "Aluguel", categoria: "Moradia", valor: 2000, desconto: 100 },
    { descricao: "Supermercado", categoria: "Alimentação", valor: 800, desconto: 50 },
    { descricao: "Internet", categoria: "Serviços", valor: 150, desconto: 0 },
    { descricao: "Academia", categoria: "Saúde", valor: 120, desconto: 20 },
    { descricao: "Netflix", categoria: "Lazer", valor: 55, desconto: 5 },
  ],
  formulaLanguage: "pt-BR" as const,
  separator: ";" as const,
}
```

**Novo arquivo `sample-spec.ts`** — wrap como constante tipada `TableSpecPayload` (import de `@tabelin/shared`, mesmo padrão de `table-clarifier.ts` linha 6 `import { type TableSpecPayload, tableSpecPayloadSchema } from "@tabelin/shared";`):
```typescript
import type { TableSpecPayload } from "@tabelin/shared";

/**
 * Planilha-amostra estática para o painel principal da tela única (D-04).
 * Sem persistência (D-06) — recarrega a cada visita. Reaproveita o mesmo
 * conteúdo da fixture pt-BR de `buildTableSpec` (table-clarifier.ts).
 */
export const SAMPLE_SPEC: TableSpecPayload = {
  kind: "table_spec",
  title: "Controle de Gastos",
  columns: [
    { name: "Descrição", type: "text", key: "descricao" },
    { name: "Categoria", type: "text", key: "categoria" },
    { name: "Valor (R$)", type: "currency", key: "valor" },
    { name: "Desconto", type: "currency", key: "desconto" },
    { name: "Total", type: "formula", key: "total", formula: "=SOMA(C{row};-D{row})" },
  ],
  rowCount: 5,
  rows: [
    { descricao: "Aluguel", categoria: "Moradia", valor: 2000, desconto: 100 },
    { descricao: "Supermercado", categoria: "Alimentação", valor: 800, desconto: 50 },
    { descricao: "Internet", categoria: "Serviços", valor: 150, desconto: 0 },
    { descricao: "Academia", categoria: "Saúde", valor: 120, desconto: 20 },
    { descricao: "Netflix", categoria: "Lazer", valor: 55, desconto: 5 },
  ],
  formulaLanguage: "pt-BR",
  separator: ";",
};
```

**Consumo em `layout.tsx`:**
```typescript
import { TableGridPanel } from "@/features/unified-chat/components/table-grid-panel";
import { SAMPLE_SPEC } from "@/features/unified-chat/lib/sample-spec";

// ...
<TableGridPanel spec={SAMPLE_SPEC} />
```

**Assinatura do componente alvo** (`apps/web/src/features/unified-chat/components/table-grid-panel.tsx`, linha 117):
```typescript
export function TableGridPanel({ spec }: { spec: TableSpecPayload }) {
```
**Confirmação crítica do RESEARCH.md:** NÃO existe prop `initialColumns` direta — `TableGridPanel` deriva `initialColumns` internamente via `useMemo` a partir de `spec.columns` (linha ~119-127). A única integração válida é via prop `spec`.

---

## Shared Patterns

### Auth guard (preservado, não tocar)
**Source:** `apps/web/src/app/(workspace)/workspace/layout.tsx`, linhas 14-18
```typescript
const user = await getCachedUser();
if (!user) {
  redirect("/sign-in");
}
```
**Apply to:** `layout.tsx` reescrito — manter exatamente como está, no topo da função, antes de qualquer composição de painéis.

### `WorkspaceConversationProvider` (preservado)
**Source:** `apps/web/src/components/app/workspace-shell.tsx`, linhas 12-14
```typescript
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return <WorkspaceConversationProvider>{children}</WorkspaceConversationProvider>;
}
```
**Apply to:** `layout.tsx` — manter `<WorkspaceShell>` envolvendo toda a árvore (`.workspace-page`), necessário para `Topbar`'s `useInvokeNewConversation`.

### `data-active` para estado de UI (toggle mobile)
**Source:** `apps/web/src/components/app/sidebar.tsx`, linha 70 e `globals.css` linha 328 (`.sidebar-nav .nav-item[data-active="true"]`); também `.tool-pill[data-active="true"]` (linha 532).
```tsx
<Link className="nav-item" data-active={isActive} href={item.href} key={item.label}>
```
```css
.sidebar-nav .nav-item[data-active="true"] {
  background: rgba(11, 107, 87, 0.1);
  color: var(--primary);
  font-weight: 600;
}
```
**Apply to:** novo `.workspace-mobile-toggle button[data-active="true"]` — mesmo padrão de atributo + seletor CSS, consolidando `font-weight` para `700` (UI-SPEC: 2 pesos só, 400/700).

### Espaçamento/padding de painéis
**Source:** `globals.css`, `.sidebar` (linha 285, `padding: 16px 12px`) e `.workspace-content` (linha 268, padding clamp).
**Apply to:** `.workspace-grid-panel`/`.workspace-chat-panel` usam `padding: 16px` simples (md, conforme UI-SPEC Spacing Scale) — mais simples que o `clamp()` anterior, que era específico do layout centralizado de coluna única.

## No Analog Found

Nenhum arquivo desta fase carece de analog — todos são edições de arquivos existentes, e o único arquivo potencialmente novo (`sample-spec.ts`) tem fonte direta e completa em `table-clarifier.ts`.

## Metadata

**Analog search scope:** `apps/web/src/app/(workspace)/workspace/`, `apps/web/src/components/app/`, `apps/web/src/features/unified-chat/`, `apps/web/src/styles/globals.css`, `apps/web/src/server/ai/table-clarifier.ts`, `apps/web/next.config.ts`
**Files scanned:** 9 (layout.tsx, page.tsx, topbar.tsx, sidebar.tsx, tool-nav.tsx, chat-input.tsx, workspace-shell.tsx, table-grid-panel.tsx, table-clarifier.ts) + globals.css (seções 240-380, 495-540, 700-730, 940-970)
**Pattern extraction date:** 2026-06-11
