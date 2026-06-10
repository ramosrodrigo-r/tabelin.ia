# PRD — Milestone "Planilha Viva + Chat de IA" (Redução de Escopo)

**Projeto:** Tabelin.IA
**Tipo de milestone:** Pivô / redução de escopo + limpeza de código morto
**Idioma do produto:** Português (Brasil)
**Status:** Draft — pronto para planejamento de engenharia
**Autor:** Rodrigo (diagnóstico e redação assistidos por IA)
**Data:** 2026-06-10

> Este documento **substitui funcionalmente** o `PRD.md` original (multi-tool, inspirado no GPTExcel). O `PRD.md` antigo é mantido apenas como registro histórico do que foi entregue em v1.0–v1.2.

---

## 1. Diagnóstico do estado atual

O Tabelin.IA hoje é um **SaaS multi-ferramenta** ("canivete suíço de planilhas") com **7+ ferramentas independentes**, cada uma com sua própria página, rota de API, camada de IA no servidor, componentes de UI e schema compartilhado:

| Área atual | O que é | Forma de uso |
|---|---|---|
| Fórmula (gerar/explicar) | Texto → fórmula localizada | Página + rota próprias |
| Scripts (VBA/Apps Script) | Texto → código | Página + rota próprias |
| SQL | Texto → query por dialeto | Página + rota próprias |
| Regex | Texto → padrão regex | Página + rota próprias |
| Template | Texto → estrutura de tabela | Página + rota próprias |
| Análise de Arquivos | Upload CSV/XLSX → chat sobre os dados | Página + rota próprias |
| OCR | Imagem → tabela TSV | Página + rota próprias |
| Unified Chat | Um campo que classifica intenção e despacha para qualquer uma das anteriores; inclui a "tabela viva" (grade editável com motor de fórmulas) | Página principal do workspace |

**Observações do diagnóstico:**

1. **A visão do produto já convergiu para o Unified Chat**, mas as 7 ferramentas antigas continuam vivas como páginas, rotas, features e schemas paralelos — gerando grande superfície de manutenção, navegação por sidebar/tool-nav e código duplicado.
2. **O ativo mais valioso já existe e está maduro:** a *tabela viva* (`react-datasheet-grid` + motor de fórmulas pt-BR com `@formulajs/formulajs`, undo/redo, ordenação, export CSV/XLSX, avaliador aritmético, tooltips de erro estilo Excel). Hoje ela só aparece quando a IA decide gerar uma tabela; **não é o centro da experiência**.
3. **Monetização é uma camada transversal pesada** (Mercado Pago, checkout, webhooks, plano Pro, cota free-tier com reserve/confirm/release, usage ledger) acoplada a quase todas as rotas via gates de quota/entitlement.
4. **Persistência e autenticação são sólidas** (Better Auth + Postgres/Prisma) e devem permanecer.
5. **O schema do banco e as migrations carregam muitos modelos** ligados às ferramentas e ao billing que sairão de escopo.

**Conclusão do diagnóstico:** o produto está "largo e raso". A oportunidade é **estreitar para uma única experiência profunda**: *uma planilha sempre presente na tela + um chat de IA que trabalha em cima dela*. Quase tudo o que existe hoje é, ou (a) já parte dessa experiência, ou (b) infraestrutura paralela que pode ser removida.

---

## 2. Visão do novo milestone

> **Uma plataforma. Uma planilha viva sempre na tela. Um chat de IA ao lado que trabalha em cima dessa planilha.**

O usuário entra e vê uma **planilha editável** (estilo Excel/Google Sheets). Ao lado/abaixo, há um **chat de IA em português** que:

- **Manipula a planilha aberta:** edita células, cria e preenche colunas de fórmula, ordena, filtra, limpa, transforma e completa dados — toda saída relevante vira mudança na grade.
- **Responde dúvidas sobre os dados em texto:** ex. "qual a média da coluna Valor?", "quantas linhas estão acima de 1000?" — resposta conversacional, sem necessariamente alterar a planilha.

