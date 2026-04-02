export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import {
  listRecentVerifiedMeetings,
  listBriefingMeetings,
  getExtractionCountsByMeetingIds,
} from "@repo/database/queries/dashboard";
import { listOpenActionItems } from "@repo/database/queries/action-items";
import { listPeopleForAssignment } from "@repo/database/queries/people";
import { Greeting } from "@/components/dashboard/greeting";
import { MeetingCarousel } from "@/components/dashboard/meeting-carousel";
import { RecentVerifiedMeetings } from "@/components/dashboard/recent-verified-meetings";
import { ActionItemsCard } from "@/components/dashboard/action-items-card";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user for greeting
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profileResult = user
    ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
    : null;
  const userName = profileResult?.data?.full_name ?? null;

  // Fetch all dashboard data in parallel
  const [briefingMeetings, verifiedMeetings, actionItems, people] = await Promise.all([
    listBriefingMeetings(8, supabase),
    listRecentVerifiedMeetings(5, supabase),
    listOpenActionItems(10, supabase),
    listPeopleForAssignment(supabase),
  ]);

  // Batch-fetch extraction counts for carousel meetings (avoid N+1)
  const meetingIds = briefingMeetings.map((m) => m.id);
  const extractionCounts = await getExtractionCountsByMeetingIds(meetingIds, supabase);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Greeting */}
      <Greeting userName={userName} />

      {/* Meeting briefing carousel */}
      <MeetingCarousel meetings={briefingMeetings} extractionCounts={extractionCounts} />

      {/* Two-column bottom: recent meetings + open actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentVerifiedMeetings meetings={verifiedMeetings} />
        <ActionItemsCard items={actionItems} people={people} />
      </div>
    </div>
  );
}
