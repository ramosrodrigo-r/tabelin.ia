import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://tabelin:tabelin@localhost:5432/tabelin?schema=public"
  }
});

