import path from "node:path";

import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

// Este monorepo mantém os arquivos .env*/.env.local na raiz do repositório,
// mas o Next.js (executado a partir de apps/web) só carrega .env* do seu
// próprio cwd automaticamente. Carregamos explicitamente os arquivos da raiz
// aqui para que BETTER_AUTH_SECRET, BETTER_AUTH_URL, DATABASE_URL etc.
// cheguem ao process.env do processo do Next. Carregado em ordem de
// precedência crescente: .env primeiro, .env.local por último (sobrescreve).
const monorepoRoot = path.resolve(__dirname, "../..");
loadEnv({ path: path.join(monorepoRoot, ".env"), override: false });
loadEnv({ path: path.join(monorepoRoot, ".env.local"), override: true });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/workspace/sql", destination: "/workspace", permanent: true },
      { source: "/workspace/regex", destination: "/workspace", permanent: true },
      { source: "/workspace/scripts", destination: "/workspace", permanent: true },
      { source: "/workspace/templates", destination: "/workspace", permanent: true },
      { source: "/workspace/file-analysis", destination: "/workspace", permanent: true },
      { source: "/workspace/ocr", destination: "/workspace", permanent: true }
    ];
  }
};

export default nextConfig;
