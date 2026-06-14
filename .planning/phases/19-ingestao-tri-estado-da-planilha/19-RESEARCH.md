# Phase 19: Ingestão Tri-Estado da Planilha - Research

**Researched:** 2026-06-14
**Domain:** Ingestão de planilhas (tri-estado), parsing de arquivos CSV/XLSX no servidor, controle de estado do workspace unificado.
**Confidence:** HIGH

## Summary

O objetivo da Fase 19 é implementar a ingestão tri-estado da planilha ativa na tela única do Tabelin.IA. O usuário poderá:
1. Começar ou redefinir a planilha com uma planilha-amostra populada (seed: `SAMPLE_SPEC`).
2. Criar uma planilha limpa em branco (3 colunas, 10 linhas vazias).
3. Importar um arquivo local CSV ou XLSX que substitui a grade viva de forma efêmera (o arquivo bruto é descartado após o parse em memória; apenas o payload `TableSpecPayload` extraído é persistido).

Para que o chat e o grid compartilhem o estado atual da planilha (necessário para a Fase 20), o estado local de dados da grade e de desfazer/refazer (undo/redo) é migrado de `table-grid-panel.tsx` para um novo contexto React cliente compartilhado: `WorkspaceStateContext`.

O parse do arquivo CSV/XLSX importado deve rodar estritamente no servidor (segurança contra injeção de fórmulas e vazamento de regras de negócio), aproveitando as validações de byte-size (cap de 5 MB/25 MB), detecção de magic bytes e proteção anti-ZIP-bomb já existentes. O resultado do parsing é mapeado para um `TableSpecPayload` e limitado a no máximo 200 linhas e 26 colunas (limites de DoS).

---

## Architectural Responsibility Map

| Component | Responsibility | Tier | Rationale |
|-----------|----------------|------|-----------|
| `WorkspaceStateProvider` | Gerenciamento de estado global da planilha ativa (colunas, linhas, título) e histórico de undo/redo | Client/React Context | Permite que o chat e a grade leiam, alterem e resetem o estado da planilha e do histórico unificados |
| `POST /api/workspace/import` | Rota para upload e parsing de arquivos CSV/XLSX | Server (API Route) | Centraliza o parse de arquivos no servidor para aplicar validações e evitar vazamento de memória ou DoS no cliente |
| `TableGridPanel` | Renderização da grade e toolbar | Browser/Client | Consome o estado do `WorkspaceStateContext` em vez de gerenciar estado local |
| `UnifiedChatTool` | Chat de IA lateral | Browser/Client | Conseguirá ler o estado atual da planilha para enviar como contexto ao LLM na Fase 20 |

---

## Standard Stack & Packages

Nenhum pacote novo é necessário. O projeto já utiliza:
- `xlsx` (v0.18.x) para leitura de XLSX.
- `csv-parse` para parsing de CSV.
- `react-datasheet-grid` para renderização da grade.

---

## Inventário de Arquivos e Mudanças

### 1. Criação do Provedor de Estado (`WorkspaceStateContext`)
* **Arquivo:** `apps/web/src/components/app/workspace-state-context.tsx` (Novo)
* **Objetivo:** Exportar o `WorkspaceStateProvider` que encapsula o estado com o seguinte formato de histórico:
  ```typescript
  type GridState = { rows: RowData[]; columns: TableColumn[]; title: string };
  ```
  E fornecer funções de manipulação: `setSpec()`, `updateRows()`, `resetToBlank()`, `resetToSeed()`, `undo()`, `redo()`.
  
### 2. Integração no Layout
* **Arquivo:** `apps/web/src/app/(workspace)/workspace/layout.tsx`
* **Objetivo:** Envolver a estrutura principal no `WorkspaceStateProvider`.
  ```typescript
  <WorkspaceShell>
    <WorkspaceStateProvider>
      <div className="workspace-page">
        ...
      </div>
    </WorkspaceStateProvider>
  </WorkspaceShell>
  ```

### 3. Criação da Rota de Importação
* **Arquivo:** `apps/web/src/app/api/workspace/import/route.ts` (Novo)
* **Objetivo:** 
  - Aceitar `multipart/form-data` com um arquivo.
  - Chamar `extractContent` do dispatcher para validação de bytes e segurança.
  - Parsear o arquivo usando os utilitários de `file-parser.ts` adaptados ou estendidos para extrair até 200 linhas e 26 colunas.
  - Mapear os tipos detectados:
    - `"numero"` -> `"number"`
    - `"data"` -> `"date"`
    - Outros -> `"text"`
  - Retornar um `TableSpecPayload` no formato JSON.

### 4. Refatoração do Grid Panel
* **Arquivo:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx`
* **Objetivo:**
  - Substituir o hook local `useReducer(historyReducer)` pelo consumo do `WorkspaceStateContext`.
  - Adicionar na barra de ferramentas:
    - Botão **"Nova Planilha"** / **"Limpar Planilha"** que redefine a grade com colunas vazias padrão.
    - Botão **"Carregar Exemplo"** que redefine para o `SAMPLE_SPEC`.
    - Input oculto de arquivo e botão **"Importar Planilha"** que realiza requisição fetch POST multipart para `/api/workspace/import` e carrega o retorno.

---

## Questões de Design e Escolhas de Produto

1. **Estrutura Padrão da Planilha em Branco:**
   - **Formato:** Título "Planilha sem título", 3 colunas padrão (ex.: "Coluna A", "Coluna B", "Coluna C" com tipo `"text"`) e 10 linhas vazias.
2. **Nome de Arquivo como Título:**
   - O título da planilha importada será derivado do nome do arquivo limpo (ex.: `faturamento-mensal.csv` vira o título "Faturamento Mensal").
3. **Erros de Importação:**
   - Qualquer falha na rota de importação (ex.: arquivo corrompido, arquivo muito grande, zip-bomb, ou formato inválido) deve retornar um JSON com a mensagem de erro formatada em português para ser exibida em um alert/toast no frontend.
