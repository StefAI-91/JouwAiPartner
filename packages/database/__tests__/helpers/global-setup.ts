/**
 * Vitest globalSetup: verifies the test database is reachable before running tests.
 * Only runs once before the entire test suite.
 *
 * If credentials are missing, logs a warning but does NOT exit — integration
 * tests will be skipped via describeWithDb().
 */
export async function setup() {
  const url = process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.log(
      "⚠️  Supabase credentials not found — integration tests will be skipped.\n" +
        "   Set TEST_SUPABASE_URL + TEST_SUPABASE_SERVICE_ROLE_KEY to enable them.",
    );
    return;
  }

  try {
    const { getTestClient } = await import("./test-client");
    const supabase = getTestClient();
    const { error } = await supabase.from("meetings").select("id").limit(1);

    if (error) {
      console.error("\n❌ Database connection failed:", error.message);
      console.error("Make sure Supabase is running locally: npx supabase start\n");
      process.exit(1);
    }

    console.log("✅ Test database connection verified");
  } catch (err) {
    console.error(
      "\n❌ Could not connect to test database.\n" +
        "Make sure Supabase is running: npx supabase start\n",
    );
    console.error(err);
    process.exit(1);
  }
}
