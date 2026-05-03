import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./__tests__/helpers/setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    // CC-008 — `passWithNoTests: true` is verwijderd. Cockpit heeft inmiddels
    // 200+ tests; een nul-runs-state is voortaan een echt CI-signaal i.p.v.
    // een silent pass.
    // Vitest default is 5000ms. Onder `turbo test` draaien 8 workspaces
    // parallel met elk eigen workers; cold-start van de eerste test in een
    // file (dynamic import + transitieve module-resolve) kan dan 5s+ duren
    // op Windows. Bumpen voorkomt valse pre-push timeouts. Solo blijft snel.
    testTimeout: 15000,
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
