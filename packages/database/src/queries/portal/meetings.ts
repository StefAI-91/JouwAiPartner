import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Een per-project meeting-segment zoals het Portal het toont.
 *
 * Het portal toont alleen segmenten van meetings met `party_type === 'client'`
 * — interne syncs, sales-calls en management-overleg horen niet in de
 * klantview. De filter zit in deze module zodat de klant-view-policy op één
 * plek leeft en niet in elke pagina opnieuw bedacht hoeft te worden.
 */
export interface PortalMeetingSegment {
  id: string;
  meeting_id: string;
  meeting_title: string | null;
  meeting_date: string | null;
  kernpunten: string[];
  vervolgstappen: string[];
}

const SEGMENT_SELECT = `
  id, meeting_id, kernpunten, vervolgstappen,
  meeting:meetings(title, date, party_type)
` as const;

interface SegmentRow {
  id: string;
  meeting_id: string;
  kernpunten: string[] | null;
  vervolgstappen: string[] | null;
  meeting: {
    title: string | null;
    date: string | null;
    party_type: string | null;
  } | null;
}

function toPortalSegment(row: SegmentRow): PortalMeetingSegment | null {
  if (row.meeting?.party_type !== "client") return null;
  return {
    id: row.id,
    meeting_id: row.meeting_id,
    meeting_title: row.meeting.title ?? null,
    meeting_date: row.meeting.date ?? null,
    kernpunten: row.kernpunten ?? [],
    vervolgstappen: row.vervolgstappen ?? [],
  };
}

/**
 * Lijst van klant-meeting samenvattingen voor één project, meest recent
 * eerst. Filtert op `party_type === 'client'` zodat interne syncs niet
 * naar de klantview lekken.
 */
export async function listClientMeetingSegments(
  projectId: string,
  client: SupabaseClient,
): Promise<PortalMeetingSegment[]> {
  const { data, error } = await client
    .from("meeting_project_summaries")
    .select(SEGMENT_SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as SegmentRow[])
    .map(toPortalSegment)
    .filter((s): s is PortalMeetingSegment => s !== null);
}

/**
 * Eén klant-meeting-segment voor de detailpagina. Returnt null wanneer:
 * - het segment niet bestaat,
 * - het segment niet bij dit project hoort,
 * - de bijbehorende meeting geen `party_type === 'client'` heeft.
 *
 * Drie checks om scoping te garanderen — een gokje op de URL mag niet leiden
 * tot zicht op interne syncs of segmenten van een ander project.
 */
export async function getClientMeetingSegment(
  segmentId: string,
  projectId: string,
  client: SupabaseClient,
): Promise<PortalMeetingSegment | null> {
  const { data, error } = await client
    .from("meeting_project_summaries")
    .select(SEGMENT_SELECT)
    .eq("id", segmentId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error || !data) return null;

  return toPortalSegment(data as unknown as SegmentRow);
}
