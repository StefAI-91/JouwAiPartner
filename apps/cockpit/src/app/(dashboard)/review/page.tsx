export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import { listDraftMeetings, getReviewStats } from "@repo/database/queries/review";
import { ReviewCard } from "@/components/review/review-card";
import { ReviewEmptyState } from "@/components/review/empty-state";

export default async function ReviewPage() {
  const supabase = await createClient();
  const [meetings, stats] = await Promise.all([
    listDraftMeetings(supabase),
    getReviewStats(supabase),
  ]);

  if (meetings.length === 0) {
    return <ReviewEmptyState stats={stats} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1>Review Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {meetings.length} meeting{meetings.length !== 1 ? "s" : ""} awaiting review
        </p>
      </div>

      <div className="space-y-4">
        {meetings.map((meeting) => (
          <ReviewCard key={meeting.id} meeting={meeting} />
        ))}
      </div>
    </div>
  );
}
