import { getAdminClient } from "@repo/database/supabase/admin";
import { getWeeklyProjectData } from "@repo/database/queries/weekly-summary";
import { createSummaryVersion } from "@repo/database/mutations/summaries";
import { runWeeklySummarizer } from "../agents/weekly-summarizer";

// Fixed entity_id for company-wide summaries (deterministic UUID)
const COMPANY_ENTITY_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Generate a weekly management summary.
 * Collects all project data for the given week and calls the AI agent.
 */
export async function generateWeeklySummary(
  weekStart?: string,
  weekEnd?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminClient();

    // Default to current week (Monday - Sunday)
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const start = weekStart ?? monday.toISOString().split("T")[0];
    const end = weekEnd ?? sunday.toISOString().split("T")[0];

    const weekLabel = `${start} t/m ${end}`;
    console.warn(`[generateWeeklySummary] Generating for ${weekLabel}`);

    // Collect data for all active projects
    const projectData = await getWeeklyProjectData(start, end, db);

    if (projectData.length === 0) {
      console.warn("[generateWeeklySummary] No active projects found — skipping");
      return { success: false, error: "Geen actieve projecten gevonden." };
    }

    console.warn(
      `[generateWeeklySummary] Collected data for ${projectData.length} projects, calling AI...`,
    );

    // Call the AI agent
    const output = await runWeeklySummarizer(weekLabel, projectData);

    // Build text summary from management_summary
    const textContent = output.management_summary;

    // Store structured output including all sections
    const structuredContent = {
      week_start: start,
      week_end: end,
      management_summary: output.management_summary,
      project_health: output.project_health,
      cross_project_risks: output.cross_project_risks,
      team_insights: output.team_insights,
      focus_next_week: output.focus_next_week,
    };

    // Save as company-wide weekly summary
    const result = await createSummaryVersion(
      "company",
      COMPANY_ENTITY_ID,
      "weekly",
      textContent,
      [],
      db,
      structuredContent,
    );

    if ("error" in result) {
      console.error("[generateWeeklySummary] Failed to save:", result.error);
      return { success: false, error: result.error };
    }

    console.warn(
      `[generateWeeklySummary] Saved weekly summary v${result.data.version} for ${weekLabel}`,
    );
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[generateWeeklySummary] Failed:", message);
    return { success: false, error: message };
  }
}
