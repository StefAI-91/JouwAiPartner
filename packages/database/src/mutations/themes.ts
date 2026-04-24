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

  // TH-009: strip undefined-velden uit `updates`. Elk `UpdateThemeInput`-veld is
  // optional, dus deze filter houdt de DB-update minimal (en voorkomt dat null
  // per ongeluk opnames overschrijft).
  const payload = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined),
  );

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
  /**
   * TH-011 (DATA-232) — meeting waarin de agent het thema voorstelde. Null
   * toegestaan voor callers die geen meeting-context hebben (bv. latere
   * bulk-import flows).
   */
  origin_meeting_id?: string | null;
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
      created_by_agent: proposal.created_by_agent ?? "theme_detector",
      origin_meeting_id: proposal.origin_meeting_id ?? null,
    })
    .select("id, slug")
    .single();

  if (error) return { error: error.message };
  return { success: true, id: data.id, slug: data.slug };
}

/**
 * TH-010 — Admin-create een nieuw `verified` thema in één stap. Overslaat
 * de emerging → review-flow; bedoeld voor de curator-pad via `/dev/tagger`
 * waar een admin handmatig een thema seed't. `verified_at` + `verified_by`
 * worden gezet zodat pills/donut direct meetellen.
 *
 * Slug wordt deterministisch afgeleid via `slugify(name)`; UNIQUE-collision
 * geeft een duidelijke PG-error door naar de caller (geen silent rename —
 * dubbele namen horen expliciet fout te geven zodat admins bewust kiezen).
 */
export async function createVerifiedTheme(
  input: {
    name: string;
    description: string;
    matching_guide: string;
    emoji: string;
    verifiedBy: string;
  },
  client?: SupabaseClient,
): Promise<{ success: true; id: string; slug: string } | { error: string }> {
  const db = client ?? getAdminClient();
  const slug = slugify(input.name);

  const { data, error } = await db
    .from("themes")
    .insert({
      slug,
      name: input.name,
      description: input.description,
      matching_guide: input.matching_guide,
      emoji: input.emoji,
      status: "verified",
      verified_at: new Date().toISOString(),
      verified_by: input.verifiedBy,
    })
    .select("id, slug")
    .single();

  if (error) return { error: error.message };
  return { success: true, id: data.id, slug: data.slug };
}

/**
 * TH-014 (FUNC-303) — upsert van de per-thema narrative (cross-meeting
 * synthese). Een rij per thema (1-op-1 op themes.id). Schrijft zowel bij
 * echte agent-output als bij de insufficient-sentinel (guardrail <2 meetings).
 *
 * `generated_at` wordt bij élke schrijf-actie bijgewerkt — dit IS het moment
 * waarop de synthese gemaakt is, niet alleen de laatste modificatie.
 * `updated_at` wordt door de trigger bijgewerkt; we laten hem uit de payload.
 */
export interface UpsertThemeNarrativeInput {
  theme_id: string;
  briefing: string;
  patterns?: string | null;
  alignment?: string | null;
  friction?: string | null;
  open_points?: string | null;
  blind_spots?: string | null;
  signal_strength: "sterk" | "matig" | "zwak" | "onvoldoende";
  signal_notes?: string | null;
  meetings_count_at_generation: number;
}

export async function upsertThemeNarrative(
  input: UpsertThemeNarrativeInput,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();

  const { error } = await db.from("theme_narratives").upsert(
    {
      theme_id: input.theme_id,
      briefing: input.briefing,
      patterns: input.patterns ?? null,
      alignment: input.alignment ?? null,
      friction: input.friction ?? null,
      open_points: input.open_points ?? null,
      blind_spots: input.blind_spots ?? null,
      signal_strength: input.signal_strength,
      signal_notes: input.signal_notes ?? null,
      meetings_count_at_generation: input.meetings_count_at_generation,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "theme_id" },
  );

  if (error) return { error: error.message };
  return { success: true };
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
