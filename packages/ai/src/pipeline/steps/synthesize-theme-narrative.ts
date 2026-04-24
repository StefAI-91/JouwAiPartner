import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listThemeMeetingSummaries,
  INSUFFICIENT_MEETINGS_SENTINEL,
} from "@repo/database/queries/themes";
import { upsertThemeNarrative } from "@repo/database/mutations/themes";
import { getAdminClient } from "@repo/database/supabase/admin";
import { runThemeNarrator } from "../../agents/theme-narrator";
import type { ThemeNarratorOutput } from "../../validations/theme-narrator";

/**
 * TH-014 (FUNC-300, FUNC-301) — Pipeline-step die alle meeting_themes.summary
 * rijen voor één thema aggregeert tot een `theme_narratives` rij via de
 * theme-narrator agent.
 *
 * **Guardrail (FUNC-301):** <2 meetings met summary → agent wordt NIET
 * gecalled. In plaats daarvan schrijven we een sentinel-rij zodat de UI weet
 * dat er "nog te weinig materiaal" is (empty-state) zonder dat we een lege
 * of hallucinerende narrative hebben.
 *
 * **Never-throws** — analoog aan `runLinkThemesStep`. Een crash hier mag de
 * hoofd-pipeline niet breken. Bij agent-failure: oude narrative-rij (indien
 * aanwezig) blijft staan, return `{ success: false }`, caller logt warn.
 */

export interface ThemeNarrativeSynthesisResult {
  success: boolean;
  skipped?: "insufficient_meetings";
  error?: string;
}

export async function runThemeNarrativeSynthesis(
  themeId: string,
  client?: SupabaseClient,
): Promise<ThemeNarrativeSynthesisResult> {
  const db = client ?? getAdminClient();

  try {
    // Stap 1 — thema ophalen (nodig voor naam/emoji/description/guide in de
    // agent-input). We gebruiken een directe select i.p.v. getThemeById omdat
    // we alleen deze vier velden nodig hebben.
    const { data: theme, error: themeErr } = await db
      .from("themes")
      .select("id, name, emoji, description, matching_guide")
      .eq("id", themeId)
      .maybeSingle();

    if (themeErr) {
      return { success: false, error: `theme fetch failed: ${themeErr.message}` };
    }
    if (!theme) {
      return { success: false, error: "theme not found" };
    }

    // Stap 2 — meeting-summaries voor dit thema ophalen.
    const meetings = await listThemeMeetingSummaries(themeId, db);

    // Stap 3 — guardrail: <2 meetings → sentinel-rij, geen agent-call.
    if (meetings.length < 2) {
      const sentinelRes = await upsertThemeNarrative(
        {
          theme_id: themeId,
          briefing: INSUFFICIENT_MEETINGS_SENTINEL,
          patterns: null,
          alignment: null,
          friction: null,
          open_points: null,
          blind_spots: null,
          signal_strength: "onvoldoende",
          signal_notes: `Nog ${meetings.length} meeting${meetings.length === 1 ? "" : "s"} met summary — 2 nodig voor synthese.`,
          meetings_count_at_generation: meetings.length,
        },
        db,
      );
      if ("error" in sentinelRes) {
        return { success: false, error: `sentinel upsert failed: ${sentinelRes.error}` };
      }
      return { success: true, skipped: "insufficient_meetings" };
    }

    // Stap 4 — agent-call.
    let agentOutput: ThemeNarratorOutput;
    try {
      agentOutput = await runThemeNarrator({
        theme: {
          themeId: theme.id,
          name: theme.name,
          emoji: theme.emoji,
          description: theme.description,
          matching_guide: theme.matching_guide,
        },
        meetings,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[theme-narrator] agent-call failed for theme ${themeId}: ${msg}`);
      return { success: false, error: msg };
    }

    // Stap 5 — upsert narrative-rij met agent-output.
    const upsertRes = await upsertThemeNarrative(
      {
        theme_id: themeId,
        briefing: agentOutput.briefing,
        patterns: agentOutput.patterns ?? null,
        alignment: agentOutput.alignment ?? null,
        friction: agentOutput.friction ?? null,
        open_points: agentOutput.open_points ?? null,
        blind_spots: agentOutput.blind_spots ?? null,
        signal_strength: agentOutput.signal_strength,
        signal_notes: agentOutput.signal_notes,
        meetings_count_at_generation: meetings.length,
      },
      db,
    );

    if ("error" in upsertRes) {
      return { success: false, error: `narrative upsert failed: ${upsertRes.error}` };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[theme-narrator] synthesis failed for theme ${themeId}: ${msg}`);
    return { success: false, error: msg };
  }
}
