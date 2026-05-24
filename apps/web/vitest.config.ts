import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    css: true
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@tabelin/shared": new URL("../../packages/shared/src/index.ts", import.meta.url).pathname,
      "@tabelin/shared/": new URL("../../packages/shared/src/", import.meta.url).pathname
    }
  }
});

