# Phase 19: Ingestão Tri-Estado da Planilha - Context

Este documento consolida as decisões de design, comportamento do usuário e especificações funcionais para a Wave 2 da Fase 19, baseadas nas preferências definidas em discussão com o usuário.

---

## 1. Diretrizes de UI e Controle de Planilha

### A. Barra de Ferramentas (Toolbar)
Os botões de controle de ingestão e alteração de estado da planilha devem ser inseridos na barra de ferramentas existente (`table-grid-toolbar`) em `table-grid-panel.tsx`:
- **"Nova em Branco":** Reseta a planilha para 10 linhas vazias e 3 colunas padrão (Coluna A, Coluna B, Coluna C).
- **"Carregar Exemplo":** Restaura a planilha para o `SAMPLE_SPEC` ("Controle de Gastos").
- **"Importar Planilha":** Aciona um seletor de arquivos oculto (`accept=".csv,.xlsx"`). Ao selecionar o arquivo, realiza a requisição fetch POST multipart para `/api/workspace/import`.

### B. Feedback de Carregamento (Overlay)
Durante o upload e o processamento de parsing no servidor:
- O frontend deve exibir um overlay cobrindo todo o componente `TableGridPanel` (ou especificamente o container do grid).
- O overlay deve conter um spinner de carregamento e o texto explicativo `"Importando planilha..."`.
- Interações com a grade (edições, cliques nos botões da barra de ferramentas) devem ser temporariamente bloqueadas/desabilitadas.

---

## 2. Tratamento de Erros e Resiliência

- Se a API `/api/workspace/import` falhar ou retornar status de erro (ex: 413 arquivo muito grande, 422 arquivo inválido ou zip-bomb):
  - Exibir um banner/modal de erro estilizado no topo do painel da grade com a mensagem de erro retornada pelo servidor em português.
  - O estado atual da planilha (linhas e colunas em edição antes de tentar importar) deve ser mantido intacto, evitando a perda do trabalho do usuário.

---

## 3. Comportamento do Histórico (Undo/Redo)

- O reset (Nova em Branco, Carregar Exemplo) e a Importação de arquivo local devem ser tratados como ações normais de histórico.
- Quando o usuário executa um desses comandos, o estado anterior da planilha é empurrado para o array `past` no `WorkspaceStateContext`.
- O usuário deve ser capaz de pressionar `Ctrl+Z` (ou desfazer) dentro da planilha para reverter o import/reset e restaurar a planilha que estava aberta anteriormente.

---

## 4. Mapeamento de Tipos e Títulos

- **Título da Planilha:** O nome do arquivo limpo sem extensão (ex.: `despesas-maio.xlsx` -> `Despesas Maio`) deve ser atribuído como título da planilha importada.
- **Tipos de Coluna:** Mapear os tipos detectados no CSV/XLSX:
  - `"numero"` -> `"number"` (e parsear valores floats, tratando ponto/vírgula do Brasil).
  - `"data"` -> `"date"` (e mapear datas para strings ISO AAAA-MM-DD).
  - Outros tipos -> `"text"`.
