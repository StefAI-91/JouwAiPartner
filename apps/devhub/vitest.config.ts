import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts", "src/**/*.test.ts"],
    // passWithNoTests: er zijn nog geen devhub-specifieke tests. Deze vlag
    // zorgt dat `turbo test` niet rood wordt op een lege suite.
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
