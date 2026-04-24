import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Default is node for action/query tests. Component tests that need a DOM
    // opt in with `// @vitest-environment jsdom` at the top of the file.
    environment: "node",
    include: ["__tests__/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    setupFiles: ["./__tests__/helpers/setup.ts"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "**/__tests__/**", "src/types/**"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
