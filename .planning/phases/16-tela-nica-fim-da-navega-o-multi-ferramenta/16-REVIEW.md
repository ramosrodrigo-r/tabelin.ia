---
phase: 16-tela-nica-fim-da-navega-o-multi-ferramenta
reviewed: 2026-06-11T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - apps/web/next.config.ts
  - apps/web/src/app/(workspace)/workspace/layout.tsx
  - apps/web/src/components/app/topbar.tsx
  - apps/web/src/components/app/workspace-split.tsx
  - apps/web/src/features/unified-chat/lib/sample-spec.ts
  - apps/web/src/styles/globals.css
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-06-11T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

A fase 16 reescreve a tela `/workspace` para um layout único (planilha + chat lado a lado), enxuga a `Topbar` removendo a detecção de rota, adiciona redirects 308 das rotas antigas de tool, e extrai uma planilha-amostra estática (`SAMPLE_SPEC`). A implementação é simples, objetiva e segue de perto o plano: `next.config.ts` tem exatamente as 6 entradas de redirect com `destination` literal (sem risco de open redirect); `WorkspaceSplit` mantém ambos os painéis sempre montados via `data-hidden`, preservando estado conforme exigido (D-03); o CSS novo (`.workspace-grid-panel`/`.workspace-chat-panel`/`.workspace-mobile-toggle` + breakpoint 900px) está coerente e a remoção de `.sidebar*`/`.workspace-content`/`.workspace-center` não deixou referências órfãs; `SAMPLE_SPEC` está corretamente tipado conforme `tableSpecPayloadSchema` (colunas, `formulaLanguage`, `separator` válidos).

Não foram encontrados problemas de segurança nem bugs que quebrem o build ou o comportamento. O único ponto de atenção real é uma ramificação de código agora inalcançável em `topbar.tsx`, decorrente da fixação de `toolKind = "unified"`. Os demais achados são de estilo/acessibilidade (Info).

## Warnings

### WR-01: Branch `deleteCopy` para `toolKind !== "unified"` agora é código morto

**File:** `apps/web/src/components/app/topbar.tsx:33-37`

**Issue:** Após a Task 2 do Plan 01, `toolKind` é calculado como `toolKindProp ?? "unified"`. O único call site de `<Topbar>` (`apps/web/src/app/(workspace)/workspace/layout.tsx:28`) não passa `toolKind`, então `toolKindProp` é sempre `undefined` e `toolKind` é sempre `"unified"`. Consequentemente, o ramo `else` de `deleteCopy` ("Apagar o histórico deste tool? Esta ação não pode ser desfeita.") nunca é executado — é código morto que sugere uma ramificação de comportamento que não existe mais. O mesmo vale para o guard `{toolKind ? (...) : null}` na linha 94, que agora é sempre verdadeiro (string não vazia), tornando a condicional supérflua.

Isso não causa bug funcional hoje, mas é um resíduo do corte de navegação multi-ferramenta (a própria razão de ser da fase) e pode confundir futuras manutenções — alguém pode tentar reativar esse branch achando que ele é alcançável por alguma rota residual.

**Fix:** Simplificar removendo a ramificação morta e a prop `toolKind` (ou documentar explicitamente por que ela é mantida para uma futura reintrodução). Exemplo mínimo:

```tsx
// toolKind fixo "unified" — única tela após o corte de navegação multi-ferramenta
const toolKind = "unified";
const deleteCopy = "Apagar todo o histórico do chat unificado? Esta ação não pode ser desfeita.";
```

E remover o guard `{toolKind ? (...) : null}` (linha 94), já que `toolKind` é sempre truthy — substituir por renderização direta do bloco `account-menu-container`/popover "Nova conversa". Se a prop `toolKind?: string` for mantida por compatibilidade futura (ex.: Phase 18+), adicionar um comentário explicando o porquê, em vez de deixar a ramificação `else` silenciosamente inalcançável.

## Info

### IN-01: Toggle mobile "Planilha"/"Chat" sem semântica de abas (ARIA)

**File:** `apps/web/src/components/app/workspace-split.tsx:22-37`

**Issue:** Os botões do `.workspace-mobile-toggle` controlam a visibilidade exclusiva de dois painéis (comportamento de "tabs"), mas não usam `role="tablist"`/`role="tab"`/`aria-selected` nem `aria-controls`. Apenas `data-active` (usado para estilo) está presente. Leitores de tela não anunciam a relação de seleção/painel associado.

**Fix:** Adicionar semântica de abas, por exemplo:

```tsx
<div className="workspace-mobile-toggle" role="tablist" aria-label="Alternar entre planilha e chat">
  <button
    type="button"
    role="tab"
    aria-selected={activeTab === "grid"}
    aria-controls="workspace-grid-panel"
    data-active={activeTab === "grid"}
    onClick={() => setActiveTab("grid")}
  >
    Planilha
  </button>
  ...
</div>
<div id="workspace-grid-panel" className="workspace-grid-panel" data-hidden={activeTab === "chat"}>
  {grid}
</div>
```

Não é um requisito explícito do UI-SPEC desta fase, mas melhora acessibilidade do novo componente sem custo de complexidade.

### IN-02: `data-hidden` renderiza `"true"`/`"false"` como string em ambos os atributos, mas o CSS só trata o caso `true`

**File:** `apps/web/src/components/app/workspace-split.tsx:38,41` e `apps/web/src/styles/globals.css:904-907`

**Issue:** `data-hidden={activeTab === "chat"}` produz no DOM `data-hidden="true"` ou `data-hidden="false"` (React serializa booleanos em atributos `data-*` como string). O CSS só define a regra para `[data-hidden="true"]`; o atributo `data-hidden="false"` fica presente no DOM em desktop e no painel visível em mobile, sem efeito, mas é ruído semântico (alguém inspecionando o DOM pode interpretar `data-hidden="false"` como "oculto = falso" de forma ambígua, ou ferramentas de automação podem usar esse seletor incorretamente). Não é um bug — o resultado visual está correto — mas é uma pequena inconsistência de modelagem de dados-atributo.

**Fix:** Opcional — usar `data-hidden={activeTab === "chat" ? "" : undefined}` (presença/ausência do atributo) em vez de string `"true"/"false"`, e ajustar o seletor CSS para `[data-hidden]` (presença). Ou manter como está e documentar a convenção (`data-hidden="true"|"false"` sempre presente, CSS reage apenas a `"true"`) — ambas são aceitáveis; flag apenas para consciência da equipe, sem ação obrigatória.

---

_Reviewed: 2026-06-11T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
