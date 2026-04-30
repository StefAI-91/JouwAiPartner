import { defineConfig, devices } from "@playwright/test";

const STAGING_HOST_URL =
  process.env.JAIP_WIDGET_TEST_HOST_URL ??
  "https://widget-staging.jouw-ai-partner.nl/test-host.html";

/**
 * Widget e2e config (WG-003). Draait tegen een gedeployed staging-host
 * (geen mocks) zodat de hele pipeline loader → widget.js → ingest API →
 * DevHub-DB end-to-end gevalideerd wordt. Test-pattern in WG-001 zorgt
 * dat resulterende issues label `'test'` krijgen — niet productie-data.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: STAGING_HOST_URL,
    trace: "on-first-retry",
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
