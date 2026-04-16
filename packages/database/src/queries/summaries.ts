import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface SummaryRow {
  id: string;
  entity_type: string;
  entity_id: string;
  summary_type: string;
  content: string;
  version: number;
  source_meeting_ids: string[];
  structured_content: Record<string, unknown> | null;
  created_at: string;
}

export async function getLatestSummary(
  entityType: "project" | "organization" | "company",
  entityId: string,
  summaryType: "context" | "briefing" | "weekly" | "management_insights",
  client?: SupabaseClient,
): Promise<SummaryRow | null> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("summaries")
    .select(
      "id, entity_type, entity_id, summary_type, content, version, source_meeting_ids, structured_content, created_at",
    )
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("summary_type", summaryType)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no rows
    console.error("[getLatestSummary]", error.message);
    return null;
  }

  return data as SummaryRow;
}

export async function getSummaryHistory(
  entityType: "project" | "organization" | "company",
  entityId: string,
  summaryType: "context" | "briefing" | "weekly" | "management_insights",
  client?: SupabaseClient,
): Promise<SummaryRow[]> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("summaries")
    .select(
      "id, entity_type, entity_id, summary_type, content, version, source_meeting_ids, structured_content, created_at",
    )
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("summary_type", summaryType)
    .order("version", { ascending: false });

  if (error) {
    console.error("[getSummaryHistory]", error.message);
    return [];
  }

  return (data ?? []) as SummaryRow[];
}
