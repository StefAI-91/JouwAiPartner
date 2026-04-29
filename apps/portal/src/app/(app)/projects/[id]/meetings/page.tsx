import { createPageClient } from "@repo/auth/helpers";
import { listClientMeetingSegments } from "@repo/database/queries/portal";
import { MeetingSummariesList } from "@/components/meetings/meeting-summaries-list";

export default async function ProjectMeetingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createPageClient();
  const segments = await listClientMeetingSegments(id, supabase);

  return (
    <div className="flex flex-1 flex-col gap-5 px-6 py-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Meetings</h2>
        <p className="text-sm text-muted-foreground">
          Samenvattingen van onze meetings met jou. Klik op een meeting voor de kernpunten en
          vervolgstappen.
        </p>
      </div>
      <MeetingSummariesList segments={segments} projectId={id} />
    </div>
  );
}
