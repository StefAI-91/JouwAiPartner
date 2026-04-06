import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/database/vitest.config.ts",
  "packages/ai/vitest.config.ts",
  "packages/mcp/vitest.config.ts",
  "apps/cockpit/vitest.config.ts",
]);
