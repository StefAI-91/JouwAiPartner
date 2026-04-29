import { getAdminClient } from "../../supabase/admin";

/**
 * Fireflies / title-date lookups voor de ingest- en webhook-flows. Dit zijn
 * goedkope `select id`-achtige queries die checken of een meeting al bestaat
 * voordat we ingest doen — geen pipeline-fetches.
 */

export async function getMeetingByFirefliesId(firefliesId: string) {
  const { data } = await getAdminClient()
    .from("meetings")
    .select("id")
    .eq("fireflies_id", firefliesId)
    .single();
  return data;
}

/**
 * Batch check which fireflies_ids already exist in the database.
 * Returns a Set of fireflies_ids that are already imported.
 */
export async function getExistingFirefliesIds(firefliesIds: string[]): Promise<Set<string>> {
  if (firefliesIds.length === 0) return new Set();

  const { data } = await getAdminClient()
    .from("meetings")
    .select("fireflies_id")
    .in("fireflies_id", firefliesIds);

  return new Set((data ?? []).map((r) => r.fireflies_id).filter(Boolean));
}

/**
 * Batch check which title+date combinations already exist.
 * Returns a Map of "title|YYYY-MM-DD" -> meeting id for duplicates found.
 * Uses day-level comparison (consistent with getMeetingByTitleAndDate).
 */
export async function getExistingMeetingsByTitleDates(
  pairs: { title: string; date: string }[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (pairs.length === 0) return result;

  const titles = [...new Set(pairs.map((p) => p.title))];
  const { data } = await getAdminClient()
    .from("meetings")
    .select("id, title, date")
    .in("title", titles);

  if (!data) return result;

  for (const row of data) {
    if (row.title && row.date) {
      const dayStr = row.date.slice(0, 10);
      result.set(`${row.title.toLowerCase()}|${dayStr}`, row.id);
    }
  }

  return result;
}

/**
 * Check if a meeting with the same title on the same day already exists.
 * Fireflies creates separate transcripts per team member for the same meeting,
 * each with a unique fireflies_id and slightly different timestamps.
 * We compare on date only (not full timestamp) to catch these duplicates.
 */
export async function getMeetingByTitleAndDate(title: string, date: string) {
  const dayStr = date.slice(0, 10); // "YYYY-MM-DD"
  const { data } = await getAdminClient()
    .from("meetings")
    .select("id, fireflies_id")
    .ilike("title", title)
    .gte("date", `${dayStr}T00:00:00.000Z`)
    .lt("date", `${dayStr}T23:59:59.999Z`)
    .limit(1)
    .maybeSingle();
  return data;
}
