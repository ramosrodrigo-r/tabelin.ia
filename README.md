# Tabelin.IA

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white)
![Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/E2E-Playwright-2EAD33?logo=playwright&logoColor=white)
![Versão](https://img.shields.io/badge/versão-v3.0-success)
![Licença](https://img.shields.io/badge/licença-Privada-lightgrey)

> Workspace de IA para planilhas, **pensado para o Brasil**: planilha interativa viva combinada com um assistente de IA conversacional em português.

Tabelin.IA é um SaaS brasileiro de produtividade em planilhas e dados. Analistas de finanças, marketing, RH, contabilidade, BI e administração descrevem o que precisam **em português** e o assistente de IA opera a planilha diretamente ou responde dúvidas sobre as tabelas.

A proposta é **Brazil-first**: prompts em português, sintaxe do Excel brasileiro com separador `;`, exemplos com dados brasileiros e interface otimizada para o fluxo de trabalho local.

---

## ✨ Funcionalidades

- 📊 **Planilha Viva (Live Grid)**: Grade de planilha interativa baseada em [react-datasheet-grid](https://github.com/selbekk/react-datasheet-grid), com suporte a fórmulas dinâmicas locais calculadas via [@formulajs/formulajs](https://github.com/formulajs/formulajs).
- 💬 **Assistente de IA Integrado (Unified Chat)**: Chat de IA unificado que processa as solicitações do usuário:
  - **Operações na Grade**: A IA edita dados, adiciona colunas, aplica fórmulas traduzidas ou estrutura tabelas do zero a partir do prompt do usuário.
  - **Q&A Conversacional**: O usuário pode fazer perguntas diretas sobre os dados na tabela atual.
- 📎 **Anexos Universais (Grounding)**: Arraste ou anexe arquivos (CSV/XLSX, PDF, imagens de tabelas ou TXT). O texto e dados são extraídos no servidor e servem como contexto de grounding para fundamentar as respostas do modelo.
- 💾 **Persistência de Sessão**: O estado atual da grade de planilha e o histórico unificado de conversa (com limite de 50 mensagens) são persistidos no banco de dados automaticamente por usuário, garantindo uma inicialização instantânea e sem flash de tela.
- 📤 **Exportação Sanitizada**: Exportação rápida da planilha atual para formatos CSV ou XLSX, mantendo as fórmulas calculadas resolvidas e prevenindo injeções maliciosas.
- 🔐 **Autenticação Segura**: Fluxo completo de cadastro, login, logout e redefinição de senha com [Better Auth](https://www.better-auth.com/).
- 🛡️ **Privacidade**: Validação estrita de magic bytes e proteção anti-ZIP-bomb. Os arquivos enviados são temporários e mantidos estritamente em memória durante a extração de dados.

---

## 🧱 Stack

- **Frontend / Backend:** [Next.js 16](https://nextjs.org/) (App Router, React 19) + [Tailwind CSS 4](https://tailwindcss.com/)
- **Banco de dados:** PostgreSQL 18 + [Prisma 7](https://www.prisma.io/) (adapter `@prisma/adapter-pg`)
- **Autenticação:** Better Auth
- **IA:** [OpenAI](https://platform.openai.com/) — com _fixture fallback_ quando `OPENAI_API_KEY` está ausente
- **Parsing de arquivos:** `csv-parse`, `xlsx`, `unpdf` (PDF), `file-type`/`fflate` (validação de bytes)
- **UI auxiliar:** `shiki`/`react-shiki` (syntax highlight), `lucide-react` (ícones)
- **Testes:** [Vitest](https://vitest.dev/) (unit) + [Playwright](https://playwright.dev/) (E2E)
- **Monorepo:** pnpm workspaces (`apps/web` + `packages/shared`)

---

## 📦 Estrutura do repositório

```
tabelin.ia/
├── apps/
│   └── web/              # Aplicação Next.js (frontend + API routes)
│       └── src/app/
│           ├── (auth)/         # sign-in, sign-up, reset-password
│           ├── (workspace)/    # tela única do workspace
│           └── api/            # chat unificado, histórico, auth, workspace state
├── packages/
│   └── shared/          # código compartilhado (@tabelin/shared)
├── prisma/              # schema.prisma + migrations
├── docker-compose.yml   # PostgreSQL local
└── pnpm-workspace.yaml
```

---

## 🚀 Como rodar localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20+ com [Corepack](https://github.com/nodejs/corepack) habilitado
- [pnpm](https://pnpm.io/) 11+ (o projeto usa pnpm — **não** npm)
- [Docker](https://www.docker.com/) (para o PostgreSQL local)

### Passos

```bash
# 1. Habilita o pnpm via corepack
corepack enable

# 2. Instala as dependências do monorepo
pnpm install

# 3. Sobe o PostgreSQL
docker compose up -d postgres

# 4. Configura as variáveis de ambiente
cp .env.example .env.local

# 5. Gera o Prisma Client e aplica as migrations
pnpm prisma:generate
pnpm exec prisma migrate deploy

# 6. Inicia o servidor de desenvolvimento
pnpm --filter web dev
```

Acesse **http://localhost:3000**.

> **Porta do banco:** o `docker-compose.yml` expõe o Postgres em `localhost:5433` — a `DATABASE_URL` do `.env.example` já aponta para essa porta.
> **IA sem chave:** sem `OPENAI_API_KEY`, o assistente de IA responde com _fixtures_ pré-definidas.

---

## ⚙️ Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | String de conexão do PostgreSQL |
| `BETTER_AUTH_SECRET` | Segredo aleatório longo para o Better Auth |
| `BETTER_AUTH_URL` | URL base da app (ex.: `http://localhost:3000`) |
| `NEXT_PUBLIC_APP_URL` | URL pública da app |
| `EMAIL_FROM` / `EMAIL_SERVER` | Remetente e adapter de e-mail (`console` em dev) |
| `OPENAI_API_KEY` | Chave da OpenAI (vazio = modo fixture) |
| `OPENAI_MODEL` | Modelo usado (ex.: `gpt-5-mini`) |
| `NEXT_PUBLIC_PRO_SUPPORT_EMAIL` / `NEXT_PUBLIC_PRO_SUPPORT_WHATSAPP_URL` | Canais de suporte ao usuário |

Veja [`.env.example`](.env.example) para a lista completa.

---

## ✅ Verificações (typecheck, lint, testes, build)

```bash
pnpm --filter web typecheck   # checagem de tipos (tsc --noEmit)
pnpm --filter web lint        # ESLint (--max-warnings=0)
pnpm --filter web test        # testes unitários (Vitest)
pnpm --filter web build       # build de produção (next build)
```

Para rodar em todos os pacotes do monorepo: `pnpm -r build`, `pnpm -r lint`, `pnpm -r test`, `pnpm -r typecheck`.

---

## 📄 Licença

Projeto privado. Todos os direitos reservados.
