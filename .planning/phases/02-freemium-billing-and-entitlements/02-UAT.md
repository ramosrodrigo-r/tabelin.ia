---
status: complete
phase: 02-freemium-billing-and-entitlements
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md]
started: 2026-05-25T22:03:13Z
updated: 2026-05-25T23:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: |
  Pare qualquer servidor em execução. Limpe estado efêmero (caches, lock files).
  Rode `docker-compose up -d` (ou start do PostgreSQL local) e depois `pnpm exec prisma db push`.
  Em seguida inicie o servidor com `pnpm dev`.
  O servidor deve subir sem erros, a migração do Prisma deve completar, e uma
  chamada básica (home ou /workspace carregando) deve retornar dados reais.
result: pass
notes: "docker compose up -d + npx prisma db push (com DATABASE_URL explícito). Servidor subiu em 395ms sem erros. DB já em sync."

### 2. Aviso de último uso gratuito (4° uso)
expected: |
  Estando logado como usuário Free, use a ferramenta de fórmula 3 vezes
  (generate ou explain) com sucesso. Na 4ª submissão, antes do resultado aparecer,
  deve surgir uma mensagem sutil: "Este é seu último uso gratuito. Assine Pro para acesso ilimitado."
  O resultado ainda é entregue normalmente nesta 4ª vez.
result: pass

### 3. Cota gratuita bloqueada após 4 usos
expected: |
  Após 4 usos bem-sucedidos, ao tentar submeter uma 5ª fórmula (generate ou explain),
  o botão de submit deve estar desabilitado/substituído. Nenhuma chamada de AI é feita.
  A API retorna HTTP 429 internamente com `code: "quota_exceeded"`.
result: pass
notes: "Botão de submit se transforma em 'Assinar Pro'"

### 4. Estado bloqueado exibe bloco inline com CTA "Assinar Pro"
expected: |
  Quando a cota está esgotada, na área onde ficava o botão de submit deve aparecer
  um bloco inline com mensagem: "Você atingiu o limite de 4 usos gratuitos..."
  e um botão "Assinar Pro" visível. O botão de submit original não aparece.
result: pass
notes: "Mensagem exibida: 'Voce atingiu o limite de 4 usos gratuitos. Experimente novamente mais tarde ou assine Pro para acesso ilimitado'"

### 5. CTA "Assinar Pro" inicia checkout Mercado Pago
expected: |
  Ao clicar no botão "Assinar Pro" no estado bloqueado, o browser deve redirecionar
  para a URL de checkout do Mercado Pago (Checkout Pro). A chamada é feita com
  ciclo "monthly" por padrão. Se as credenciais MP não estiverem configuradas,
  a API deve retornar um erro claro (não um redirect vazio).
result: pass
notes: "Fix aplicado inline (b648823): adicionado else branch ao onClick — exibe 'Não foi possível iniciar o checkout. Tente novamente.' quando API retorna !ok. Falha silenciosa eliminada."

### 6. Página de retorno do billing
expected: |
  Acesse `/billing/return` (pode ser após um checkout real ou direto via URL).
  Se o usuário tiver Pro ativo (webhook já processado): exibe mensagem de sucesso.
  Se Pro ainda não ativo (webhook pendente): exibe estado "processando".
  A página nunca concede Pro apenas por query params — usa lookup de entitlement server-side.
result: pass
notes: "Exibiu: 'Processando pagamento — Seu pagamento está sendo confirmado...' com CTA 'Voltar para o workspace'. Lookup server-side correto."

### 7. Badge Pro na topbar
expected: |
  Estando logado como usuário Pro ativo, a topbar deve exibir um badge compacto
  com ícone Sparkles e texto "Pro" em cor primária.
  Usuário Free não deve ver nenhum badge na topbar.
result: pass

### 8. Menu de conta com links de suporte Pro
expected: |
  Usuário Pro: clique no email/nome na topbar deve abrir um dropdown com seção
  "Suporte Pro" contendo link de email e (se configurado) link do WhatsApp.
  Usuário Free: dropdown mostra apenas "Sair" — sem seção de suporte.
result: pass
notes: "Dropdown abre com email de suporte visível"

### 9. Usuário Pro não vê avisos de cota nem bloqueios
expected: |
  Com usuário Pro ativo, ao usar a ferramenta de fórmula múltiplas vezes (mais de 4),
  nenhum aviso de último uso e nenhum estado bloqueado deve aparecer.
  A experiência é fluida sem restrições visíveis.
result: pass

### 10. Aviso de plano cancelado (downgrade notice)
expected: |
  Se um usuário Pro teve o plano cancelado/revogado recentemente (dentro de ~5 minutos),
  ao acessar o workspace deve aparecer um aviso inline e dispensável:
  "Seu plano Pro foi cancelado. Você retornou ao plano gratuito com 4 usos a cada 12 horas."
  O usuário pode fechar o aviso clicando em "Entendi".
result: pass
notes: "Aviso exibido corretamente: 'Seu plano Pro foi cancelado. Voce retornou ao plano gratuito com 4 usos a cada 12 horas.'"

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Clicar em 'Assinar Pro' redireciona para checkout Mercado Pago (ou exibe erro claro se credenciais ausentes)"
  status: resolved
  reason: "User reported: nao acontece nada ao clicar no botão Assinar Pro"
  severity: major
  test: 5
  root_cause: "MERCADO_PAGO_ACCESS_TOKEN vazio -> API retorna 500. onClick em formula-input-panel.tsx:126 só trata response.ok, sem else — erro silenciado."
  fix: "Adicionado else branch ao onClick (commit b648823): limpa erro anterior, exibe mensagem inline 'Não foi possível iniciar o checkout. Tente novamente.' quando response.ok é false."
  artifacts:
    - path: "apps/web/src/features/formula/components/formula-input-panel.tsx"
      issue: "onClick handler linha 132 sem else branch — falha silenciosa quando API retorna !ok"
  debug_session: ""
