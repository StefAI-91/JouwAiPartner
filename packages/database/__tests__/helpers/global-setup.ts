import { getTestClient } from "./test-client";

/**
 * Vitest globalSetup: verifies the test database is reachable before running tests.
 * Only runs once before the entire test suite.
 *
 * Usage in vitest.config.ts:
 *   globalSetup: ["./__tests__/helpers/global-setup.ts"]
 */
export async function setup() {
  try {
    const supabase = getTestClient();
    const { error } = await supabase.from("meetings").select("id").limit(1);

    if (error) {
      console.error("\n❌ Database connection failed:", error.message);
      console.error(
        "Make sure Supabase is running locally: npx supabase start\n",
      );
      process.exit(1);
    }

    console.log("✅ Test database connection verified");
  } catch (err) {
    console.error(
      "\n❌ Could not connect to test database.\n" +
        "Make sure Supabase is running: npx supabase start\n" +
        "And env vars are set: TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY\n",
    );
    console.error(err);
    process.exit(1);
  }
}
