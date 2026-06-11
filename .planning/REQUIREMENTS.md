# Requirements — Milestone v3.0 Planilha Viva + Chat de IA (pivô / redução de escopo)

**Defined:** 2026-06-10
**Core Value:** Usuários brasileiros trabalham numa planilha viva sempre na tela e pedem em português que a IA manipule os dados na própria grade — ou responda dúvidas sobre eles — sem escolher ferramentas nem navegar entre módulos.

**Fonte da verdade:** `PRD-MILESTONE-PLANILHA-VIVA.md` — decisões de escopo D1–D6 (§3), escopo IN (§4), escopo OUT (§5), critérios de deleção (§6), requisitos funcionais RF/RNF (§7), critérios de aceite (§9).

**Natureza do milestone:** este é um pivô. Aproximadamente metade do trabalho é **construção** (tela única, protocolo de mutação chat→grade, ingestão tri-estado) e metade é **remoção comprovada** de cadeias de código morto. As remoções são tão deliveráveis quanto as construções e têm critério de aceite próprio (busca de referências, árvore verde). O agente **deriva** o conjunto de deleção pelos critérios da §6 — não recebe lista fixa de arquivos.

---

## v1 Requirements (v3.0)

### Tela Única (SHELL)

- [x] **SHELL-01**: Ao autenticar, o usuário cai direto numa tela com a planilha viva ocupando o espaço principal e o chat de IA acessível ao lado/abaixo (RF-01)
- [x] **SHELL-02**: Nenhuma navegação para ferramentas separadas (sidebar/tool-nav, abas/deep-links de tool) permanece acessível pela UI nem por rota de API (RF-01, aceite §9.1/§9.6)
- [x] **SHELL-03**: Shell mínimo permanece: topbar com sessão do usuário, página de privacidade e o necessário para servir a tela única (§4.10)

### Estados Iniciais da Planilha (DATA)

- [ ] **DATA-01**: Usuário pode abrir a planilha com uma planilha-amostra (seed) de exemplo (RF-02a)
- [ ] **DATA-02**: Usuário pode abrir uma planilha em branco (RF-02b)
- [ ] **DATA-03**: Usuário pode importar CSV/XLSX e o arquivo vira a planilha viva, substituindo a grade (RF-02c, §4.4)
- [ ] **DATA-04**: O arquivo importado é efêmero — só a planilha resultante (conteúdo extraído) é persistida (RNF-02, §4.9)

### Chat sobre a Planilha (CHAT)

- [ ] **CHAT-01**: O pedido do usuário é enviado ao modelo junto com o estado atual da planilha (colunas, tipos, amostra de linhas) (RF-03)
- [ ] **CHAT-02**: A IA retorna operações estruturadas (sobre células/colunas/linhas/fórmulas) que são aplicadas à grade aberta — contrato de saída do protocolo de mutação chat→grade (RF-03, §7)
- [ ] **CHAT-03**: As mudanças que a IA aplica à grade podem ser desfeitas pelo usuário (undo) (RF-03)
- [ ] **CHAT-04**: Perguntas analíticas sobre os dados ("qual a média da coluna Valor?", "quantas linhas acima de 1000?") retornam resposta em texto no chat, sem alterar a grade (RF-04)
- [ ] **CHAT-05**: A resposta do chat faz streaming ao usuário (§4.5)
- [ ] **CHAT-06**: Com `OPENAI_API_KEY` ausente, o chat responde por fixture (dev/test sem custo) (RNF-03)

### Export & Persistência (PERS)

- [ ] **PERS-01**: Usuário pode exportar a planilha atual (com fórmulas já calculadas) para CSV (RF-05)
- [ ] **PERS-02**: Usuário pode exportar a planilha atual (com fórmulas já calculadas) para XLSX (RF-05)
- [ ] **PERS-03**: A planilha do usuário é salva e recuperada entre sessões (RF-06)
- [ ] **PERS-04**: A conversa associada à planilha do usuário é salva e recuperada entre sessões (RF-06)

### Localização (LOC) — regressão-guard

- [ ] **LOC-01**: Fórmulas (nomes de função pt-BR), separador `;`, formatação R$/DD-MM-AAAA e cópia de UI permanecem em pt-BR após o pivô, sem regressão (RNF-01)

### Remoção Comprovada de Capacidades OUT (CLEAN)

- [ ] **CLEAN-01**: A cadeia completa dos geradores de texto avulsos (Fórmula, Scripts, SQL, Regex, Template como tools/páginas/rotas) é removida — sem entrada pela UI nem por rota (§5.1). A *avaliação* de fórmula dentro da planilha viva permanece (§4.2)
- [ ] **CLEAN-02**: A cadeia completa do OCR (imagem→tabela) é removida — página, rota, módulo de Vision, fixtures e assets de imagem (§5.2)
- [ ] **CLEAN-03**: A Análise de Arquivos como ferramenta separada (página/rota/chat próprios) é removida; sobra apenas o caminho de ingestão CSV/XLSX da DATA-03 (§5.3)
- [ ] **CLEAN-04**: Toda a monetização/cota é removida — checkout, provedor de pagamento (Mercado Pago), webhooks, plano Pro, entitlement gates, sistema de cota/usage ledger e UI de upsell/limite (§5.4)
- [x] **CLEAN-05**: A navegação multi-ferramenta (sidebar/tool-nav e roteamento entre módulos sem destino) é removida (§5.5)
- [ ] **CLEAN-06**: O classificador de intent e o render-dispatcher são **reduzidos** ao que serve à planilha + Q&A; ramos que apontam para capacidades removidas saem (§5.6)
- [ ] **CLEAN-07**: A geração de tabela do zero pela IA (stub → clarificação → confirmação de spec) é removida (§5.7, D5)
- [ ] **CLEAN-08**: Modelos Prisma e migrations órfãos (billing/cota/ferramentas removidas) são removidos via migration coerente e revisável; o banco aplica as migrations limpo, preservando dados de usuário (contas, planilhas) (§6.4, aceite §9.9)
- [ ] **CLEAN-09**: Dependências de `package.json` que ficam sem qualquer import após a remoção são removidas — e somente essas (§6.5, aceite §9.10)
- [ ] **CLEAN-10**: Configuração órfã é limpa/atualizada — env vars, `.env.example`, `docker-compose`, scripts, README e docs que descrevem só capacidades OUT (§6.6, aceite §9.10/§9.13)
- [ ] **CLEAN-11**: Testes e fixtures (unit/e2e) que exercitam exclusivamente capacidades OUT são removidos (§6.7, aceite §9.11)
- [ ] **CLEAN-12**: Assets soltos do repositório que só serviam às capacidades OUT (ex.: amostras de OCR) são removidos, preservando os assets do escopo IN (ex.: planilha-amostra de seed) (§6.8)

