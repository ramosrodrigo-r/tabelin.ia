# Phase 19: Ingestão Tri-Estado da Planilha - Validation

Esta fase será validada utilizando testes unitários, testes de integração de rota de API, e validação manual do fluxo de ingestão tri-estado no frontend.

---

## 1. Critérios de Aceitação (UAT)

| ID | Caso de Teste | Ação | Expectativa |
|----|---------------|------|-------------|
| UAT-19-01 | Carregamento Inicial com Seed | Abrir `/workspace` pela primeira vez | A planilha deve renderizar o `SAMPLE_SPEC` padrão contendo dados de exemplo ("Controle de Gastos"). |
| UAT-19-02 | Iniciação de Planilha em Branco | Clicar em "Nova em Branco" | A planilha é limpa e exibe 10 linhas em branco com 3 colunas padrão ("Coluna A", "Coluna B", "Coluna C"). |
| UAT-19-03 | Importar Arquivo Válido (CSV) | Fazer upload de um CSV válido contendo dados e fórmulas através do botão "Importar Planilha" | A grade é atualizada exibindo exatamente as linhas e colunas detectadas no arquivo CSV, e o título vira o nome do arquivo sanitizado. |
| UAT-19-04 | Importar Arquivo Válido (XLSX) | Fazer upload de um arquivo XLSX com mais de 200 linhas | A planilha carrega a primeira aba do arquivo truncando a exibição para exatamente 200 linhas (proteção contra DoS). |
| UAT-19-05 | Rejeição de Arquivo Inválido | Fazer upload de uma imagem ou arquivo de texto `.txt` | O frontend exibe uma mensagem de erro amigável em pt-BR (ex.: "Formato de arquivo não suportado"). |
| UAT-19-06 | Preservação de Histórico de Undo/redo | Importar um arquivo e depois pressionar Ctrl+Z no grid focado | O grid reverte para o estado anterior ao upload (a planilha em branco ou o seed). |

---

## 2. Testes de Integração & Unidade

### A. Rota `/api/workspace/import`
Criaremos o arquivo de teste `apps/web/tests/workspace-import.test.ts` para testar os seguintes comportamentos da API:
* **Autenticação:** Rejeita requisições sem cookie de sessão com `status: 401`.
* **Upload sem arquivo:** Retorna `status: 400` se nenhum arquivo for fornecido.
* **Tamanho do arquivo:** Rejeita arquivos maiores que o limite (`5 MB` para free / `25 MB` no dispatcher) com `status: 413`.
* **ZIP-bomb:** Bloqueia ZIP-bombs com `status: 422`.
* **Mapeamento bem-sucedido:** Envia um arquivo CSV/XLSX válido e verifica se retorna o JSON com o `TableSpecPayload` mapeado corretamente (tipos de dados e nomes de colunas formatados).

### B. Workspace State Context
Criaremos testes em `apps/web/tests/workspace-state.test.tsx` (ou integraremos em testes de componentes existentes):
* Garante que `SAMPLE_SPEC` é carregado por padrão.
* Garante que `resetToBlank()` redefine as linhas e colunas.
* Garante que `setSpec()` atualiza o estado e empurra uma nova entrada no histórico para possibilitar undo/redo.
