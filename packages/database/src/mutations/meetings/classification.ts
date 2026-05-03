import { getAdminClient } from "../../supabase/admin";

/**
 * Classification + per-veld metadata-updates op de meetings-tabel.
 * `updateMeetingClassification` schrijft het volledige AI-classifier-output-set
 * in één compound update; de losse setters worden door UI-edits aangeroepen.
 */

export async function updateMeetingClassification(
  meetingId: string,
  data: {
    meeting_type: string;
    party_type: string;
    relevance_score: number;
    organization_id: string | null;
    unmatched_organization_name: string | null;
    raw_fireflies: Record<string, unknown>;
  },
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient().from("meetings").update(data).eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateMeetingType(
  meetingId: string,
  meetingType: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update({ meeting_type: meetingType })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateMeetingPartyType(
  meetingId: string,
  partyType: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update({ party_type: partyType })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateMeetingTitle(
  meetingId: string,
  title: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient().from("meetings").update({ title }).eq("id", meetingId);

  if (error) {
    if (error.code === "23505") {
      return { error: "Er bestaat al een meeting met deze titel op dezelfde dag" };
    }
    return { error: error.message };
  }
  return { success: true };
}

export async function updateMeetingOrganization(
  meetingId: string,
  organizationId: string | null,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("meetings")
    .update({ organization_id: organizationId })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  return { success: true };
}
