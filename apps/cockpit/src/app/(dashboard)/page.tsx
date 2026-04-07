export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import {
  listRecentVerifiedMeetings,
  listTodaysBriefingMeetings,
  getExtractionCountsByMeetingIds,
} from "@repo/database/queries/dashboard";
import { listAllTasks } from "@repo/database/queries/tasks";
import { listPeopleForAssignment } from "@repo/database/queries/people";
import { Greeting } from "@/components/dashboard/greeting";
import { MeetingCarousel } from "@/components/dashboard/meeting-carousel";
import { RecentVerifiedMeetings } from "@/components/dashboard/recent-verified-meetings";
import { TasksCard } from "@/components/dashboard/tasks-card";

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
  const [briefingResult, verifiedMeetings, tasks, people] = await Promise.all([
    listTodaysBriefingMeetings(supabase),
    listRecentVerifiedMeetings(5, supabase),
    listAllTasks(50, supabase),
    listPeopleForAssignment(supabase),
  ]);

  const { meetings: briefingMeetings, dayLabel } = briefingResult;

  // Batch-fetch extraction counts for carousel meetings (avoid N+1)
  const meetingIds = briefingMeetings.map((m) => m.id);
  const extractionCounts = await getExtractionCountsByMeetingIds(meetingIds, supabase);

  return (
    <div className="space-y-8 px-4 py-8 lg:px-10">
      {/* Greeting */}
      <Greeting userName={userName} />

      {/* Meeting briefing carousel */}
      <MeetingCarousel
        meetings={briefingMeetings}
        extractionCounts={extractionCounts}
        dayLabel={dayLabel}
      />

      {/* Two-column bottom: recent meetings + tasks */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentVerifiedMeetings meetings={verifiedMeetings} />
        <TasksCard tasks={tasks} people={people} />
      </div>
    </div>
  );
}
