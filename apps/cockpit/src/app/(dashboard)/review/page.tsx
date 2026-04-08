export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import { listDraftMeetings, getReviewStats } from "@repo/database/queries/review";
import { listDraftEmails } from "@repo/database/queries/emails";
import { ReviewQueue } from "@/components/review/review-queue";
import { ReviewEmptyState } from "@/components/review/empty-state";

export default async function ReviewPage() {
  const supabase = await createClient();
  const [meetings, emails, stats] = await Promise.all([
    listDraftMeetings(supabase),
    listDraftEmails(supabase),
    getReviewStats(supabase),
  ]);

  const totalItems = meetings.length + emails.length;

  if (totalItems === 0) {
    return <ReviewEmptyState stats={stats} />;
  }

  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      <div>
        <h1>Review Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalItems} item{totalItems !== 1 ? "s" : ""} awaiting review
        </p>
      </div>

      <ReviewQueue meetings={meetings} emails={emails} />
    </div>
  );
}
