# Phase 16: Tela Única & Fim da Navegação Multi-Ferramenta - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 16-tela-nica-fim-da-navega-o-multi-ferramenta
**Areas discussed:** Arranjo do layout, O que renderiza na grade agora, Destino das rotas antigas, Enxugar topbar/shell

---

## Arranjo do layout

### Disposição planilha + chat
| Option | Description | Selected |
|--------|-------------|----------|
| Lado-a-lado (grade + chat lateral) | Grade ocupa a maior parte à esquerda, chat numa coluna estreita à direita | ✓ |
| Empilhado (grade em cima, chat embaixo) | Grade no topo, chat numa faixa inferior | |
| Você decide | Planner/researcher escolhe com base na CSS existente | |

### Divisória redimensionável?
| Option | Description | Selected |
|--------|-------------|----------|
| Proporção fixa | Larguras fixas (~70/30), simples e previsível | ✓ |
| Divisória arrastável | Usuário arrasta para redimensionar | |
| Chat colapsável | Fixo, com botão para esconder/mostrar o chat | |

### Comportamento responsivo (telas estreitas)
| Option | Description | Selected |
|--------|-------------|----------|
| Empilha (grade em cima, chat embaixo) | Lado-a-lado em desktop, empilhado quando estreito | |
| Alternar com abas/toggle | Mostra grade OU chat com toggle | ✓ |
| Não priorizar mobile agora | Foco desktop; mobile aceitável-mas-não-otimizado | |

**User's choice:** Lado-a-lado / Proporção fixa / Alternar com abas/toggle no mobile.
**Notes:** Estética "planilha + copiloto"; preservar área útil de cada painel em telas estreitas em vez de empilhar.

---

## O que renderiza na grade agora

### Conteúdo do espaço principal
| Option | Description | Selected |
|--------|-------------|----------|
| TableGridPanel persistente com amostra estática | Tabela viva real sempre presente, com planilha-amostra fixa; chat ainda não muta (P20) | ✓ |
| Grade vazia persistente | Mesma grade, começa em branco | |
| Placeholder até P19/P20 | Skeleton até ingestão/mutação chegarem | |

### Render inline da tabela no chat
| Option | Description | Selected |
|--------|-------------|----------|
| Manter inline por enquanto | Não mexer no RenderDispatcher; consolidação na P20 | ✓ |
| Remover render inline agora | Tirar tabela das trocas de chat já | |

### Persistência da grade-amostra
| Option | Description | Selected |
|--------|-------------|----------|
| Não — amostra em memória só | Client-side/efêmera; persistência é P21 | ✓ |
| Sim — já persistir nesta fase | Salvar grade por usuário agora (scope creep) | |

**User's choice:** TableGridPanel persistente com amostra estática / Manter inline / Sem persistência.
**Notes:** Define que a planilha viva fica "real" no espaço principal já nesta fase, sem antecipar mutação (P20), ingestão (P19) ou persistência (P21).

---

## Destino das rotas antigas

### Comportamento das rotas-destino antigas
| Option | Description | Selected |
|--------|-------------|----------|
| Redirect 308 → tela única | Rotas antigas redirecionam para /workspace | ✓ |
| 404/410 (rota morre) | Rotas deixam de responder | |
| Você decide | Planner escolhe por rota | |

### Deletar page.tsx agora ou na P18?
| Option | Description | Selected |
|--------|-------------|----------|
| Só cortar nav+rota agora; deletar código na P18 | Remove Sidebar/ToolNav + redirects; deleção de código fica na P18 | ✓ |
| Já deletar os page.tsx nesta fase | Antecipa parte da P18 (risco de imports quebrados) | |

### Rotas de API dos tools
| Option | Description | Selected |
|--------|-------------|----------|
| Não mexer agora — só a P18 | APIs ficam órfãs, removidas na P18 por código morto | ✓ |
| Bloquear/404 as APIs de tools já | Fecha superfície mais cedo | |

**User's choice:** Redirect 308 / Só cortar nav+rota agora / Não mexer nas APIs.
**Notes:** Sequenciamento deliberado vs. SHELL-02 ("nem por rota de API") — page routes redirecionam agora, endpoints de geração deletados na P18. Registrado no CONTEXT.md para a verificação não marcar como gap.

---

## Enxugar topbar/shell

### Quanto enxugar a Topbar (billing OUT)
| Option | Description | Selected |
|--------|-------------|----------|
| Mínimo: só o necessário pro shell único | Remove Sidebar + toolKind; billing fica até P17 | ✓ |
| Já remover billing/upsell da Topbar agora | Antecipa P17 | |
| Você decide | Planner decide por acoplamento real | |

### O que a Topbar mantém visível (SHELL-03)
| Option | Description | Selected |
|--------|-------------|----------|
| Sessão do usuário + logout + link privacidade | Mínimo exigido por SHELL-03 e critério #4 | ✓ |
| Só sessão + logout (sem privacidade visível) | Mais minimalista, mas critério #4 exige o link | |
| Manter Topbar atual como está | Não tocar além de remover Sidebar | |

### Branding da Sidebar
| Option | Description | Selected |
|--------|-------------|----------|
| Mover marca pra Topbar | Nome Tabelin.IA migra para a Topbar | ✓ |
| Sem branding por enquanto | Não realocar a marca | |
| Você decide | Planner posiciona conforme CSS | |

**User's choice:** Mínimo / Sessão+logout+privacidade / Mover marca pra Topbar.
**Notes:** Billing/entitlement permanece na Topbar até a Phase 17 (Desligar Monetização). Tagline da marca pode ser atualizada para o novo posicionamento.

---

## Claude's Discretion

- Proporções exatas do split lado-a-lado, breakpoint do toggle responsivo e detalhes de CSS.
- Conteúdo concreto da planilha-amostra estática (colunas/linhas).
- Mecanismo do redirect (Next.js `redirects()` vs. `redirect()` por page).

## Deferred Ideas

- Divisória arrastável / split redimensionável — futuro.
- Chat colapsável (tela cheia da planilha) — futuro.
- Persistência da planilha+conversa → Phase 21.
- Mutação chat→grade → Phase 20.
- Ingestão tri-estado (amostra/branco/upload) → Phase 19.
- Deleção do código de tools/OCR/file-analysis/dispatcher/API → Phase 18.
- Remoção de billing/entitlement/upsell → Phase 17.
