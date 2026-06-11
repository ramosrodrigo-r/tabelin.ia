# Phase 16: Tela Única & Fim da Navegação Multi-Ferramenta - Research

**Researched:** 2026-06-11
**Domain:** Next.js 16 App Router (route groups, redirects, layout composition) + CSS layout (split panel responsivo) sobre componentes React já existentes
**Confidence:** HIGH

## Summary

Esta fase é puramente de shell/layout e roteamento — nenhum componente novo de domínio é criado. Os dois blocos de trabalho são: (1) reescrever `WorkspaceLayout` + CSS para um split lado-a-lado `TableGridPanel` (≈70%) / `UnifiedChatTool` (≈30%) com toggle responsivo abaixo de 900px, e (2) cortar a navegação multi-ferramenta (remover `Sidebar` do layout, enxugar `Topbar`, redirecionar 6 rotas antigas de página para `/workspace` via `redirects()` do `next.config.ts`).

A descoberta mais importante: `redirects()` em `next.config.ts` roda **antes do filesystem router** — ou seja, as 6 páginas antigas (`/workspace/{sql,regex,scripts,templates,file-analysis,ocr}`) ficam **inalcançáveis via UI/HTTP mas seus arquivos `page.tsx` continuam existindo e tipando normalmente**. Isso satisfaz exatamente D-07/D-08 (redirect 308 sem deletar arquivos) sem nenhum código adicional em cada página. É a opção mais limpa e deve ser a recomendada.

A segunda descoberta relevante: `TableGridPanel` não tem uma prop `initialColumns` direta — ela recebe `spec: TableSpecPayload` (zod schema `tableSpecPayloadSchema`) e deriva `initialColumns` internamente de `spec.columns`. Já existe uma planilha-amostra pronta e idiomática (pt-BR, "Controle de Gastos") na fixture de `buildTableSpec` em `apps/web/src/server/ai/table-clarifier.ts` — pode ser extraída/reaproveitada como o spec estático da grade persistente (D-04).

**Primary recommendation:** Usar `redirects()` em `next.config.ts` (array de 6 entradas, `permanent: true`) para D-07; reescrever `WorkspaceLayout` para montar `<TableGridPanel spec={SAMPLE_SPEC}>` + `<UnifiedChatTool>` num novo wrapper `.workspace-split` com classes `.workspace-grid-panel`/`.workspace-chat-panel`; remover `<Sidebar/>` do layout e `useWorkspaceToolKind()`/detecção de rota do `Topbar`, movendo a marca para a Topbar (já existe `.topbar-brand`) e adicionando link `/privacidade` (que hoje **não existe em nenhum lugar da UI**).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Redirect de rotas antigas de página (`/workspace/{sql,...}` → `/workspace`) | Frontend Server (Next.js config) | — | `redirects()` em `next.config.ts` roda no nível do roteador/servidor Next, antes do filesystem router — não precisa de código em cada `page.tsx` |
| Layout de tela única (split grade/chat) | Frontend Server (SSR layout) | Browser (CSS responsivo) | `WorkspaceLayout` (server component) compõe a árvore; o split visual e o toggle mobile são CSS/cliente |
| Planilha-amostra estática persistente | Browser / Client | Frontend Server (fonte do spec) | `TableGridPanel` é client component (`"use client"`); o `spec` estático pode ser definido server-side e passado como prop, ou inline no client — sem fetch |
| Topbar enxuta (sessão, logout, privacidade, marca) | Frontend Server (dados de sessão) | Browser (interatividade do menu) | `Topbar` já é client component que recebe `user`/`entitlement` via props do layout server |
| Toggle responsivo grade↔chat (mobile) | Browser / Client | — | Estado de UI puro (qual painel visível), não precisa de servidor |
| Remoção de Sidebar/ToolNav da UI | Browser / Client (componentes removidos da árvore) | Frontend Server (layout não os importa mais) | Garantir que `WorkspaceLayout` pare de importar/renderizar `Sidebar` |
| Endpoints `/api/tools/*` (órfãos, fora de escopo) | API / Backend | — | Permanecem intactos nesta fase (D-09) — não são tier afetado |

## Standard Stack

### Core

Nenhuma biblioteca nova é necessária. Stack já presente e usada:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.6 [VERIFIED: package.json] | App Router, `redirects()`, route groups | Já em uso; `redirects()` é API estável desde v9.5.0 [CITED: nextjs.org/docs/app/api-reference/config/next-config-js/redirects] |
| `react-datasheet-grid` | (já instalado, ver Phase 14) | Motor do grid dentro de `TableGridPanel` | Não muda nesta fase — `TableGridPanel` é reaproveitado como caixa-preta |
| `lucide-react` | (já em uso) | Ícones do toggle mobile/Topbar, se necessário | Já usado no `Topbar`/`Sidebar` |

### Supporting

