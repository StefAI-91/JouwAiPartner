import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";
import { slugify } from "../lib/slugify";

export interface InsertThemeInput {
  slug: string;
  name: string;
  emoji: string;
  description: string;
  matching_guide: string;
  status?: "emerging" | "verified";
  created_by_agent?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
}

export interface UpdateThemeInput {
  name?: string;
  emoji?: string;
  description?: string;
  matching_guide?: string;
  status?: "emerging" | "verified" | "archived";
  verified_at?: string | null;
  verified_by?: string | null;
}

/**
 * Insert a new theme (seed of emerging). Verified themes krijgen verified_at
 * van de caller; emerging themes laten verified_at NULL tot review.
 */
export async function insertTheme(
  input: InsertThemeInput,
  client?: SupabaseClient,
): Promise<{ success: true; id: string } | { error: string }> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("themes")
    .insert({
      slug: input.slug,
      name: input.name,
      emoji: input.emoji,
      description: input.description,
      matching_guide: input.matching_guide,
      status: input.status ?? "emerging",
      created_by_agent: input.created_by_agent ?? null,
      verified_at: input.verified_at ?? null,
      verified_by: input.verified_by ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, id: data.id };
}

/**
 * Update theme metadata. Voor detail-page edit (TH-005) + review approve
 * (TH-006). `updated_at` wordt door de trigger gezet.
 */
export async function updateTheme(
  themeId: string,
  updates: UpdateThemeInput,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.emoji !== undefined) payload.emoji = updates.emoji;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.matching_guide !== undefined) payload.matching_guide = updates.matching_guide;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.verified_at !== undefined) payload.verified_at = updates.verified_at;
  if (updates.verified_by !== undefined) payload.verified_by = updates.verified_by;

  if (Object.keys(payload).length === 0) {
    return { success: true };
  }

  const { error } = await db.from("themes").update(payload).eq("id", themeId);
  if (error) return { error: error.message };
  return { success: true };
}

export interface EmergingThemeProposal {
  name: string;
  description: string;
  matching_guide: string;
  emoji: string;
  created_by_agent?: string;
}

/**
 * Maak een nieuw `emerging` thema aan. De slug wordt afgeleid van `name`
 * (kebab-case); bij UNIQUE-collision geeft PG een duidelijke fout terug die
 * de caller logt. Niet silent renamen — emerging themes horen menselijk
 * beoordeeld te worden in de review-flow (TH-006).
 *
 * TH-008: verhuisd vanuit `mutations/meeting-themes.ts` — deze mutation
 * raakt alleen de `themes` tabel, hoort dus hier thuis (SRP).
 */
export async function createEmergingTheme(
  proposal: EmergingThemeProposal,
  client?: SupabaseClient,
): Promise<{ success: true; id: string; slug: string } | { error: string }> {
  const db = client ?? getAdminClient();
  const slug = slugify(proposal.name);

  const { data, error } = await db
    .from("themes")
    .insert({
      slug,
      name: proposal.name,
      description: proposal.description,
      matching_guide: proposal.matching_guide,
      emoji: proposal.emoji,
      status: "emerging",
      created_by_agent: proposal.created_by_agent ?? "theme_tagger",
    })
    .select("id, slug")
    .single();

  if (error) return { error: error.message };
  return { success: true, id: data.id, slug: data.slug };
}

/**
 * Soft-archive: status='archived' + archived_at=now. Bewaart matches en
 * history. Wordt niet meer door ThemeTagger gekozen.
 */
export async function archiveTheme(
  themeId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db
    .from("themes")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
    })
    .eq("id", themeId);

  if (error) return { error: error.message };
  return { success: true };
}
