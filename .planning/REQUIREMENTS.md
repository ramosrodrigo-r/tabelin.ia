# Requirements — Milestone v2.0 Chat Unificado & Tabela Viva

**Milestone goal:** Substituir as abas de tools por um único chat onde a IA roteia o intent automaticamente, e introduzir geração de tabelas interativas estilo planilha (fórmulas vivas no browser), com um loop de clarificação que confirma especificações antes de gerar qualquer tabela.

**Research:** `.planning/research/SUMMARY.md` (HIGH confidence). Decisões técnicas fixadas: engine de fórmulas `@formulajs/formulajs` (MIT, **não** HyperFormula GPL); grid `react-datasheet-grid` (MIT); manter partição `userId+toolKind` + novo kind `"unified_table"` (sem migração Prisma); `TableSpecPayload` persistido em `ConversationExchange.assistantPayload`, estado do grid efêmero (privacidade, padrão File Analysis).

---

## v2.0 Requirements

### Chat Unificado (UNI)

- [x] **UNI-01**: Usuário digita qualquer pedido em um único input e a IA detecta o intent (fórmula/SQL/regex/scripts/análise/OCR/tabela) sem precisar escolher um tool antes
- [x] **UNI-02**: Usuário vê um pill com o tipo detectado e pode corrigir o roteamento com um clique (override de intent)
- [x] **UNI-03**: Outputs heterogêneos (código, grid de tabela, texto) renderizam inline no mesmo thread de conversa
- [x] **UNI-04**: Follow-ups preservam o contexto da capacidade resolvida (ex.: "agora explica" continua em fórmula) sem regressão das 7 capacidades existentes
- [x] **UNI-05**: Seleção de plataforma/dialeto (Excel/Sheets; dialeto SQL) persiste entre turns relacionados na sessão unificada
- [x] **UNI-06**: Classificação de intent embutida em chamada única (OpenAI Structured Outputs, campo de intent primeiro no schema) — o início do streaming permanece dentro do SLA de 2,5s
- [x] **UNI-07**: Páginas/atalhos por-tool permanecem acessíveis (sem remoção forçada das abas); o chat unificado torna-se o ponto de entrada default

### Loop de Clarificação (CLAR)

- [x] **CLAR-01**: Ao detectar pedido de tabela, a IA faz perguntas de clarificação (uma pergunta por turno) antes de gerar
- [x] **CLAR-02**: A clarificação tem teto rígido de 2 turns; depois disso a geração prossegue (sem loop infinito), com indicador de progresso ("Pergunta 1 de 2")
- [x] **CLAR-03**: Botão "Gerar mesmo assim" disponível desde o primeiro turno de clarificação (escape hatch com defaults razoáveis)
- [x] **CLAR-04**: Antes de gerar, um ConfirmationCard resume a especificação coletada (colunas, linhas, formato) para o usuário confirmar ou ajustar
- [x] **CLAR-05**: Cota é debitada apenas na geração da tabela, nunca nos turns de clarificação

### Tabela Interativa (TAB)

- [x] **TAB-01**: Usuário recebe um grid editável (click-to-edit, navegação Tab/Enter/setas) renderizado no thread de conversa
- [x] **TAB-02**: Colunas de fórmula recalculam ao vivo no browser após cada edição de célula
- [x] **TAB-03**: Usuário pode adicionar e remover linhas e colunas
- [x] **TAB-04**: Usuário pode copiar/colar (Ctrl+C/V) e desfazer/refazer (Ctrl+Z/Y) dentro do grid
- [x] **TAB-05**: Usuário pode ordenar por coluna
- [x] **TAB-06**: O grid é limitado (≤200 linhas × 26 colunas) e virtualizado; sem merge de células, freeze panes ou multi-sheet (fronteira explícita "mini-Excel")

### Localização Brasileira (LOC)