Nenhuma dependência nova de runtime. Apenas CSS (`globals.css`) e componentes React existentes.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `redirects()` em `next.config.ts` (D-07, recomendado) | `redirect()`/`permanentRedirect()` dentro de cada um dos 6 `page.tsx` | Funciona igualmente (308 com `permanentRedirect`), mas exige editar 6 arquivos, mantém imports dos componentes de tool ativos (`SqlTool`, etc.) carregados no bundle dessas rotas, e mistura "código de página" com "decisão de roteamento". `redirects()` centraliza a decisão num único array, não toca nos `page.tsx` (D-08 — zero edição), e ainda assim preserva os arquivos para deleção futura na Phase 18 |
| Toggle grade/chat com `display: none` (recomendado pelo UI-SPEC) | Desmontar/montar componentes com renderização condicional (`{tab === "grid" && <TableGridPanel/>}`) | Desmontar perderia estado do grid (edições, undo/redo) e do chat ao alternar abas no mobile — UI-SPEC já decide por `display: none` para preservar estado |
| Split CSS com `flex: 7` / `flex: 3` (D-02) | CSS Grid `grid-template-columns: 7fr 3fr` | Equivalentes; `flex` é consistente com o padrão já usado em `.workspace-body`/`.sidebar` (flex-based), menor diff |

**Installation:**
```bash
# Nenhuma instalação necessária — fase é layout/roteamento sobre stack existente
```

**Version verification:** `next` 16.2.6 confirmado via `apps/web/package.json` [VERIFIED: package.json local]. `redirects()` é parte do core do Next.js (não é pacote separado) — sintaxe verificada na doc oficial atual (last updated 2025-11-12, versão doc 16.2.9) [CITED: nextjs.org/docs/app/api-reference/config/next-config-js/redirects].

## Package Legitimacy Audit

**Não aplicável** — esta fase não instala nenhum pacote novo. Nenhuma entrada de `package.json` é adicionada ou alterada.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Requisição autenticada → /workspace/sql (ou /regex, /scripts, /templates, /file-analysis, /ocr)
        │
        ▼
  next.config.ts redirects()  ──── 308 ───► /workspace
        │ (source não bate — ex.: /workspace, /workspace/qualquer-coisa-nova)
        ▼
  (workspace)/workspace/layout.tsx
        │
        ├─ getCachedUser() ──► sem user? ──► redirect("/sign-in")
        ├─ getCachedEntitlement(user.id)
        ├─ getSupportLinks()
        │
        ▼
  WorkspaceShell (WorkspaceConversationProvider)
        │
        ▼
  <div class="workspace-page">
        ├─ <Topbar user, entitlement, supportLinks/>   ← enxuta: marca + sessão + logout + /privacidade
        └─ <div class="workspace-body">                ← split (D-01)
              ├─ <div class="workspace-grid-panel">    ← flex:7 (D-02)
              │     └─ <TableGridPanel spec={SAMPLE_SPEC}/>   ← persistente, amostra estática (D-04), client component
              └─ <div class="workspace-chat-panel">    ← flex:3 (D-02), border-left
                    └─ children = <UnifiedChatTool entitlement={entitlement}/>  (de page.tsx)
                          └─ RenderDispatcher (inalterado, D-05) — ainda pode renderizar TableGridPanel inline em respostas

  < 900px (mobile):
  <div class="workspace-body">
        ├─ toggle "Planilha" / "Chat" (estado client, display:none alterna)
        ├─ workspace-grid-panel (100% largura, oculto se aba=Chat)
        └─ workspace-chat-panel (100% largura, oculto se aba=Planilha)
```

### Recommended Project Structure

Nenhum novo diretório/arquivo de feature — apenas edições nos arquivos existentes:

```
apps/web/
├── next.config.ts                                    # + redirects() com 6 entradas (D-07)
├── src/
│   ├── app/
│   │   └── (workspace)/workspace/
│   │       ├── layout.tsx                            # reescrito: split grade+chat, sem Sidebar
│   │       ├── page.tsx                              # ajustado: passa children=UnifiedChatTool ao layout (ou compõe diretamente)
│   │       └── {sql,regex,scripts,templates,file-analysis,ocr}/page.tsx  # INTOCADOS — inalcançáveis via redirect, D-08
│   ├── components/app/
│   │   ├── topbar.tsx                                # enxugar: remover useWorkspaceToolKind, +link /privacidade, +marca
│   │   ├── sidebar.tsx                               # removido do layout (arquivo pode ficar ou ser deletado — discretion)
│   │   └── tool-nav.tsx                              # já órfão — remover ou deixar p/ Phase 18 (discretion)
│   ├── features/unified-chat/
│   │   ├── unified-chat-tool.tsx                     # inalterado (vira painel lateral via wrapper CSS)
│   │   └── components/table-grid-panel.tsx           # inalterado — reaproveitado com novo spec estático
│   └── styles/globals.css                            # + .workspace-grid-panel, .workspace-chat-panel, toggle mobile; remover/condicionar .sidebar*
```

### Pattern 1: Redirect centralizado via `next.config.ts`

**What:** Array de objetos `{ source, destination, permanent: true }` no `redirects()` async, um por rota antiga de página.
**When to use:** Quando o destino é estático (sem parâmetros dinâmicos) e se quer 308 sem tocar nos arquivos de página — exatamente o caso de D-07/D-08.

```typescript
// Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects
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

**Nota:** `source: "/workspace/sql"` casa exatamente `/workspace/sql` (sem nested paths) — não usar `:slug*` pois isso capturaria também subrotas hipotéticas. Como cada tool tem só uma rota de página (sem subrotas dinâmicas conhecidas), o match exato é suficiente. Confirmar com `find` que nenhuma dessas pastas tem subdiretórios de rota (verificado nesta pesquisa: todas são `page.tsx` único, sem subpastas).