Nada além disso. Sem ferramentas separadas, sem navegação entre módulos, sem catálogo de geradores.

---

## 3. Decisões de escopo travadas (parâmetros de corte)

Estas decisões são **a fonte da verdade** para o agente executor classificar o que fica e o que sai:

| # | Decisão | Valor travado |
|---|---|---|
| D1 | **Papel do chat** | Manipular a planilha **+** responder dúvidas em texto sobre os dados. **Não** existem mais geradores avulsos de SQL, regex, script ou fórmula como "resposta de texto" independente. |
| D2 | **Autenticação e persistência** | **Mantidas.** Cadastro/login/reset (Better Auth) e persistência por usuário (Postgres/Prisma) permanecem. |
| D3 | **Monetização e cota** | **Removidas por completo.** Mercado Pago, checkout, webhooks, plano Pro, gates de entitlement e todo o sistema de cota/usage ledger saem. (Substituição futura por AbacatePay — ver §8, fora deste milestone.) |
| D4 | **Origem dos dados da planilha** | Três caminhos: **(a) planilha-amostra (seed)** ao abrir, **(b) planilha em branco**, **(c) upload de CSV/XLSX** que vira a planilha viva. |
| D5 | **Geração de tabela do zero pela IA** | **Fora de escopo.** O fluxo de "descreva e a IA monta uma tabela nova" (stub → clarificação → confirmação de spec) não é objetivo deste milestone. A IA atua sobre a planilha que já está aberta. |
| D6 | **OCR (imagem → tabela)** | **Fora de escopo.** Removido. |

---

## 4. Escopo IN — capacidades que PERMANECEM

O agente deve preservar **a cadeia completa** que sustenta cada capacidade abaixo (UI → estado → rota/servidor → IA → schema → persistência → testes):

1. **Planilha viva (grade editável)** — renderização da grade, edição de células, adicionar/remover linha e coluna, ordenação, undo/redo, limites de tamanho, tooltips de erro.
2. **Motor de fórmulas pt-BR** — avaliação de fórmulas (funções localizadas + expressões aritméticas), separador `;`/`,`, mapeamento de erros estilo Excel, recálculo derivado (display-only).
3. **Export** — exportar a planilha para CSV e XLSX.
4. **Ingestão de dados para a planilha** — (a) seed de amostra, (b) planilha em branco, (c) upload e parsing de CSV/XLSX para popular a grade. (A extração/validação de bytes de CSV/XLSX é mantida **somente** no que serve a este caminho.)
5. **Chat de IA sobre a planilha** — streaming de resposta, envio do estado/contexto da planilha para o modelo, aplicação das mudanças retornadas à grade, e respostas em texto para dúvidas. Inclui o cliente de IA (OpenAI) e o modo *fixture* sem chave.
6. **Autenticação e sessão** — cadastro, login, logout, reset de senha (Better Auth).
7. **Persistência por usuário** — salvar/recuperar a planilha do usuário e o histórico de conversa associado.
8. **Localização pt-BR** — sintaxe brasileira de fórmulas, separadores, formatação de moeda/data, exemplos e cópia de UI em português.
9. **Privacidade** — arquivos enviados continuam efêmeros; só o conteúdo extraído (a planilha) é mantido conforme política.
10. **Shell mínimo da app** — layout, topbar com sessão do usuário, página de privacidade, e o necessário para servir a tela única.

---

## 5. Escopo OUT — capacidades que SAEM (e seu código morto associado)

O agente deve **remover a cadeia completa** de cada capacidade abaixo. "Cadeia completa" = páginas, rotas de API, hooks/componentes de UI, módulos de servidor/IA, schemas compartilhados, fixtures, modelos de banco, migrations órfãs, variáveis de ambiente, dependências e testes que existem **somente** por causa dela.

