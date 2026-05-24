# Tabelin.IA

Brazil-first spreadsheet AI workspace for formulas, automation, SQL, regex, and file/table analysis.

## Local Development

```bash
corepack enable
corepack pnpm install
docker compose up -d postgres
cp .env.example .env.local
corepack pnpm prisma:generate
corepack pnpm --filter web dev
```

Open `http://localhost:3000`.

## Checks

```bash
corepack pnpm --filter web typecheck
corepack pnpm --filter web lint
corepack pnpm --filter web test
corepack pnpm --filter web build
```

Password reset links are printed through the local development adapter when `EMAIL_SERVER=console`.