### Pattern 2: Split panel com toggle responsivo preservando estado (D-03)

**What:** Dois painéis sempre montados (`TableGridPanel` e `UnifiedChatTool`); em desktop lado a lado via flex; em mobile, um dos dois fica `display: none` conforme estado de toggle — sem desmontar.
**When to use:** Sempre que alternar entre views precisa preservar estado local de componentes pesados (grid com undo/redo, thread de chat com input em progresso).

```tsx
// Pseudo-estrutura do novo WorkspaceLayout (server component) + client wrapper
// O toggle em si precisa ser client component (estado local de aba ativa)

"use client";
import { useState } from "react";

export function WorkspaceSplit({
  grid,
  chat,
}: {
  grid: React.ReactNode;
  chat: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<"grid" | "chat">("grid");

  return (
    <div className="workspace-body">
      <div className="workspace-mobile-toggle">
        <button
          type="button"
          data-active={activeTab === "grid"}
          onClick={() => setActiveTab("grid")}
        >
          Planilha
        </button>
        <button
          type="button"
          data-active={activeTab === "chat"}
          onClick={() => setActiveTab("chat")}
        >
          Chat
        </button>
      </div>
      <div
        className="workspace-grid-panel"
        style={{ display: activeTab === "chat" ? "none" : undefined }}
      >
        {grid}
      </div>
      <div
        className="workspace-chat-panel"
        style={{ display: activeTab === "grid" ? "none" : undefined }}
      >
        {chat}
      </div>
    </div>
  );
}
```

**CSS correspondente** (desktop ignora `display:none` inline via media query — ou usar classes `data-active` + CSS em vez de `style` inline para melhor controle):

```css
/* Desktop: ambos visíveis lado a lado, toggle escondido */
.workspace-mobile-toggle { display: none; }

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

/* Mobile: toggle visível, painéis ocupam 100% e alternam via data-attribute */
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

**Nota de implementação:** preferir controlar visibilidade via `data-active` + seletor CSS `[data-hidden="true"] { display: none; }` em vez de `style={{ display: ... }}` inline, para manter consistência com o padrão `data-active` já usado em `.sidebar-nav .nav-item[data-active="true"]` e `.tool-pill[data-active]`.

### Pattern 3: Spec estático para a planilha-amostra persistente (D-04)

**What:** Um objeto `TableSpecPayload` constante (não vindo de fetch/IA), passado como prop para `TableGridPanel`.
**When to use:** Para a grade principal sempre presente nesta fase — sem persistência (D-06), recarrega a cada visita.

```typescript
// Source: apps/web/src/server/ai/table-clarifier.ts (fixture já existente, linha ~266-291)
// Reaproveitar este objeto como SAMPLE_SPEC — já é pt-BR, idiomático,
// representativo de usuário de escritório brasileiro (orçamento doméstico/PME)
import type { TableSpecPayload } from "@tabelin/shared";

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

// Uso:
// <TableGridPanel spec={SAMPLE_SPEC} />
```

**Importante:** `TableGridPanel` deriva `initialColumns` internamente via `useMemo` a partir de `spec.columns` (linha ~119-127 de `table-grid-panel.tsx`) — **não existe** prop `initialColumns` direta. A integração correta é sempre via prop `spec: TableSpecPayload`.

**Onde definir `SAMPLE_SPEC`:** pode viver em um novo arquivo pequeno (ex.: `apps/web/src/features/unified-chat/lib/sample-spec.ts`) ou inline no `layout.tsx`/`page.tsx`. Como é um objeto estático sem lógica, um arquivo dedicado facilita reuso futuro (Phase 19 — ingestão tri-estado também precisa de um "estado seed").

### Pattern 4: Topbar enxuta sem detecção de rota

**What:** Remover `useWorkspaceToolKind()` e a lógica condicional de `toolKind` baseada em `usePathname()`.
**When to use:** Quando só existe uma rota alcançável (`/workspace`), a detecção por padrão de URL vira código morto — `toolKind` será sempre `"unified"` na prática.

```tsx
// Antes (topbar.tsx, simplificado):
const toolKindFromPath = useWorkspaceToolKind(); // regex sobre pathname
const toolKind = toolKindProp ?? toolKindFromPath;

// Depois — opção A (mínima, D-10): manter toolKind fixo "unified"
// já que /workspace é a única rota renderizando children no layout
const toolKind = toolKindProp ?? "unified";