1. **Ferramentas de texto avulsas:** geração/explicação de **Fórmula** como página própria, **Scripts**, **SQL**, **Regex** e **Template** como ferramentas independentes. (A *avaliação* de fórmula dentro da planilha viva NÃO é isto — ela fica, ver §4.2.)
2. **OCR** (imagem → tabela) inteiro.
3. **Análise de Arquivos como ferramenta separada** (página/rota/chat próprios). O que sobra de upload é só o caminho de ingestão da §4.4.
4. **Toda a monetização e cota:** checkout, provedor de pagamento, webhooks, plano Pro, entitlements como gate, sistema de cota/usage ledger e qualquer UI de upsell/limite.
5. **Navegação multi-ferramenta:** sidebar/tool-nav e qualquer roteamento entre módulos que deixe de ter destino.
6. **Despacho por intenção para ferramentas que saíram:** classificador de intenção, cards de clarificação/confirmação e o render-dispatcher devem ser **reduzidos** ao que serve à planilha + Q&A; ramos que apontam para capacidades removidas saem.
7. **Geração de tabela do zero pela IA** (stub/clarificação/confirmação de spec) — ver D5.

> ⚠️ **O agente NÃO deve receber uma lista de arquivos para apagar.** Ele deve **derivar** o conjunto de deleção a partir dos critérios da §6, partindo das capacidades OUT acima.

---

## 6. Critérios de deleção (parâmetros para o agente decidir sozinho)

O agente é responsável por **identificar** o código morto aplicando, em ordem, os seguintes critérios. Para cada candidato, a decisão deve ser **comprovada**, não presumida:

1. **Origem por capacidade:** começar pelas capacidades da §5. Um arquivo/módulo que existe *exclusivamente* para uma capacidade OUT é candidato a remoção.
2. **Ausência de referências de entrada:** após remover os pontos de entrada (páginas/rotas), buscar referências (imports, `href`, chamadas, uso de tipos) a cada símbolo/arquivo restante. **Zero referências de dentro do escopo IN ⇒ morto.**
3. **Exports órfãos:** funções, hooks, componentes, tipos e fixtures exportados mas não consumidos por nenhum código IN.
4. **Modelos e migrations de banco órfãos:** modelos Prisma que só serviam a billing/cota/ferramentas removidas, e campos que ficam sem uso. Gerar migration de remoção coerente; não deixar o schema descrevendo tabelas mortas.
5. **Dependências órfãs:** pacotes em `package.json` que deixam de ter qualquer import após a remoção (e somente esses).
6. **Configuração órfã:** variáveis de ambiente, exemplos de `.env`, entradas de `docker-compose`, scripts e documentação que só descrevem capacidades OUT.
7. **Testes e fixtures órfãos:** specs unit/e2e e fixtures que exercitam exclusivamente capacidades OUT.
8. **Assets soltos do repositório** que só serviam às capacidades OUT (ex.: amostras de OCR/imagem), distinguindo-os de assets ainda usados pelo escopo IN (ex.: uma planilha-amostra de seed pode ser necessária).

**Regra de segurança (não deletar por engano):** se um símbolo é compartilhado entre IN e OUT (ex.: utilitários de locale de fórmula, cliente de IA, validação de bytes usada também pelo upload IN), ele **fica** — remove-se apenas o que ficou comprovadamente sem consumidor IN. Na dúvida entre "morto" e "compartilhado", o agente deve **investigar referências antes de remover**, nunca o contrário.

---

## 7. Trabalho de produto necessário (além da limpeza)

A redução de escopo exige consolidar a experiência numa tela única. Requisitos funcionais do que **fica/é construído**:

