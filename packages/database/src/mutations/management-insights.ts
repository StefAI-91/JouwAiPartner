import type { SupabaseClient } from "@supabase/supabase-js";
import { createSummaryVersion } from "./summaries";
import { MANAGEMENT_INSIGHTS_ENTITY_ID } from "../constants/summaries";

export async function saveManagementInsights(
  structuredContent: Record<string, unknown>,
  client?: SupabaseClient,
) {
  const sections = structuredContent as {
    mogelijke_opvolging?: { onderwerp: string }[];
    klant_pipeline?: { naam: string }[];
    terugkerende_themas?: { thema: string }[];
  };

  const parts: string[] = [];
  if (sections.mogelijke_opvolging?.length) {
    parts.push(`${sections.mogelijke_opvolging.length} mogelijke opvolgpunten`);
  }
  if (sections.klant_pipeline?.length) {
    parts.push(`${sections.klant_pipeline.length} klanten in pipeline`);
  }
  if (sections.terugkerende_themas?.length) {
    parts.push(`${sections.terugkerende_themas.length} terugkerende thema's`);
  }
  const textContent = parts.length > 0 ? parts.join(", ") : "Geen inzichten gegenereerd.";

  return createSummaryVersion(
    "company",
    MANAGEMENT_INSIGHTS_ENTITY_ID,
    "management_insights",
    textContent,
    [],
    client,
    structuredContent,
  );
}

export async function dismissInsight(
  client: SupabaseClient,
  userId: string,
  insightKey: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await client
    .from("dismissed_insights")
    .upsert({ user_id: userId, insight_key: insightKey }, { onConflict: "user_id,insight_key" });

  if (error) {
    console.error("[dismissInsight]", error.message);
    return { error: error.message };
  }

  return { success: true };
}
