# Phase 16: Tela Única & Fim da Navegação Multi-Ferramenta - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Consolidar toda a experiência autenticada numa **rota única** (`/workspace`) que renderiza a **planilha viva no espaço principal + o chat de IA ao lado** — e **remover a navegação multi-ferramenta** (Sidebar de tools, ToolNav, rotas-destino dos tools antigos).

Esta fase é **só o shell/layout + corte de navegação**. Não inclui código novo de:
- protocolo de mutação chat→grade (Phase 20)
- ingestão tri-estado da planilha (Phase 19)
- persistência da planilha+conversa entre sessões (Phase 21)
- **deleção do código** dos tools avulsos / OCR / file-analysis / dispatcher (Phase 18)
- desligamento de monetização/cota/billing (Phase 17)

Requisitos cobertos: **SHELL-01, SHELL-02, SHELL-03, CLEAN-05**.

</domain>

<decisions>
## Implementation Decisions

### Arranjo do layout
- **D-01:** Layout **lado-a-lado** — planilha viva ocupa a maior parte (espaço principal, esquerda), chat numa coluna lateral (direita). Padrão "planilha + copiloto".
- **D-02:** **Proporção fixa** (ex.: grade ~70% / chat ~30%). Sem divisória arrastável nesta fase — redimensionar pode entrar depois se houver demanda.
- **D-03:** Em telas estreitas (mobile/janela pequena), **alternar grade↔chat por toggle/abas** (mostra um OU outro), em vez de empilhar. Preserva área útil de cada painel.

### O que renderiza na grade agora
- **D-04:** O espaço principal monta a **`TableGridPanel` persistente** (o mesmo componente da tabela viva já usado inline), **sempre presente**, carregada com uma **planilha-amostra estática**. Edição/fórmulas/undo locais já funcionam; o chat ainda **não** muta a grade (isso é Phase 20). Cumpre "planilha viva no espaço principal" de verdade nesta fase.
- **D-05:** **Manter o render inline da tabela no chat por enquanto.** Não mexer em como a `TableGridPanel` aparece dentro das trocas de chat (`RenderDispatcher`) — a consolidação para grade única acontece junto com o protocolo de mutação (Phase 20). Evita retrabalho e mantém o chat capaz de exibir resultados de tabela.
- **D-06:** **Sem persistência** da grade-amostra nesta fase — ela é client-side/efêmera e recarrega a cada visita. Persistência da planilha do usuário é escopo da Phase 21.

### Destino das rotas antigas
- **D-07:** Rotas-destino antigas de página (`/workspace/{sql,regex,scripts,templates,file-analysis,ocr}`) fazem **redirect 308 → `/workspace`** (tela única). Bookmarks/links antigos não quebram; usuário cai na planilha. Atende o critério "redirecionam para a tela única".
- **D-08:** Esta fase **só corta nav + neutraliza rotas** (remove Sidebar, faz os redirects). A **deleção dos arquivos `page.tsx`** dos tools e do código dos módulos/dispatcher é escopo **explícito da Phase 18** — não deletar agora para manter commits atômicos por fronteira de fase e evitar imports quebrados.
- **D-09:** **Não mexer nos endpoints de API dos tools** (`/api/tools/{sql,ocr,...}`) nesta fase. Eles ficam órfãos (sem consumidor de UI) e são removidos na Phase 18 por critério de código morto.

### Enxugar topbar/shell
- **D-10:** Enxugamento **mínimo**: remover a `Sidebar` e a detecção de `toolKind` por rota (que fica inútil sem rotas de tool). **Deixar o entitlement/upsell de billing intacto na `Topbar`** — ele é desligado na Phase 17 (Desligar Monetização). Mantém commits atômicos por fronteira de fase.
- **D-11:** Topbar enxuta mantém de cara: **sessão do usuário + ação de sair (logout) + link para `/privacidade`**. É o mínimo que SHELL-03 e o critério #4 da fase exigem. Suporte/contato pode permanecer se já existe sem custo extra.
- **D-12:** Ao remover a Sidebar, **mover a marca "Tabelin.IA" para a Topbar** (canto esquerdo) para manter identidade visível na tela única. Tagline pode ser atualizada para o novo posicionamento (planilha viva + chat).

### Claude's Discretion
- Valores exatos das proporções do split lado-a-lado, breakpoint do toggle responsivo, e detalhes de CSS ficam a critério do planner/implementador com base na CSS existente (`apps/web/src/styles/globals.css`).
- Conteúdo concreto da planilha-amostra estática (colunas/linhas de exemplo) — escolher algo representativo do usuário de escritório brasileiro (a `TableGridPanel` já tem `initialColumns`).
- Mecanismo do redirect (config Next.js `redirects()` vs. `redirect()` em cada `page.tsx`) — escolher o que deixar a árvore mais limpa e o typecheck verde.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos do milestone
- `PRD-MILESTONE-PLANILHA-VIVA.md` — fonte da verdade do pivô v3.0. Relevante: **RF-01** (tela única planilha+chat, §7), **§4.10** (shell mínimo: layout, topbar com sessão, página de privacidade), **§5.5** (remoção da navegação multi-ferramenta), **§9.1 / §9.6** (aceite: uma única tela; nada da §5 alcançável pela UI nem por rota de API).
- `.planning/REQUIREMENTS.md` — **SHELL-01, SHELL-02, SHELL-03, CLEAN-05** (linhas 16-18, 53). Atenção: SHELL-02 menciona "nem por rota de API" — ver nota de sequenciamento abaixo.
- `.planning/ROADMAP.md` §"Phase 16" — goal + 5 Success Criteria desta fase.
- `.planning/PROJECT.md` — visão do produto, decisões-chave do pivô, escopo IN/OUT.

