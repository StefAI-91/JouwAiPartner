import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts", "src/**/*.test.ts"],
    globalSetup: ["./__tests__/helpers/global-setup.ts"],
    testTimeout: 30000,
  },
});
