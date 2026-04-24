import type { SupabaseClient } from "@supabase/supabase-js";
import { getLatestSummary, type SummaryRow } from "./core";
import { MANAGEMENT_INSIGHTS_ENTITY_ID } from "../../constants/summaries";

export async function getManagementInsights(client?: SupabaseClient): Promise<SummaryRow | null> {
  return getLatestSummary("company", MANAGEMENT_INSIGHTS_ENTITY_ID, "management_insights", client);
}

export async function getDismissedInsightKeys(
  client: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("dismissed_insights")
    .select("insight_key")
    .eq("user_id", userId);

  if (error) {
    console.error("[getDismissedInsightKeys]", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.insight_key);
}
