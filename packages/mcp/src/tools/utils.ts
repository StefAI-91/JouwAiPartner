import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Escape LIKE/ILIKE wildcard characters in user input.
 * Prevents % and _ from being interpreted as wildcards.
 */
export function escapeLike(input: string): string {
  return input.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Sanitize input for PostgREST array containment (cs) filter.
 * Removes {, }, and , characters that could break the filter syntax.
 */
export function sanitizeForContains(input: string): string {
  return input.replace(/[{},]/g, "");
}

/**
 * Resolve project IDs by partial name OR alias match.
 * Returns null if no projects found, or an array of matching IDs.
 */
export async function resolveProjectIds(
  supabase: SupabaseClient,
  projectName: string,
): Promise<string[] | null> {
  const escaped = escapeLike(projectName);
  const sanitized = sanitizeForContains(projectName);
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .or(`name.ilike.%${escaped}%,aliases.cs.{${sanitized}}`);

  if (!projects || projects.length === 0) return null;
  return projects.map((p: { id: string }) => p.id);
}

/**
 * Resolve organization IDs by partial name OR alias match.
 * Returns null if no organizations found, or an array of matching IDs.
 */
export async function resolveOrganizationIds(
  supabase: SupabaseClient,
  orgName: string,
): Promise<string[] | null> {
  const escaped = escapeLike(orgName);
  const sanitized = sanitizeForContains(orgName);
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id")
    .or(`name.ilike.%${escaped}%,aliases.cs.{${sanitized}}`);

  if (!orgs || orgs.length === 0) return null;
  return orgs.map((o: { id: string }) => o.id);
}

/**
 * Resolve meeting IDs by participant name.
 * Checks both the meeting_participants join table (linked people)
 * and the participants text array on meetings (unlinked Fireflies names).
 * Returns null if no meetings found, or an array of matching meeting IDs.
 */
export async function resolveMeetingIdsByParticipant(
  supabase: SupabaseClient,
  participantName: string,
): Promise<string[] | null> {
  const escaped = escapeLike(participantName);
  const meetingIds = new Set<string>();

  // Strategy 1: Match via meeting_participants join table (linked people)
  const { data: people } = await supabase.from("people").select("id").ilike("name", `%${escaped}%`);

  if (people && people.length > 0) {
    const personIds = people.map((p: { id: string }) => p.id);
    const { data: mpMatches } = await supabase
      .from("meeting_participants")
      .select("meeting_id")
      .in("person_id", personIds);

    if (mpMatches) {
      for (const mp of mpMatches) {
        meetingIds.add((mp as { meeting_id: string }).meeting_id);
      }
    }
  }

  // Strategy 2: Match via participants text array (unlinked names from Fireflies)
  // Fetch all meetings and filter in JS since PostgREST doesn't support
  // case-insensitive partial match on array elements
  const lowerName = participantName.toLowerCase();
  const { data: allMeetings } = await supabase
    .from("meetings")
    .select("id, participants")
    .not("participants", "is", null);

  if (allMeetings) {
    for (const m of allMeetings as { id: string; participants: string[] }[]) {
      if (m.participants?.some((p) => p.toLowerCase().includes(lowerName))) {
        meetingIds.add(m.id);
      }
    }
  }

  if (meetingIds.size === 0) return null;
  return [...meetingIds];
}

/**
 * Format verification status for MCP tool output.
 * Shows verification info: who verified and when, or draft/AI status.
 */
export function formatVerificatieStatus(
  verificationStatus: string | null,
  verifiedByName: string | null,
  verifiedAt: string | null,
  confidence: number | null,
  correctedBy: string | null,
): string {
  if (verificationStatus === "verified") {
    const dateStr = verifiedAt ? new Date(verifiedAt).toLocaleDateString("nl-NL") : null;
    if (verifiedByName && dateStr) {
      return `Verified by ${verifiedByName} on ${dateStr}`;
    }
    if (verifiedByName) {
      return `Verified by ${verifiedByName}`;
    }
    if (dateStr) {
      return `Verified on ${dateStr}`;
    }
    return "Verified";
  }

  if (verificationStatus === "rejected") {
    return "Rejected";
  }

  if (correctedBy) {
    return "Corrected (verification pending)";
  }

  if (confidence != null) {
    return `AI draft (confidence: ${Math.round(confidence * 100)}%)`;
  }

  return "Draft";
}

/**
 * Lookup profile names for verified_by UUIDs.
 * Returns a map of UUID -> full_name.
 */
export async function lookupProfileNames(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  verifiedByIds: string[],
): Promise<Record<string, string>> {
  if (verifiedByIds.length === 0) return {};

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", verifiedByIds);

  if (error) {
    console.error("lookupProfileNames failed:", error.message);
    return {};
  }

  if (!profiles) return {};

  return Object.fromEntries(profiles.map((p) => [p.id, p.full_name || "Onbekend"]));
}

/**
 * Extract unique non-null verified_by UUIDs from an array of items.
 */
export function collectVerifiedByIds(items: { verified_by?: string | null }[]): string[] {
  return [...new Set(items.map((i) => i.verified_by).filter((id): id is string => id != null))];
}