- [x] **LOC-01**: Fórmulas usam nomes de função em pt-BR (PROCV, SE, SOMASE, MÉDIA, CONT.SE… ~20 funções core) via tabela de mapeamento PT-BR→EN
- [x] **LOC-02**: Fórmulas usam `;` como separador de argumento e `,` como separador decimal
- [x] **LOC-03**: Colunas numéricas de valor/preço/total formatam como R$ (BRL); datas formatam como DD/MM/AAAA

### Export (EXP)

- [ ] **EXP-01**: Usuário pode exportar a tabela para CSV
- [ ] **EXP-02**: Usuário pode exportar a tabela para XLSX (reusando a lib `xlsx` já instalada)

### Segurança (SEC — continua de v1.2)

- [ ] **SEC-04**: Export CSV/XLSX sanitiza injeção de fórmula — prefixo `'` em qualquer célula iniciada por `=`, `+`, `-`, `@`, `\t`, `\r`; células editadas pelo usuário gravadas como texto (`t:"s"`) no XLSX
- [x] **SEC-05**: Conteúdo de célula renderiza sem XSS (apenas textContent; sem `dangerouslySetInnerHTML`)

---

## Future Requirements (deferred to v2.x)

- AutoFiltro (filtro dropdown por coluna) — validar demanda antes
- Edição retroativa da tabela via chat ("adicione uma coluna de % desconto") — exige gestão de delta de estado robusta (v2.1)
- Language pack pt-BR completo (100+ funções) — começar com ~20, ampliar via dados de uso
- Chips de sugestão de "próximo passo" abaixo de cada output
- Histórico unificado com filtro por tipo de output (só fórmulas, só SQL)

## Out of Scope (v2.0)

- Multi-sheet (múltiplas abas) na tabela interativa — multiplicador de complexidade de estado; diferido para v3+
- Colaboração em tempo real / múltiplos cursores na tabela — fora do escopo do produto (PROJECT.md)
- Versionamento persistido da tabela entre sessões — undo/redo permanece em memória da sessão
- Recálculo de fórmula no servidor — quebra o contrato de UX de planilha (latência por edição)
- HyperFormula sob GPL sem licença comercial assinada — risco legal em SaaS closed-source
- Migração de partição de histórico para `userId+sessionId` — mantida em `userId+toolKind` + kind `"unified_table"` (sem migração Prisma)
- Formatos adicionais de export (ODS, PDF, HTML)

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UNI-01 | Phase 12 | Complete |
| UNI-02 | Phase 12 | Complete |
| UNI-03 | Phase 12 | Complete |
| UNI-04 | Phase 12 | Complete |
| UNI-05 | Phase 12 | Complete |
| UNI-06 | Phase 12 | Complete |
| UNI-07 | Phase 12 | Complete |
| CLAR-01 | Phase 13 | Complete |
| CLAR-02 | Phase 13 | Complete |
| CLAR-03 | Phase 13 | Complete |
| CLAR-04 | Phase 13 | Complete |
| CLAR-05 | Phase 13 | Complete |
| TAB-01 | Phase 14 | Complete |
| TAB-02 | Phase 14 | Complete |
| TAB-03 | Phase 14 | Complete |
| TAB-04 | Phase 14 | Complete |
| TAB-05 | Phase 14 | Complete |
| TAB-06 | Phase 14 | Complete |
| LOC-01 | Phase 14 | Complete |
| LOC-02 | Phase 14 | Complete |
| LOC-03 | Phase 14 | Complete |
| SEC-05 | Phase 14 | Complete |
| EXP-01 | Phase 15 | Pending |
| EXP-02 | Phase 15 | Pending |
| SEC-04 | Phase 15 | Pending |

---

*Created: 2026-06-08 — milestone v2.0 requirements (25 requisitos, 6 categorias). Research-backed (SUMMARY.md, HIGH confidence).*
*Traceability filled: 2026-06-08 — roadmap Phase 12–15 mapped, 25/25 requirements covered.*
