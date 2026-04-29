import { getAdminClient } from "../../supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mini-queries voor afgeleide metadata en relatie-IDs van een meeting:
 * organization_id, project_ids, participant_ids. Bedoeld voor diff-logica
 * (bv. `updateMeetingMetadataAction`) en voor segment/tagger flows die
 * alleen de organisatie nodig hebben.
 */

/**
 * Mini-query: 1 kolom (`organization_id`) van een meeting. Gebruikt door de
 * tagger-stap en door segment-feedback acties die de organisatie nodig
 * hebben voor `ignored_entities`-records.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getMeetingOrganizationId(
  meetingId: string,
  client?: SupabaseClient,
): Promise<string | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meetings")
    .select("organization_id")
    .eq("id", meetingId)
    .maybeSingle();

  if (error) {
    console.error("[getMeetingOrganizationId]", error.message);
    return null;
  }
  return (data?.organization_id as string | null) ?? null;
}

/**
 * List the linked `project_id`s of a meeting (uit `meeting_projects`). Apart
 * van `getMeetingForTitleGeneration` omdat dat de project-namen ook ophaalt;
 * deze helper geeft alleen de IDs voor diff-logica in
 * `updateMeetingMetadataAction`.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function listMeetingProjectIds(
  meetingId: string,
  client?: SupabaseClient,
): Promise<string[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meeting_projects")
    .select("project_id")
    .eq("meeting_id", meetingId);

  if (error) {
    console.error("[listMeetingProjectIds]", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.project_id as string);
}

/**
 * List the linked `person_id`s van een meeting (uit `meeting_participants`).
 * Tegengaaster van `listMeetingProjectIds`: alleen IDs, voor diff-logica.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function listMeetingParticipantIds(
  meetingId: string,
  client?: SupabaseClient,
): Promise<string[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meeting_participants")
    .select("person_id")
    .eq("meeting_id", meetingId);

  if (error) {
    console.error("[listMeetingParticipantIds]", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.person_id as string);
}
