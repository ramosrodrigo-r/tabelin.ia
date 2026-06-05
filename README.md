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
![Versão](https://img.shields.io/badge/versão-v1.2-success)
![Licença](https://img.shields.io/badge/licença-Privada-lightgrey)

> Workspace de IA para planilhas, **pensado para o Brasil**: fórmulas, automação, SQL, regex e análise de arquivos/tabelas a partir de linguagem natural em português.

Tabelin.IA é um SaaS brasileiro de produtividade em planilhas e dados. Analistas de finanças, marketing, RH, contabilidade, BI e administração descrevem o que precisam **em português** e recebem fórmulas localizadas, scripts de automação, queries SQL, padrões regex e análises estruturadas — prontos para copiar e colar nas ferramentas que realmente usam.

A inspiração funcional vem de ferramentas como o GPTExcel, mas a proposta é **Brazil-first**: prompts em português, sintaxe do Excel brasileiro com separador `;`, exemplos com CPF/CNPJ/CEP e checkout com Pix.

---

## ✨ Funcionalidades

| Tool | O que faz |
|------|-----------|
| **Fórmulas** | Gera e explica fórmulas para Excel, Google Sheets, Airtable e LibreOffice Calc. Idioma explícito: PT-BR com `;` ou EN com `,`. |
| **Scripts** | Geração de VBA, Google Apps Script e Airtable Scripts. |
| **SQL** | Queries para PostgreSQL, MySQL, SQL Server, Oracle e BigQuery. |
| **Regex** | Padrões regex com exemplos de dados brasileiros (CPF, CNPJ, CEP). |
| **Análise de Arquivos** | Upload de CSV/XLSX (≤ 5 MB) com detecção de schema, chat sobre os dados, tabelas dinâmicas e relatórios executivos. |
| **OCR de Tabelas** | Upload de imagem (PNG/JPEG) de tabela → reconstrução de linhas/colunas → TSV/CSV pronto para copiar. |
| **Gráficos** | "Sugerir Gráfico" → BarChart / LineChart / PieChart com toggle de tipo. |
| **Anexos Universais** (Pro) | Anexe CSV/XLSX, PNG/JPEG, PDF ou TXT em qualquer um dos 5 tools de texto via paperclip ou drag-and-drop. O conteúdo extraído fundamenta a resposta da IA (_grounding_). |

Recursos transversais:

- 🔐 **Autenticação** completa (cadastro, login, logout, reset de senha) com [Better Auth](https://www.better-auth.com/).
- 💬 **Histórico de conversas** persistido por usuário + tool (cap de 50 trocas), com contexto multi-turno e controle "Nova conversa".
- 🧮 **Cota free-tier** (4 usos por janela de 12h) com padrão reserve/confirm/release, e plano **Pro** via Mercado Pago Checkout Pro (Pix + cartão).
- 🛡️ **Privacidade (LGPD)**: arquivos enviados são efêmeros e nunca persistidos — só o texto extraído é guardado. Validação de magic bytes + proteção anti-ZIP-bomb na extração.
- ⚡ **Streaming** de respostas começando em até ~2,5 s para fórmulas simples.

---

## 🧱 Stack

- **Frontend / Backend:** [Next.js 16](https://nextjs.org/) (App Router, React 19) + [Tailwind CSS 4](https://tailwindcss.com/)
- **Banco de dados:** PostgreSQL 18 + [Prisma 7](https://www.prisma.io/) (adapter `@prisma/adapter-pg`)
- **Autenticação:** Better Auth
- **IA:** [OpenAI](https://platform.openai.com/) (Chat + Vision para OCR) — com _fixture fallback_ quando `OPENAI_API_KEY` está ausente
- **Pagamentos:** [Mercado Pago](https://www.mercadopago.com.br/) Checkout Pro
- **Parsing de arquivos:** `csv-parse`, `xlsx`, `unpdf` (PDF), `file-type`/`fflate` (validação de bytes)
- **UI auxiliar:** `recharts` (gráficos), `shiki`/`react-shiki` (syntax highlight), `lucide-react` (ícones)
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
│           ├── (workspace)/    # workspace dos tools
│           ├── (billing)/      # checkout / plano Pro
│           └── api/            # tools, conversations, billing, auth
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

> **Reset de senha em dev:** com `EMAIL_SERVER=console`, os links de redefinição de senha são impressos no terminal (não há envio real de e-mail).

> **IA sem chave:** sem `OPENAI_API_KEY`, os tools de IA respondem com _fixtures_ — útil para desenvolvimento e testes sem custo de API. A chave de produção fica em `apps/web/.env.local`.

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
| `MERCADO_PAGO_ACCESS_TOKEN` | Token do Mercado Pago |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Segredo do webhook de billing |
| `PRO_MONTHLY_PRICE_BRL` / `PRO_ANNUAL_PRICE_BRL` | Preços do plano Pro |
| `NEXT_PUBLIC_PRO_SUPPORT_EMAIL` / `NEXT_PUBLIC_PRO_SUPPORT_WHATSAPP_URL` | Canais de suporte Pro |

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

## 🗺️ Status

**Versão atual:** v1.2 — _Anexos Universais_ (2026-06-05).

Todas as fases (1–11) validadas: autenticação, fórmulas, cota + billing, scripts/SQL/regex, análise de arquivos, OCR, gráficos, histórico multi-turno e anexos universais. Auditoria de milestone aprovada (25/25 requisitos).

---

## 📄 Licença

Projeto privado. Todos os direitos reservados.