### Nota de sequenciamento (SHELL-02 "rota de API")
SHELL-02 pede que nenhuma navegação fique acessível "nem por rota de API". **Decisão desta fase:** as rotas de *página* dos tools redirecionam agora (D-07); os *endpoints de geração* dos tools ficam órfãos e são deletados na **Phase 18** (código morto). É sequenciamento deliberado, não lacuna — o planner deve registrar isso para a verificação não marcar como gap.

[Sem ADRs externos adicionais — decisões de implementação capturadas acima.]

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/features/unified-chat/components/table-grid-panel.tsx` — **`TableGridPanel`** (tabela viva: grid editável, fórmulas pt-BR, undo/redo). Tem `initialColumns` (linha ~119). Será montada **persistente** no espaço principal com amostra estática (D-04).
- `apps/web/src/features/unified-chat/unified-chat-tool.tsx` — **`UnifiedChatTool`** (chat unificado). Vira o **painel lateral** de chat no novo layout. Hoje é o que `/workspace/page.tsx` renderiza sozinho.
- `apps/web/src/components/app/topbar.tsx` — **`Topbar`**. Enxugar: remover `useWorkspaceToolKind`/detecção de rota; manter sessão+logout+privacidade; receber a marca. Billing/entitlement fica até Phase 17 (D-10/D-11).
- `apps/web/src/components/app/workspace-shell.tsx` — wrapper de shell (`WorkspaceShell`).
- `apps/web/src/styles/globals.css` — classes do shell: `workspace-page`, `workspace-body`, `workspace-content`, `workspace-center`, `sidebar*` (14 ocorrências de sidebar/workspace-body/center). Ajustar para o split lado-a-lado e remover estilos de sidebar.

### A remover (nav) nesta fase
- `apps/web/src/components/app/sidebar.tsx` — **`Sidebar`** com os 7 navItems (Formula/Scripts/SQL/Regex/Templates/File Analysis/OCR). É a navegação ativa a ser removida (CLEAN-05).
- `apps/web/src/components/app/tool-nav.tsx` — **`ToolNav`** **já está órfão** (não importado em nenhum `.tsx`/`.ts`). Pode ser removido aqui ou deixado para a limpeza da Phase 18.
- `apps/web/src/components/app/chat-input.tsx` — tem prop `bottomNav` (linhas 18/33/81) que existia para embutir ToolNav; hoje não recebe ToolNav. Verificar se a prop continua usada ou vira morta.

### Integration Points
- `apps/web/src/app/(workspace)/workspace/layout.tsx` — **`WorkspaceLayout`**: hoje renderiza `Topbar` + `Sidebar` + `main>workspace-center{children}`. Reescrever para o shell de tela única (Topbar enxuta + split grade/chat). Já faz `redirect("/sign-in")` se não autenticado.
- `apps/web/src/app/(workspace)/workspace/page.tsx` — renderiza `UnifiedChatTool`. Passa a compor grade (principal) + chat (lateral).
- `apps/web/src/app/page.tsx` — `redirect(user ? "/workspace" : "/sign-in")` (landing já cai na tela única — manter).
- Rotas a redirecionar (D-07): `apps/web/src/app/(workspace)/workspace/{sql,regex,scripts,templates,file-analysis,ocr}/page.tsx`.

### Established Patterns
- Roteamento Next.js App Router com route groups `(workspace)`, `(auth)`, `(billing)`. Auth via `getCachedUser()` + `redirect()` no layout.
- Render heterogêneo do chat via `RenderDispatcher` (a tabela é um dos outputs `case "table_*"`). **Não mexer** nesta fase (D-05).

</code_context>

<specifics>
## Specific Ideas

- Estética alvo: "planilha + copiloto" — grade dominante à esquerda, chat como assistente lateral (referência mental: Sheets + Gemini lado a lado).
- Em telas estreitas, toggle/abas para alternar entre "Planilha" e "Chat" (não empilhar) — preserva área útil de cada um.
- Marca "Tabelin.IA" deve permanecer visível (movida para a Topbar) após sair a Sidebar.

</specifics>

<deferred>
## Deferred Ideas

- **Divisória arrastável / split redimensionável** entre grade e chat — fora desta fase (proporção fixa por ora); reconsiderar se houver demanda.
- **Chat colapsável** (botão esconder/mostrar chat para tela cheia da planilha) — ideia válida, não priorizada nesta fase.
- **Persistência da grade/planilha do usuário** entre sessões → **Phase 21**.
- **Mutação chat→grade** (chat edita a grade principal de verdade) → **Phase 20**.
- **Ingestão tri-estado** (amostra / em branco / upload CSV-XLSX que substitui a grade) → **Phase 19**.
- **Deleção do código** dos tools avulsos, OCR, file-analysis, dispatcher e endpoints `/api/tools/*` → **Phase 18**.
- **Remoção de billing/entitlement/upsell** da Topbar e do produto → **Phase 17**.

</deferred>

---

*Phase: 16-tela-nica-fim-da-navega-o-multi-ferramenta*
*Context gathered: 2026-06-10*
