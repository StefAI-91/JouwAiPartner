import { notFound } from "next/navigation";
import { createPageClient } from "@repo/auth/helpers";
import { getClientMeetingSegment } from "@repo/database/queries/portal";
import { MeetingSegmentDetail } from "@/components/meetings/meeting-segment-detail";

export default async function ProjectMeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string; segmentId: string }>;
}) {
  const { id, segmentId } = await params;

  const supabase = await createPageClient();
  const segment = await getClientMeetingSegment(segmentId, id, supabase);

  if (!segment) notFound();

  return (
    <div className="flex flex-1 flex-col gap-5 px-6 py-8">
      <MeetingSegmentDetail segment={segment} projectId={id} />
    </div>
  );
}
