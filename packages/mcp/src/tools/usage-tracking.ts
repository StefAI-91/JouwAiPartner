import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Track an MCP tool call for usage analytics.
 * Fire-and-forget: errors are silently ignored to not block the tool response.
 */
export async function trackMcpQuery(
  supabase: SupabaseClient,
  tool: string,
  query?: string,
): Promise<void> {
  try {
    await supabase.from("mcp_queries").insert({
      tool,
      query: query || null,
    });
  } catch {
    // Silently ignore tracking errors
  }
}
