import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * CP-010 — Queries voor de Portal Briefing v2 page. Vier focused queries
 * voeden de vier blokken: header (deploy-knoppen + screenshot), "Klaar om
 * te testen" (topics met instructies), "Waar wachten we op" (blockers) en
 * "Deze week gebeurd" (changelog).
 *
 * Alle queries lopen via de page-client zodat RLS van toepassing is —
 * defensief naast de bestaande project-access checks.
 */

export interface PortalBriefingHeader {
  id: string;
  name: string;
  status: string;
  preview_url: string | null;
  production_url: string | null;
  screenshot_url: string | null;
  organization: { id: string; name: string } | null;
}

export interface BriefingTopic {
  id: string;
  title: string;
  client_title: string | null;
  client_description: string | null;
  client_test_instructions: string | null;
  type: string;
  status: string;
  updated_at: string;
}

export interface ChangelogEntry {
  kind: "topic_closed" | "meeting";
  id: string;
  date: string;
  title: string;
}

const HEADER_COLS = `
  id, name, status, preview_url, production_url, screenshot_url,
  organization:organizations(id, name)
` as const;

/**
 * Eén project-record voor de Briefing-header. Geeft `null` terug als RLS
 * de rij blokkeert of het project niet bestaat — de page handelt dat af
 * via `notFound()`.
 */
export async function getProjectBriefingHeader(
  projectId: string,
  client: SupabaseClient,
): Promise<PortalBriefingHeader | null> {
  const { data, error } = await client
    .from("projects")
    .select(HEADER_COLS)
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("[getProjectBriefingHeader]", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    name: string;
    status: string | null;
    preview_url: string | null;
    production_url: string | null;
    screenshot_url: string | null;
    organization: { id: string; name: string } | null;
  };

  return {
    id: row.id,
    name: row.name,
    status: row.status ?? "lead",
    preview_url: row.preview_url,
    production_url: row.production_url,
    screenshot_url: row.screenshot_url,
    organization: row.organization,
  };
}

const BRIEFING_TOPIC_COLS = `
  id, title, client_title, client_description, client_test_instructions,
  type, status, updated_at
` as const;

interface BriefingTopicRow {
  id: string;
  title: string;
  client_title: string | null;
  client_description: string | null;
  client_test_instructions: string | null;
  type: string;
  status: string;
  updated_at: string;
}

/**
 * Topics die "klaar om te testen" zijn voor de klant: status `in_progress`
 * en met ingevulde test-instructies. Zonder instructies blijft een topic
 * onzichtbaar — bewust forced ritual om het team te dwingen expliciet te
 * markeren wat de klant kan testen.
 */
export async function listTopicsReadyToTest(
  projectId: string,
  client: SupabaseClient,
): Promise<BriefingTopic[]> {
  const { data, error } = await client
    .from("topics")
    .select(BRIEFING_TOPIC_COLS)
    .eq("project_id", projectId)
    .eq("status", "in_progress")
    .not("client_test_instructions", "is", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[listTopicsReadyToTest]", error.message);
    return [];
  }
  return (data ?? []) as BriefingTopicRow[];
}

/**
 * Topics waar de klant ons blokkeert: status `awaiting_client_input`.
 * `updated_at` voor "open sinds X dagen"-formattering in de UI.
 */
export async function listTopicsAwaitingInput(
  projectId: string,
  client: SupabaseClient,
): Promise<BriefingTopic[]> {
  const { data, error } = await client
    .from("topics")
    .select(BRIEFING_TOPIC_COLS)
    .eq("project_id", projectId)
    .eq("status", "awaiting_client_input")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[listTopicsAwaitingInput]", error.message);
    return [];
  }
  return (data ?? []) as BriefingTopicRow[];
}

/**
 * "Deze week gebeurd" — changelog van topics afgesloten in venster + client-
 * meetings in venster. Twee aparte queries die we in JS samenvoegen op datum
 * desc; refactor naar single SQL UNION pas als perf-issue blijkt.
 *
 * `meeting_projects` koppelt meetings aan projecten; we filteren expliciet
 * op `party_type === 'client'` zodat interne syncs niet in de klantview
 * lekken (zelfde policy als `listClientMeetingSegments`).
 */
export async function listWeeklyChangelog(
  projectId: string,
  client: SupabaseClient,
  options?: { days?: number; limit?: number },
): Promise<ChangelogEntry[]> {
  const days = options?.days ?? 7;
  const limit = options?.limit ?? 8;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [topicsResult, meetingsResult] = await Promise.all([
    client
      .from("topics")
      .select("id, title, client_title, closed_at")
      .eq("project_id", projectId)
      .in("status", ["done", "wont_do", "wont_do_proposed_by_client"])
      .gte("closed_at", since)
      .order("closed_at", { ascending: false })
      .limit(limit),
    client
      .from("meeting_projects")
      .select("meeting:meetings(id, title, date, party_type)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit * 2),
  ]);

  if (topicsResult.error) {
    console.error("[listWeeklyChangelog:topics]", topicsResult.error.message);
  }
  if (meetingsResult.error) {
    console.error("[listWeeklyChangelog:meetings]", meetingsResult.error.message);
  }

  const topicEntries: ChangelogEntry[] = (topicsResult.data ?? []).map((row) => {
    const r = row as unknown as {
      id: string;
      title: string;
      client_title: string | null;
      closed_at: string;
    };
    return {
      kind: "topic_closed",
      id: r.id,
      date: r.closed_at,
      title: r.client_title ?? r.title,
    };
  });

  const meetingEntries: ChangelogEntry[] = (meetingsResult.data ?? [])
    .map((row): ChangelogEntry | null => {
      const m = (
        row as unknown as {
          meeting: {
            id: string;
            title: string | null;
            date: string | null;
            party_type: string | null;
          } | null;
        }
      ).meeting;
      if (!m || m.party_type !== "client" || !m.date) return null;
      if (m.date < since) return null;
      return {
        kind: "meeting",
        id: m.id,
        date: m.date,
        title: m.title ?? "Meeting",
      };
    })
    .filter((e): e is ChangelogEntry => e !== null);

  return [...topicEntries, ...meetingEntries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}
