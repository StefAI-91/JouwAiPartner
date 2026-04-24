export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { createClient } from "@repo/database/supabase/server";
import { listDraftMeetings, getReviewStats } from "@repo/database/queries/review";
import { listDraftEmails } from "@repo/database/queries/emails";
import { listEmergingThemes } from "@repo/database/queries/themes";
import { ReviewQueue } from "@/components/review/review-queue";
import { ReviewEmptyState } from "@/components/review/empty-state";
import { EmergingThemesSection } from "@/features/themes/components/emerging-themes-section";

export default async function ReviewPage() {
  const supabase = await createClient();
  const [meetings, emails, stats, emerging] = await Promise.all([
    listDraftMeetings(supabase),
    listDraftEmails(supabase),
    getReviewStats(supabase),
    listEmergingThemes(),
  ]);

  const totalItems = meetings.length + emails.length + emerging.length;

  if (totalItems === 0) {
    return <ReviewEmptyState stats={stats} />;
  }

  const meetingItems = meetings.length + emails.length;

  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      <div>
        <h1>Review Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalItems} item{totalItems !== 1 ? "s" : ""} awaiting review
        </p>
      </div>

      {/* TH-006 — emerging themes bovenaan de queue. Suspense houdt de rest
          van de queue bruikbaar als de admin-check even duurt. TH-007: data
          wordt als prop doorgegeven zodat we `listEmergingThemes` niet
          tweemaal fetchen (page + Suspense-child). */}
      <Suspense fallback={null}>
        <EmergingThemesSection emerging={emerging} />
      </Suspense>

      {meetingItems > 0 && <ReviewQueue meetings={meetings} emails={emails} />}
    </div>
  );
}
