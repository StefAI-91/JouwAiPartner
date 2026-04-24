import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

/**
 * TH-014 (FUNC-302) — Queries voor Theme-Narrator: lezen van de per-thema
 * cross-meeting narrative + de meeting-summaries die hem voeden.
 *
 * De `insufficient`-sentinel op `briefing` wordt hier bewust niet weggefilterd;
 * de UI beslist welke state getoond wordt (empty-state vs echte narrative).
 * Zo blijft de query neutraal en gebruikt de pipeline dezelfde read-pad voor
 * staleness-check.
 */

/** TH-014 (FUNC-301) — Sentinel-waarde voor narratives zonder agent-call (guardrail <2 meetings). */
export const INSUFFICIENT_MEETINGS_SENTINEL = "__insufficient__";

export interface ThemeNarrativeRow {
  theme_id: string;
  briefing: string;
  patterns: string | null;
  alignment: string | null;
  friction: string | null;
  open_points: string | null;
  blind_spots: string | null;
  signal_strength: "sterk" | "matig" | "zwak" | "onvoldoende";
  signal_notes: string | null;
  meetings_count_at_generation: number;
  generated_at: string;
  updated_at: string;
}

export interface ThemeNarrativeWithStaleness extends ThemeNarrativeRow {
  /**
   * True wanneer `themes.last_mentioned_at > generated_at`. Afgeleid in de
   * query, niet gecached — blijft correct als mention-stats bijgewerkt worden
   * zonder dat de narrative hoeft te worden herschreven.
   *
   * EDGE-254: `last_mentioned_at = null` → is_stale = false. Technisch niet
   * bereikbaar (guardrail blokkeert narratives voor themes zonder mentions),
   * maar veilig verdedigd.
   */
  is_stale: boolean;
  /** True als briefing de insufficient-sentinel is (guardrail triggerde). */
  is_insufficient: boolean;
}

/**
 * Haalt de narrative-rij voor een thema op, mét afgeleide staleness.
 * Retourneert `null` als er nog geen narrative is (eerste pipeline-run staat
 * nog te gebeuren, of het thema heeft nog <2 meetings).
 */
export async function getThemeNarrative(
  themeId: string,
  client?: SupabaseClient,
): Promise<ThemeNarrativeWithStaleness | null> {
  const db = client ?? getAdminClient();

  const [narrativeRes, themeRes] = await Promise.all([
    db
      .from("theme_narratives")
      .select(
        "theme_id, briefing, patterns, alignment, friction, open_points, blind_spots, signal_strength, signal_notes, meetings_count_at_generation, generated_at, updated_at",
      )
      .eq("theme_id", themeId)
      .maybeSingle(),
    db.from("themes").select("last_mentioned_at").eq("id", themeId).maybeSingle(),
  ]);

  if (narrativeRes.error) {
    throw new Error(`theme_narratives fetch failed: ${narrativeRes.error.message}`);
  }
  if (!narrativeRes.data) return null;

  if (themeRes.error) {
    throw new Error(`themes fetch failed: ${themeRes.error.message}`);
  }

  const row = narrativeRes.data as ThemeNarrativeRow;
  const lastMentionedAt = themeRes.data?.last_mentioned_at ?? null;

  const isStale =
    lastMentionedAt !== null &&
    new Date(lastMentionedAt).getTime() > new Date(row.generated_at).getTime();

  return {
    ...row,
    is_stale: isStale,
    is_insufficient: row.briefing === INSUFFICIENT_MEETINGS_SENTINEL,
  };
}

export interface ThemeMeetingSummaryForNarrator {
  meeting_id: string;
  date: string | null;
  title: string | null;
  confidence: "medium" | "high";
  evidence_quote: string;
  summary: string;
}

/**
 * Alle meeting_themes-rijen voor een thema die een niet-null summary hebben,
 * chronologisch (nieuwste eerst). Dit is de input-bouwsteen voor de
 * Theme-Narrator agent: hij synthetiseert over deze rijen heen.
 *
 * Alleen rijen met summary: zonder summary kan de Narrator niks met de
 * meeting (evidence_quote alleen is te smal). Dat is ook de guardrail-teller:
 * <2 rijen met summary → geen agent-call, sentinel schrijven.
 */
export async function listThemeMeetingSummaries(
  themeId: string,
  client?: SupabaseClient,
): Promise<ThemeMeetingSummaryForNarrator[]> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("meeting_themes")
    .select(
      `meeting_id,
       confidence,
       evidence_quote,
       summary,
       meeting:meetings!inner(date, title)`,
    )
    .eq("theme_id", themeId)
    .not("summary", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`meeting_themes for narrator fetch failed: ${error.message}`);
  }

  // Supabase PostgREST typt FK-embeds als array; bij 1-op-1 FK resolve we
  // met `[0] ?? null` zodat we los staan van de inferred array-shape.
  type MeetingEmbed = { date: string | null; title: string | null };
  type Row = {
    meeting_id: string;
    confidence: "medium" | "high";
    evidence_quote: string;
    summary: string;
    meeting: MeetingEmbed | MeetingEmbed[] | null;
  };

  const rows = (data ?? []) as unknown as Row[];

  return rows
    .map((r) => {
      const m = Array.isArray(r.meeting) ? (r.meeting[0] ?? null) : r.meeting;
      return {
        meeting_id: r.meeting_id,
        date: m?.date ?? null,
        title: m?.title ?? null,
        confidence: r.confidence,
        evidence_quote: r.evidence_quote,
        summary: r.summary,
      };
    })
    .sort((a, b) => {
      // Secondaire sort op date desc zodat de Narrator chronologie netjes ziet,
      // ook als created_at en date uit elkaar lopen (re-ingest scenarios).
      if (a.date === null && b.date === null) return 0;
      if (a.date === null) return 1;
      if (b.date === null) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
}
