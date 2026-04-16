import { getAdminClient } from "@repo/database/supabase/admin";
import { listBoardMeetings } from "@repo/database/queries/meetings";
import { saveManagementInsights } from "@repo/database/mutations/management-insights";
import { runManagementInsightsAgent } from "../agents/management-insights";

/**
 * Generate management insights by analysing all board meetings.
 * Requires at least 3 verified board meetings to detect patterns.
 */
export async function generateManagementInsights(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const db = getAdminClient();

    console.warn("[generateManagementInsights] Fetching board meetings...");
    const { data: meetings } = await listBoardMeetings(db, { limit: 50 });

    if (meetings.length < 3) {
      console.warn(
        `[generateManagementInsights] Only ${meetings.length} board meetings — need at least 3`,
      );
      return {
        success: false,
        error: `Minimaal 3 board-meetings nodig, nu ${meetings.length}.`,
      };
    }

    console.warn(
      `[generateManagementInsights] Analysing ${meetings.length} meetings, calling AI...`,
    );

    const agentInput = meetings.map((m) => ({
      title: m.title,
      date: m.date,
      summary: m.summary,
      participants: m.participants.map((p) => p.name),
    }));

    const output = await runManagementInsightsAgent(agentInput);

    console.warn(
      `[generateManagementInsights] Done — ${output.mogelijke_opvolging.length} opvolging, ` +
        `${output.klant_pipeline.length} pipeline, ${output.terugkerende_themas.length} themas`,
    );

    const result = await saveManagementInsights(output as Record<string, unknown>, db);

    if ("error" in result) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generateManagementInsights] Error:", message);
    return { success: false, error: message };
  }
}
