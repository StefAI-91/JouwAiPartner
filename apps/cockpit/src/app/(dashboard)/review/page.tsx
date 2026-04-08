export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import { listDraftMeetings, getReviewStats } from "@repo/database/queries/review";
import { listDraftEmails } from "@repo/database/queries/emails";
import { ReviewCard } from "@/components/review/review-card";
import { EmailReviewCard } from "@/components/review/email-review-card";
import { ReviewEmptyState } from "@/components/review/empty-state";

export default async function ReviewPage() {
  const supabase = await createClient();
  const [meetings, emails, stats] = await Promise.all([
    listDraftMeetings(supabase),
    listDraftEmails(),
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
          {meetings.length > 0 && emails.length > 0 && (
            <span>
              {" "}
              ({meetings.length} meeting{meetings.length !== 1 ? "s" : ""}, {emails.length} email
              {emails.length !== 1 ? "s" : ""})
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {meetings.map((meeting) => (
          <ReviewCard key={meeting.id} meeting={meeting} />
        ))}
        {emails.map((email) => (
          <EmailReviewCard key={email.id} email={email} />
        ))}
      </div>
    </div>
  );
}
