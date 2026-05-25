---
status: testing
phase: 01-localized-formula-workspace
source:
  - .planning/phases/01-localized-formula-workspace/01-01-SUMMARY.md
  - .planning/phases/01-localized-formula-workspace/01-02-SUMMARY.md
  - .planning/phases/01-localized-formula-workspace/01-03-SUMMARY.md
started: 2026-05-25T00:00:00Z
updated: 2026-05-25T00:00:00Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Encerre qualquer servidor em execução. Limpe estado efêmero (bancos temporários, caches, lock files).
  Inicie a aplicação do zero com `corepack pnpm --filter web dev`.
  O servidor deve subir sem erros, e a página inicial (ou /sign-in) deve carregar com dados reais.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: |
  Encerre qualquer servidor em execução. Limpe estado efêmero (bancos temporários, caches, lock files).
  Inicie a aplicação do zero com `corepack pnpm --filter web dev`.
  O servidor deve subir sem erros, e a página inicial (ou /sign-in) deve carregar com dados reais.
result: [pending]

### 2. Criar conta (Sign-up)
expected: |
  Acesse /sign-up. Preencha nome, e-mail e senha (mínimo 8 caracteres). Clique em criar conta.
  A conta deve ser criada, a sessão deve ser iniciada com cookie httpOnly, e você deve ser
  redirecionado para /workspace.
result: [pending]

### 3. Fazer login (Sign-in)
expected: |
  Acesse /sign-in. Informe e-mail e senha de uma conta já criada. Clique em entrar.
  A sessão deve ser estabelecida e você deve ser redirecionado para /workspace.
result: [pending]

### 4. Workspace protegido (acesso sem sessão)
expected: |
  Sem estar autenticado (ou após limpar cookies), acesse /workspace diretamente.
  Deve ser redirecionado para a página de sign-in, sem expor conteúdo do workspace.
result: [pending]

### 5. Sair da conta (Sign-out)
expected: |
  Dentro do workspace, clique no botão de sair (topbar ou sidebar).
  A sessão deve ser encerrada, o cookie removido, e você redirecionado para /sign-in.
  Tentar voltar para /workspace deve redirecionar para /sign-in novamente.
result: [pending]

### 6. Solicitar recuperação de senha
expected: |
  Acesse /sign-in e clique em "esqueci a senha" (ou acesse /forgot-password).
  Informe um e-mail cadastrado e envie. A resposta deve ser genérica (não revela se o
  e-mail existe). Nenhum conteúdo sensível deve aparecer na tela.
result: [pending]

### 7. Shell do workspace autenticado
expected: |
  Após login, a sidebar deve mostrar a ferramenta "Fórmula" como ativa e selecionada.
  Outras ferramentas futuras devem aparecer visíveis mas desabilitadas (não clicáveis).
  O topbar deve exibir a identidade do produto.
result: [pending]

### 8. Gerar fórmula com streaming
expected: |
  No workspace, selecione uma plataforma (ex: Excel) e um idioma de fórmula (PT ou EN).
  Digite um prompt descrevendo o que a fórmula deve fazer. Clique em Gerar.
  O output deve começar a aparecer em tempo real (streaming), exibindo o rascunho enquanto
  recebe dados. Ao concluir, o resultado final validado é exibido.
result: [pending]

### 9. Explicar fórmula com streaming
expected: |
  Mude para o modo "Explicar". Cole uma fórmula existente no campo de entrada.
  Clique em Explicar. Deve aparecer uma explicação em streaming com os passos da fórmula.
  O resultado final validado deve ser exibido ao término.
result: [pending]

### 10. Botão de cópia (habilitado após conclusão)
expected: |
  Durante o streaming, o botão de copiar deve estar desabilitado.
  Após a chegada do evento de conclusão (complete), o botão deve ficar ativo.
  Ao clicar, o conteúdo final é copiado para a área de transferência e o botão
  exibe o ícone/texto "Copiado" brevemente antes de voltar ao estado normal.
result: [pending]

### 11. Pressupostos e avisos no output
expected: |
  Gere uma fórmula que retorne pressupostos ou avisos (ex: fórmula que depende
  de estrutura da planilha). O output deve exibir uma seção de "Pressupostos"
  e/ou "Avisos" abaixo ou ao lado do resultado principal.
result: [pending]

### 12. Tratamento de erros com retry
expected: |
  Simule um erro (ex: interrompa o servidor durante uma geração, ou use uma chave
  OpenAI inválida em ambiente real). A tela deve exibir uma mensagem genérica de erro
  sem expor detalhes internos. O input preenchido deve ser preservado e deve haver
  opção visível de tentar novamente.
result: [pending]

## Summary

total: 12
passed: 0
issues: 0
pending: 12
skipped: 0

## Gaps

[none yet]
