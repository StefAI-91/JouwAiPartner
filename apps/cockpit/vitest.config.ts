import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts", "src/**/*.test.ts"],
    // passWithNoTests: we hebben nog geen cockpit-tests, maar we willen dat
    // `turbo test` niet faalt. Zodra hier echte tests komen (zie backlog)
    // mag deze regel eruit.
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
