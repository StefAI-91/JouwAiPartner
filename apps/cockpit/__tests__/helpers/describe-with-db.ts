import { describe } from "vitest";

/**
 * Returns `describe` if a test database URL is available, otherwise `describe.skip`.
 * Logs a clear warning when skipping so it's visible in CI output.
 */
export function describeWithDb(label: string) {
  const supabaseUrl = process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    console.warn(
      `⚠️  SKIPPING "${label}": no TEST_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL set. ` +
        "Run `npx supabase start` and set env vars to enable integration tests.",
    );
    return describe.skip;
  }

  return describe;
}
