import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

/**
 * Q2b-B: lichte single-column read voor de segment-link feedback flow die
 * de huidige `aliases`-array nodig heeft om `project_name_raw` toe te voegen
 * zonder duplicaten.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getProjectAliases(
  projectId: string,
  client?: SupabaseClient,
): Promise<string[] | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("projects")
    .select("aliases")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("[getProjectAliases]", error.message);
    return null;
  }
  if (!data) return null;
  return (data.aliases as string[] | null) ?? [];
}

export async function getProjectByNameIlike(name: string) {
  const { data } = await getAdminClient()
    .from("projects")
    .select("id, name, aliases")
    .ilike("name", `%${name}%`)
    .limit(1)
    .single();
  return data;
}

export async function getAllProjects() {
  const { data } = await getAdminClient().from("projects").select("id, name, aliases");
  return data;
}

// ── Q2b-C: helpers voor devhub (Slack-notifs + userback sync) ──

/**
 * Haal de naam van één project op (single column). Gebruikt door DevHub
 * Slack-notifs die een human-readable project-naam in de payload nodig hebben.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getProjectName(
  projectId: string,
  client?: SupabaseClient,
): Promise<string | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("[getProjectName]", error.message);
    return null;
  }
  return (data?.name as string | null) ?? null;
}

/**
 * Single-column read voor de `organization_id` van één project. Gebruikt door
 * Server Actions die een vraag/feedback aan een project willen koppelen en
 * alleen de organisatie nodig hebben — niet de zware `getProjectById`.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getProjectOrganizationId(
  projectId: string,
  client?: SupabaseClient,
): Promise<string | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("projects")
    .select("organization_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("[getProjectOrganizationId]", error.message);
    return null;
  }
  return (data?.organization_id as string | null) ?? null;
}

/**
 * Zoek een project op basis van de Userback-project-ID (string kolom). Geeft
 * alleen het `id` terug — de Userback-sync route heeft niets anders nodig.
 * Admin-scope variant; de user-scoped page-variant volgt in Q2c.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function getProjectByUserbackProjectId(
  userbackProjectId: string,
  client?: SupabaseClient,
): Promise<{ id: string } | null> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("projects")
    .select("id")
    .eq("userback_project_id", userbackProjectId)
    .maybeSingle();

  if (error) {
    console.error("[getProjectByUserbackProjectId]", error.message);
    return null;
  }
  return data ? { id: data.id as string } : null;
}

/**
 * List the linked `meeting_id`s for a project (uit `meeting_projects`).
 * Mirror van `listMeetingProjectIds`; gebruikt door de summary-pipeline om
 * alle meetings te bepalen die bij een project horen.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function listProjectMeetingIds(
  projectId: string,
  client?: SupabaseClient,
): Promise<string[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("meeting_projects")
    .select("meeting_id")
    .eq("project_id", projectId);

  if (error) {
    console.error("[listProjectMeetingIds]", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.meeting_id as string);
}

/**
 * List the linked `email_id`s for a project (uit `email_projects`). Gebruikt
 * door de summary-pipeline naast `listProjectMeetingIds`.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function listProjectEmailIds(
  projectId: string,
  client?: SupabaseClient,
): Promise<string[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("email_projects")
    .select("email_id")
    .eq("project_id", projectId);

  if (error) {
    console.error("[listProjectEmailIds]", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.email_id as string);
}