- **RF-01 — Tela única planilha+chat:** ao autenticar, o usuário cai direto numa tela com a planilha viva ocupando o espaço principal e o chat de IA acessível ao lado/abaixo. Sem menu de ferramentas.
- **RF-02 — Estados iniciais da planilha:** oferecer (a) abrir com **planilha-amostra** de exemplo, (b) **planilha em branco**, (c) **importar CSV/XLSX**. Importar substitui a grade pela planilha do arquivo.
- **RF-03 — Chat opera na planilha aberta:** o pedido do usuário é enviado ao modelo **junto com o estado atual da planilha** (colunas, tipos, amostra de linhas). A resposta que altera dados/colunas/fórmulas é **aplicada à grade**, com possibilidade de desfazer (undo).
- **RF-04 — Chat responde dúvidas:** perguntas analíticas sobre os dados retornam resposta em texto no chat, sem alterar a grade.
- **RF-05 — Export:** exportar a planilha atual (com fórmulas já calculadas) para CSV e XLSX.
- **RF-06 — Persistência:** a planilha e a conversa do usuário são salvas e recuperadas entre sessões.
- **RNF-01 — Localização:** fórmulas, separadores, moeda/data e textos em pt-BR.
- **RNF-02 — Privacidade:** arquivos importados são efêmeros; persiste-se apenas a planilha resultante e o conteúdo derivado.
- **RNF-03 — Modo sem chave de IA:** com `OPENAI_API_KEY` ausente, o chat responde por *fixture* (para desenvolvimento/testes sem custo).

> O *protocolo de mutação chat→grade* (RF-03) provavelmente exige trabalho novo: hoje a IA gera uma tabela inteira, mas não aplica *edições* a uma planilha já aberta. Definir um contrato de saída estruturada (ex.: operações sobre colunas/linhas/células) é parte deste milestone.

---

## 8. Não-objetivos / fora deste milestone

- **AbacatePay** (novo provedor de pagamento) — substituirá a monetização removida, mas em **milestone futuro**. Nada de billing entra agora.
- Geração de tabela do zero por linguagem natural (D5).
- OCR (D6).
- Gráficos, relatórios executivos de BI, dashboards.
- Colaboração multiusuário em tempo real.
- Múltiplas abas/planilhas por documento (a menos que trivial de manter a partir do que já existe).

---

## 9. Critérios de aceitação do milestone

A entrega só é considerada concluída quando **todos** os itens abaixo são verdadeiros:

**Produto**
1. Existe **uma única** tela autenticada: planilha viva + chat. Nenhuma navegação para ferramentas separadas permanece acessível.
2. Os três estados iniciais (amostra, em branco, upload CSV/XLSX) funcionam.
3. O chat aplica mudanças à planilha aberta **e** responde dúvidas em texto.
4. Export CSV/XLSX funciona com fórmulas calculadas.
5. Login/persistência funcionam e a planilha do usuário sobrevive entre sessões.

**Limpeza (comprovada, não presumida)**
6. Nenhuma capacidade da §5 permanece alcançável pela UI nem por rota de API.
7. **Zero imports quebrados** e zero referências pendentes a código removido (comprovado por busca).
8. `pnpm -r typecheck`, `lint`, `test` e `build` passam **verdes**.
9. O schema Prisma e as migrations não descrevem mais tabelas/colunas mortas; o banco aplica as migrations limpo.
10. `package.json` não contém dependências sem consumidor; `.env.example`/`docker-compose`/README não descrevem mais capacidades removidas.
11. Não restam testes/fixtures exercitando capacidades OUT.

**Higiene de processo**
12. Commits atômicos por bloco de remoção, cada um deixando a árvore verde (typecheck+test), para permitir bisseção/rollback.
13. README e docs principais atualizados para descrever **apenas** o novo escopo.

---

## 10. Riscos e atenção

- **Acoplamento de cota/entitlement nas rotas IN:** os gates de quota podem estar entrelaçados na rota de chat que fica. Remover o gate sem quebrar o fluxo de streaming exige cuidado (a rota fica; o gate sai).
- **Símbolos compartilhados:** locale de fórmula, cliente OpenAI, validação de bytes e o schema do unified-chat são usados tanto por IN quanto por OUT. Aplicar a regra de segurança da §6 — remover só o ramo morto.
- **Migrations destrutivas:** remover modelos de banco é irreversível em produção. Garantir migration coerente e revisável; preservar dados de usuário (contas, planilhas) intactos.
- **Render-dispatcher / classificador de intenção:** reduzir em vez de apagar — eles continuam servindo planilha + Q&A.