### Higiene & Verificação da Limpeza (QA)

- [ ] **QA-01**: Zero imports quebrados e zero referências pendentes a código removido, comprovado por busca (imports, `href`, chamadas, uso de tipos) (aceite §9.7)
- [ ] **QA-02**: `pnpm -r typecheck`, `lint`, `test` e `build` passam verdes ao fim do milestone (aceite §9.8)

> **Regra de segurança (§6):** símbolos compartilhados entre IN e OUT (locale de fórmula, cliente OpenAI, validação de bytes do upload, schema do unified-chat) **ficam** — remove-se só o ramo comprovadamente sem consumidor IN. Na dúvida, investigar referências antes de remover.
>
> **Higiene de processo (aceite §9.12):** commits atômicos por bloco de remoção, cada um deixando a árvore verde (typecheck+test), para permitir bisseção/rollback.

---

## Future Requirements (deferred)

- **AbacatePay** — novo provedor de pagamento que substituirá a monetização removida, em milestone futuro (§8). Nada de billing entra em v3.0
- **Edição retroativa avançada via chat** — operações de delta mais ricas além do protocolo de mutação base (herdado de v2.x deferrals)
- **Language pack pt-BR completo (100+ funções)** — começar com o mapa core já existente, ampliar via uso
- **AutoFiltro (filtro dropdown por coluna)** na planilha

## Out of Scope (v3.0)

| Feature | Reason |
|---------|--------|
| Geração de tabela do zero por linguagem natural | D5 — a IA atua sobre a planilha já aberta, não monta tabela nova via stub/clarificação/spec |
| OCR (imagem → tabela) | D6 — removido por completo neste milestone |
| Billing / monetização (Mercado Pago, Pro, cota) | D3 — removido agora; AbacatePay é milestone futuro (§8) |
| Geradores de texto avulsos (SQL/regex/script/fórmula como resposta independente) | D1 — substituídos pelo chat que opera na planilha + Q&A |
| Gráficos, relatórios executivos de BI, dashboards | §8 — fora do foco da planilha viva |
| Colaboração multiusuário em tempo real | §8 — fora do escopo do produto |
| Múltiplas abas/planilhas por documento | §8 — só se trivial a partir do que já existe |

---

## Traceability

Preenchida na criação do roadmap (cada requisito mapeia para exatamente uma fase).

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHELL-01 | Phase 16 | Complete |
| SHELL-02 | Phase 16 | Complete |
| SHELL-03 | Phase 16 | Complete |
| DATA-01 | Phase 19 | Pending |
| DATA-02 | Phase 19 | Pending |
| DATA-03 | Phase 19 | Pending |
| DATA-04 | Phase 19 | Pending |
| CHAT-01 | Phase 20 | Pending |
| CHAT-02 | Phase 20 | Pending |
| CHAT-03 | Phase 20 | Pending |
| CHAT-04 | Phase 20 | Pending |
| CHAT-05 | Phase 20 | Pending |
| CHAT-06 | Phase 20 | Pending |
| PERS-01 | Phase 21 | Pending |
| PERS-02 | Phase 21 | Pending |
| PERS-03 | Phase 21 | Pending |
| PERS-04 | Phase 21 | Pending |
| LOC-01 | Phase 20 | Pending |
| CLEAN-01 | Phase 18 | Pending |
| CLEAN-02 | Phase 18 | Pending |
| CLEAN-03 | Phase 18 | Pending |
| CLEAN-04 | Phase 17 | Pending |
| CLEAN-05 | Phase 16 | Complete |
| CLEAN-06 | Phase 18 | Pending |
| CLEAN-07 | Phase 18 | Pending |
| CLEAN-08 | Phase 22 | Pending |
| CLEAN-09 | Phase 22 | Pending |
| CLEAN-10 | Phase 22 | Pending |
| CLEAN-11 | Phase 22 | Pending |
| CLEAN-12 | Phase 22 | Pending |
| QA-01 | Phase 22 | Pending |
| QA-02 | Phase 22 | Pending |

**Coverage:**
- v1 requirements (v3.0): 32 total (nota: PRD/seção inicial citam 31; a lista detalhada acima contém 32 itens — todos mapeados)
- Mapped to phases: 32 (100%)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-10 — milestone v3.0 (32 requisitos, 8 categorias). Derivados do PRD-MILESTONE-PLANILHA-VIVA.md (escopo travado D1–D6).*