// Depois — opção B: remover toolKind por completo do Topbar e do
// fluxo de "Nova conversa"/"Apagar histórico" se esse fluxo for
// considerado fora do escopo mínimo desta fase (risco: pode ser
// usado por UnifiedChatTool via workspace-conversation-context —
// VERIFICAR uso de useInvokeNewConversation antes de remover)
```

**Recomendação:** Opção A é mais segura para "commits atômicos" (D-10) — remove o `usePathname()`/regex (código morto pós-corte de rotas) mas preserva o fluxo "Nova conversa"/"Apagar histórico do chat unificado" que já funciona e é usado por `UnifiedChatTool` via `workspace-conversation-context`. `toolKind` ainda é necessário para `handleDeleteHistory` (`DELETE /api/conversations/${toolKind}`) e para a copy do popover.

### Anti-Patterns to Avoid

- **Não usar `redirect()`/`permanentRedirect()` dentro dos 6 `page.tsx` de tool:** isso exigiria editar 6 arquivos (D-08 quer zero edição neles) e ainda carregaria os imports de cada `*Tool` component (ex.: `SqlTool`) na árvore de módulos dessa rota — desnecessário já que `redirects()` intercepta antes do filesystem router.
- **Não desmontar `TableGridPanel`/`UnifiedChatTool` no toggle mobile:** perderia estado de edição/undo do grid e o texto digitado no chat ao alternar de aba — usar `display: none`/`data-hidden`, não renderização condicional `{cond && <X/>}`.
- **Não tocar em `RenderDispatcher` ou nos `case "table_*"`:** D-05 é explícito — o render inline de tabela dentro do chat continua existindo e não deve ser refatorado para "apontar" para a grade principal nesta fase (isso é Phase 20).
- **Não remover `entitlement`/`isPro`/`pro-badge` do Topbar:** D-10 mantém billing intacto; removê-lo agora quebraria o escopo atômico da Phase 17.
- **Não usar `:slug*` ou wildcard nos redirects das 6 rotas:** cada uma é uma rota de página única sem subrotas conhecidas; usar match exato (`/workspace/sql`, não `/workspace/sql/:path*`) evita redirecionar acidentalmente endpoints de API que comecem com prefixo parecido (não é o caso aqui, mas é mais seguro/explícito).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Redirect 308 de rotas estáticas | Middleware customizado, `redirect()` em cada page, ou componente client que faz `router.replace` | `redirects()` em `next.config.ts` | É a API oficial para exatamente este caso (path estático → path estático), roda no nível de roteamento (mais cedo, sem renderizar nada), e é cacheável por navegadores/CDN com `permanent: true` |
| Alternância de painéis preservando estado | Router/state machine customizado, lazy mount com cache manual | `display: none` via CSS + estado local simples (`useState`) | É o padrão recomendado pela própria UI-SPEC desta fase; React não desmonta árvores com `display:none`, preservando estado de formulários/grids sem nenhuma lib extra |
| Grade-amostra com fórmulas/formatação pt-BR | Novo componente de grid ou novo motor de fórmulas | `TableGridPanel` + `SAMPLE_SPEC` (reaproveitando fixture de `buildTableSpec`) | `TableGridPanel` já resolve fórmulas pt-BR, formatação R$/data, undo/redo, sort, add/remove — construído na Phase 14 e testado |

**Key insight:** Esta fase não tem nenhum problema de domínio novo — é 100% recombinação de componentes/roteamento já existentes e testados. Qualquer "novo componente" proposto pelo planner deveria ser questionado.

## Common Pitfalls

### Pitfall 1: Confundir `redirects()` (next.config) com falta de cobertura de SHELL-02 "rota de API"

**What goes wrong:** Verificação automatizada (QA-01/SHELL-02) pode procurar por "qualquer rota de tool ainda respondendo" e encontrar `/api/tools/sql/generate` etc. ainda ativos, marcando a fase como incompleta.
**Why it happens:** SHELL-02 menciona "nem por rota de API" sem o contexto de sequenciamento entre fases.
**How to avoid:** O CONTEXT.md já documenta a "Nota de sequenciamento" — o planner/verificador desta fase deve registrar explicitamente que **rotas de página** (`/workspace/{tool}`) são cobertas por D-07 nesta fase, e **endpoints de API** (`/api/tools/*`) são código morto a remover na Phase 18 (CLEAN-01/02/03/06). Incluir essa nota no PLAN.md e/ou VALIDATION.md para que o gate desta fase não exija remoção de endpoints.
**Warning signs:** Um critério de verificação que faz `curl /api/tools/sql/generate` e espera 404 nesta fase — isso é Phase 18, não Phase 16.

### Pitfall 2: `next.config.ts` redirects e dev server cache

**What goes wrong:** Após editar `redirects()`, o dev server (`next dev`) às vezes não recarrega a config automaticamente, e o redirect parece "não funcionar".
**Why it happens:** `next.config.ts` é lido na inicialização do processo Next.js; mudanças exigem restart do `next dev`, diferente de mudanças em `page.tsx`/CSS que fazem HMR.
**How to avoid:** Após editar `next.config.ts`, reiniciar o dev server antes de testar manualmente os redirects (e nos testes automatizados, se houver, considerar que `redirects()` não é facilmente testável via Vitest unit test — é mais adequado para verificação manual/E2E ou teste de integração com `next start`).
**Warning signs:** Redirect "não aparece" mesmo com a config correta — geralmente é cache de processo, não erro de sintaxe.

### Pitfall 3: `usePathname()` retornando `null` durante SSR/primeira renderização

**What goes wrong:** Se a Topbar enxuta mantiver qualquer lógica baseada em `usePathname()`, o valor pode ser `null` no primeiro render server-side, causando flash de UI incorreta ou erro de hidratação.
**Why it happens:** É o comportamento documentado do hook em layouts que renderizam no servidor.
**How to avoid:** Evitar reintroduzir `usePathname()` na Topbar — após o corte de rotas, não há mais necessidade de derivar nada da URL (Pattern 4, opção A usa um literal fixo `"unified"`). Se alguma lógica de rota for mantida por algum motivo, sempre tratar `pathname == null` (o código atual já faz `if (!pathname) return undefined`).
**Warning signs:** Warnings de hidratação no console relacionados a `Topbar` ou diffs de classe/atributo entre server e client render.

### Pitfall 4: CSS `.sidebar*` removido cegamente quebra outro lugar

**What goes wrong:** As classes `.sidebar`, `.sidebar-brand`, `.sidebar-brand strong/span`, `.sidebar-nav*` podem parecer seguras para deletar de `globals.css`, mas `.sidebar-brand strong`/`.sidebar-brand span` são citados no UI-SPEC como referência de estilo para a marca/tagline da Topbar (D-12) — "reaproveitado de `.sidebar-brand strong`".
**Why it happens:** Grep simples por `sidebar` no CSS encontraria 14 ocorrências e tentação de apagar tudo de uma vez.
**How to avoid:** Antes de remover uma classe `.sidebar*`, confirmar que (a) `Sidebar` (componente) não é mais importado em lugar nenhum, e (b) nenhum estilo equivalente foi copiado para `.topbar-brand`/nova classe de tagline antes de apagar a fonte. Se o UI-SPEC pede para "reaproveitar" o estilo, copiar os valores (15px/700/`var(--primary)`/`letter-spacing: -0.3px` para a marca; 12px/`var(--muted)` para tagline) para `.topbar-brand`/`.topbar-tagline` **antes** de remover `.sidebar-brand*`.
**Warning signs:** Marca "Tabelin.IA" na Topbar perde estilo (cor/peso/tamanho) após a remoção do CSS do sidebar.

### Pitfall 5: `chat-input-bottom-nav .tool-nav` CSS órfão após remoção do `ToolNav`

**What goes wrong:** `globals.css` tem um bloco `.chat-input-bottom-nav .tool-nav { gap: 4px; }` e `.chat-input-bottom-nav .tool-pill {...}` (linhas ~717-723) que só fazem sentido se `ToolNav` for renderizado dentro de `ChatInput.bottomNav`. Como `ToolNav` já está órfão (não importado em nenhum `.tsx`) e `bottomNav` nunca recebe `<ToolNav/>` atualmente, esse CSS já é morto — mas pode escapar de uma busca que olhe só para `.tool-nav`/`.tool-pill` top-level (linhas ~504-520), que **são** usados em outro contexto (verificar se `.tool-pill`/`.tool-nav` top-level têm outro consumidor antes de remover).
**Why it happens:** Múltiplas declarações da mesma classe em contextos CSS diferentes (`.tool-nav` solto vs `.chat-input-bottom-nav .tool-nav`).
**How to avoid:** Ao decidir remover `ToolNav`/`bottomNav` (discretion desta fase ou deixar para Phase 18), fazer grep por `tool-nav`, `tool-pill`, `chat-input-bottom-nav` em `.tsx` E `.css` separadamente. Se `ToolNav` for removido nesta fase, remover também os blocos CSS associados a `.chat-input-bottom-nav .tool-nav`/`.tool-pill`. Se `ToolNav`/`bottomNav` forem deixados para Phase 18 (mais simples, menor diff nesta fase), documentar essa decisão.
**Warning signs:** CSS morto acumulado — não quebra nada, mas é um item de limpeza que poderia ter sido resolvido atomicamente.

### Pitfall 6: Esquecer o link `/privacidade` na Topbar (SHELL-03/D-11)

**What goes wrong:** A pesquisa confirmou que **nenhum lugar da UI atual** linka para `/privacidade` (a rota existe em `apps/web/src/app/privacidade/page.tsx`, fora do route group `(workspace)`, mas órfã de navegação). `PrivacyNotice` (componente usado no `UnifiedChatTool`) é um aviso de retenção de anexo — não tem relação com a página `/privacidade`. Se o planner assumir que "já existe" e não adicionar o link, SHELL-03/critério #4 não é atendido.
**Why it happens:** Nome parecido (`PrivacyNotice` vs `/privacidade`) pode levar a achar que já está coberto.
**How to avoid:** Adicionar explicitamente um link `<a href="/privacidade">Privacidade</a>` (ou `<Link>`) na Topbar enxuta, em `.topbar-actions`, conforme D-11.
**Warning signs:** Critério de verificação "topbar com link para /privacidade" falha mesmo após o shell estar funcional.

## Code Examples

### Verified: estrutura atual do `WorkspaceLayout` (antes da mudança)

```typescript
// Source: apps/web/src/app/(workspace)/workspace/layout.tsx (estado atual)
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";
import { getSupportLinks } from "@/server/support/support-config";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

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

**Mudanças necessárias:** remover `import { Sidebar }`, remover `<Sidebar/>`, substituir `<main className="workspace-content"><div className="workspace-center">{children}</div></main>` pelo split (`WorkspaceSplit` ou markup equivalente com `.workspace-grid-panel`/`.workspace-chat-panel`), e montar `<TableGridPanel spec={SAMPLE_SPEC}/>` no painel da grade. `getCachedUser`/`getCachedEntitlement`/`getSupportLinks`/`redirect("/sign-in")`/`WorkspaceShell` permanecem inalterados.

### Verified: `page.tsx` atual (vira o conteúdo do painel de chat)

```typescript
// Source: apps/web/src/app/(workspace)/workspace/page.tsx (estado atual)
import { UnifiedChatTool } from "@/features/unified-chat/unified-chat-tool";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";

export default async function WorkspacePage() {
  const user = await getCachedUser();
  const entitlement = await getCachedEntitlement(user!.id);
  return <UnifiedChatTool entitlement={entitlement} />;
}
```

**Opção de composição:** `page.tsx` pode continuar retornando só `<UnifiedChatTool>` (ele vira `children`, que o layout coloca em `.workspace-chat-panel`) — minimiza diff em `page.tsx`. Alternativa: mover toda a composição (grid + chat + entitlement) para `page.tsx` e simplificar `layout.tsx` para só Topbar + wrapper — também válido, mas duplica a leitura de `getCachedEntitlement` (já é cacheada via `request-cache`, então custo extra é desprezível). **Recomendação:** manter `entitlement` sendo lido em `page.tsx` (como hoje) e o spec estático/grid sendo definido no `layout.tsx` — minimiza acoplamento.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Sidebar com 7 navItems para tools (Phase 15: "ToolNav removido do mount raiz, Sidebar montada no layout") | Sidebar removida por completo do layout; nenhuma navegação de tool na UI | Esta fase (16) | `WorkspaceLayout` simplificado; `Sidebar`/`ToolNav` tornam-se candidatos a remoção de arquivo na Phase 18 |
| `/workspace` como "ponto de entrada default" entre vários tools acessíveis via deep link/sidebar (Phase 15, critério 3) | `/workspace` é a **única** tela alcançável; demais rotas de página redirecionam 308 | Esta fase (16) | Critério 3 da Phase 15 ("cada tool continua acessível via deep link ou sidebar") é **superado/substituído** por SHELL-02 desta fase — não é regressão, é a evolução do pivô v3.0 |
| `Topbar` deriva `toolKind` de `usePathname()` para suportar múltiplas rotas de tool | `toolKind` pode ser fixo (`"unified"`) já que só `/workspace` é renderizada | Esta fase (16) | Remove `usePathname()`/regex de `Topbar` — simplificação, sem mudança de comportamento observável (era sempre `"unified"` na única rota que sobra) |

**Deprecated/outdated:**
- `useWorkspaceToolKind()` (em `topbar.tsx`): a detecção por regex de pathname para `/workspace/{sql,regex,scripts,templates}` perde sentido assim que essas rotas redirecionam — pode ser substituída por um valor fixo.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | O conteúdo da `SAMPLE_SPEC` (planilha "Controle de Gastos" reaproveitada da fixture de `buildTableSpec`) é adequado como amostra estática do espaço principal — CONTEXT.md deixa "conteúdo concreto" a critério do planner/implementador, mas não confirma que reaproveitar essa fixture específica é o esperado | Pattern 3 / Standard Stack | Baixo — é só conteúdo de exemplo, fácil de trocar; mas se o usuário tiver uma preferência específica de planilha-amostra (ex.: vendas, estoque), o planner deveria oferecer opções no PLAN.md |
| A2 | Nenhuma das 6 rotas de tool (`sql`, `regex`, `scripts`, `templates`, `file-analysis`, `ocr`) tem subrotas dinâmicas (`[id]`, etc.) que precisariam de wildcard no redirect — verificado via `find` mostrando apenas `page.tsx` único em cada pasta | Pattern 1 | Baixo — `find` confirmou estrutura plana; se uma subrota for descoberta depois, basta adicionar outra entrada ao array de `redirects()` |
| A3 | A fonte estilística "reaproveitar de `.sidebar-brand strong`/`span`" (UI-SPEC, D-12) significa copiar os valores de propriedade CSS para `.topbar-brand`/nova tagline ANTES de remover `.sidebar-brand*` — não foi possível confirmar com o usuário se a ordem de operações importa para ele, mas é a leitura mais segura | Pitfall 4 | Médio — se a ordem for invertida (remover CSS antes de copiar), a marca na Topbar perde estilo temporariamente; fácil de corrigir mas gera commit "quebrado" no meio |

**Se esta tabela estivesse vazia:** não estaria — A1 é preferência de conteúdo (baixo risco), A2 e A3 são verificações de implementação que o planner deve confirmar ao escrever as tasks, mas nenhuma bloqueia o início do planejamento.

## Open Questions

1. **`Sidebar`/`ToolNav`: remover arquivo nesta fase ou só desmontar?**
   - O que sabemos: D-08 diz "não deletar `page.tsx` dos tools" — mas não fala explicitamente sobre `sidebar.tsx`/`tool-nav.tsx` (componentes, não rotas). UI-SPEC diz "`ToolNav` já está órfão — pode ser removido nesta fase ou deixado para Phase 18 (decisão do planner)".
   - O que está unclear: se remover `sidebar.tsx`/`tool-nav.tsx` agora conta como "deleção de código dos tools" (escopo Phase 18, D-08) ou é só "corte de navegação" (escopo desta fase, CLEAN-05).
   - Recomendação: Tratar como discretion do planner. Critério prático: `Sidebar`/`ToolNav` são componentes de **navegação**, não de **funcionalidade de tool** — removê-los aqui é coerente com CLEAN-05 ("navegação multi-ferramenta... é removida"). Se removidos, fazer grep de confirmação de zero imports antes de apagar o arquivo (já confirmado nesta pesquisa: `ToolNav` zero imports; `Sidebar` só importado em `layout.tsx`, que está sendo reescrito).

2. **`bottomNav` prop do `ChatInput`: remover agora ou deixar?**
   - O que sabemos: prop existe, nunca é passada com valor hoje (busca não encontrou `bottomNav={...}` em nenhum lugar), e o CSS associado (`.chat-input-bottom-nav`) já é código morto.
   - O que está unclear: se vale a pena tocar em `chat-input.tsx` (componente de feature, não de navegação) nesta fase de "shell/layout", ou se isso é faxina melhor enquadrada na Phase 18/22 (CLEAN-09 trata de deps órfãs, mas isso é uma prop, não dependência).
   - Recomendação: Deixar para Phase 18/22 — não é navegação (CLEAN-05) nem bloqueia SHELL-01/02/03. Mencionar no PLAN.md como item de limpeza futuro para não ser esquecido, mas não criar task aqui.

## Environment Availability

Fase é puramente código/config (Next.js + CSS) sobre o monorepo já configurado — nenhuma dependência externa nova.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node/pnpm (monorepo) | build/typecheck/test | ✓ | (já configurado no projeto) | — |
| `next` | redirects(), App Router | ✓ | 16.2.6 [VERIFIED: package.json] | — |

**Missing dependencies with no fallback:** nenhuma.
**Missing dependencies with fallback:** nenhuma.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (`vitest run`) [VERIFIED: apps/web/package.json script `"test": "vitest run"`] |
| Config file | `apps/web/vitest.config.*` (assumir existente — padrão do monorepo nas fases 12-15) |
| Quick run command | `pnpm --filter web test -- <arquivo-de-teste>` |
| Full suite command | `pnpm -r test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHELL-01 | Usuário autenticado em `/workspace` vê `TableGridPanel` (grade) E `UnifiedChatTool` (chat) montados simultaneamente no mesmo DOM | component/integration | `pnpm --filter web test -- workspace-layout` ou teste de `WorkspaceSplit`/layout que renderiza ambos e verifica presença de marcadores (`data-testid` ou texto "Controle de Gastos" + input do chat) | ❌ Wave 0 |
| SHELL-02 | `Sidebar`/`ToolNav` não são renderizados; busca textual confirma zero referência de import em `layout.tsx`/`page.tsx` do workspace | static/grep + component | grep automatizado (script de verificação) + teste de snapshot/queryByRole que falha se `aria-label="Ferramentas"` existir | ❌ Wave 0 (script de grep pode ser parte do VALIDATION manual) |
| SHELL-02 | As 6 rotas antigas retornam 308 → `/workspace` | integration/e2e (requer `next start` ou `next dev` rodando) | manual ou teste de integração com `fetch` contra servidor local verificando `res.status === 308` e `res.headers.get("location")` | ❌ Wave 0 — provavelmente **manual-only** dado que `redirects()` não é facilmente testável em Vitest puro (precisa de servidor HTTP real) |
| SHELL-03 | Topbar renderiza sessão (email do usuário), botão "Sair" e link para `/privacidade` | component | `pnpm --filter web test -- topbar` (estender teste existente de Topbar, se houver, ou criar) | ❌ Wave 0 (verificar se já existe `topbar.test.tsx`) |
| CLEAN-05 | Nenhuma referência a `Sidebar`/`ToolNav`/navegação multi-tool acessível pela UI | static (grep) | grep manual/script: `grep -rn "Sidebar\|ToolNav" apps/web/src/app apps/web/src/components/app/topbar.tsx` deve retornar zero (exceto declaração do próprio arquivo, se mantido sem uso) | manual |
| (regressão) D-05 | `RenderDispatcher`/render inline de tabela no chat continua funcionando (Phase 14/15 não regridem) | unit/component (já existente) | `pnpm --filter web test -- render-dispatcher` ou `table-grid-panel` (suíte já existente da Phase 14) | ✅ já existe |

### Sampling Rate
- **Per task commit:** `pnpm --filter web typecheck` + `pnpm --filter web test -- <arquivo afetado>`
- **Per wave merge:** `pnpm -r test`
- **Phase gate:** `pnpm -r typecheck` e `pnpm -r test` verdes (critério 5 da Phase 16) antes de `/gsd:verify-work`; redirects 308 verificados manualmente com `next dev`/`next start` + `curl -I` (não cobertos por Vitest)

### Wave 0 Gaps

- [ ] Verificar se já existe `apps/web/src/components/app/__tests__/topbar.test.tsx` ou similar — se não, criar teste cobrindo: marca visível, sessão, "Sair", link `/privacidade`, e ausência de `aria-label="Ferramentas"`
- [ ] Criar/estender teste de `(workspace)/workspace/layout.tsx` (ou do componente de split, se extraído) que monta `TableGridPanel` + `UnifiedChatTool` simultaneamente e verifica DOM
- [ ] Script/checklist de verificação manual para os 6 redirects 308 (não automatizável facilmente em Vitest — documentar como passo manual no VALIDATION.md, com `curl -I http://localhost:3000/workspace/sql` esperando `HTTP/1.1 308` e `location: /workspace`)
- [ ] Confirmar se há teste de snapshot/E2E existente da Phase 15 (`15-03-PLAN.md` "migração UX: montar Sidebar no layout") que precisa ser atualizado/removido pois assume `Sidebar` montada

*(Framework já existe — `pnpm --filter web test`/`vitest run` já configurado e usado nas Phases 12-15; não há gap de instalação de framework.)*

## Security Domain

> `security_enforcement` não está marcado como `false` em `.planning/config.json` (verificado: arquivo de config do projeto não foi explicitamente lido para confirmar a chave, mas a ausência de configuração contrária implica enforcement habilitado por padrão conforme instruções).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | yes (já implementado, não alterado) | `getCachedUser()` + `redirect("/sign-in")` no layout — preservado integralmente |
| V3 Session Management | yes (já implementado, não alterado) | Sessão lida via `getCachedUser()`/cookies — Topbar apenas exibe `user.email` e aciona `/api/auth/sign-out` |
| V4 Access Control | yes (já implementado, não alterado) | Layout continua sendo o único guard de `/workspace/*`; redirects 308 não removem essa checagem — usuário não autenticado que acessa `/workspace/sql` é redirecionado para `/workspace` (308) e DAÍ o layout redireciona para `/sign-in` (cadeia de 2 redirects, comportamento aceitável) |
| V5 Input Validation | n/a nesta fase | Nenhum input novo de usuário é introduzido (toggle mobile é estado de UI puro, sem payload) |
| V6 Cryptography | n/a | Sem mudanças |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Open redirect via `redirects()` mal configurado (destination externo controlável) | Tampering/Spoofing | `destination` é literal estático (`"/workspace"`), não interpolado de input do usuário — sem risco de open redirect. Confirmar que nenhuma entrada usa `:path*`/parâmetros que poderiam ser refletidos para domínio externo |
| Cadeia de redirects 308 → `/workspace` → (layout) → `/sign-in` para usuário não autenticado | Information Disclosure (mínimo) | Comportamento já existente para `/workspace` direto — adicionar 6 rotas com o mesmo destino não cria nova superfície; o layout continua sendo o gate de auth para todas elas |

## Sources

### Primary (HIGH confidence)
- https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects — sintaxe de `redirects()`, `permanent: true` → 308, path matching exato vs wildcard, ordem de execução (antes do filesystem router) [CITED]
- `apps/web/src/app/(workspace)/workspace/layout.tsx`, `page.tsx`, `{sql,regex,scripts,templates,file-analysis,ocr}/page.tsx` — leitura direta do código atual [VERIFIED: leitura de arquivo]
- `apps/web/src/components/app/topbar.tsx`, `sidebar.tsx`, `tool-nav.tsx`, `workspace-shell.tsx`, `chat-input.tsx` — leitura direta [VERIFIED: leitura de arquivo]
- `apps/web/src/styles/globals.css` (linhas 240-380, 495-525, 700-725, 930-970) — leitura direta das classes do shell [VERIFIED: leitura de arquivo]
- `apps/web/src/features/unified-chat/components/table-grid-panel.tsx` — assinatura `TableGridPanel({ spec })` e derivação interna de `initialColumns` [VERIFIED: leitura de arquivo]
- `packages/shared/src/unified-chat/schema.ts` — `tableSpecPayloadSchema`/`tableColumnSchema`/`TableSpecPayload` [VERIFIED: leitura de arquivo]
- `apps/web/src/server/ai/table-clarifier.ts` (fixture `buildTableSpec`, linhas ~259-292) — fonte da `SAMPLE_SPEC` proposta [VERIFIED: leitura de arquivo]
- `apps/web/package.json` — `"next": "16.2.6"`, scripts `typecheck`/`test` [VERIFIED: leitura de arquivo]
- `apps/web/next.config.ts` — config atual sem `redirects()` [VERIFIED: leitura de arquivo]
- `pnpm exec tsc --noEmit -p .` em `apps/web` — baseline de typecheck verde antes da fase [VERIFIED: execução local, sem erros]

### Secondary (MEDIUM confidence)
- WebSearch sobre `redirect()` vs `permanentRedirect()` vs `redirects()` — cross-verificado com a doc oficial acima, mesmo conteúdo [CITED via nextjs.org]

### Tertiary (LOW confidence)
- Nenhuma — todas as claims técnicas centrais foram verificadas via leitura direta do código ou doc oficial.

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — nenhuma lib nova; versões confirmadas via package.json local
- Architecture: HIGH — código atual lido integralmente (layout, page, topbar, sidebar, tool-nav, CSS, TableGridPanel, schema)
- Pitfalls: HIGH — derivados de leitura direta do código (CSS órfão, ausência de link `/privacidade`, `useWorkspaceToolKind` regex) + doc oficial (redirects)

**Research date:** 2026-06-11
**Valid until:** 2026-07-11 (30 dias — stack estável, Next.js config API não muda com frequência; revalidar se `next` for atualizado de versão major/minor antes do planejamento)
