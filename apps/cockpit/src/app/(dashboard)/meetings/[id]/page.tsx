export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getVerifiedMeetingById } from "@repo/database/queries/meetings";
import { MeetingDetailView } from "@/components/meetings/meeting-detail";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const meeting = await getVerifiedMeetingById(id, supabase);

  if (!meeting) notFound();

  return <MeetingDetailView meeting={meeting} />;
}
