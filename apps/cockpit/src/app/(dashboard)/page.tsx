export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import {
  listRecentVerifiedMeetings,
  listTodaysBriefingMeetings,
  getExtractionCountsByMeetingIds,
} from "@repo/database/queries/dashboard";
import { listAllTasks } from "@repo/database/queries/tasks";
import { listPeopleForAssignment } from "@repo/database/queries/people";
import { getManagementInsights } from "@repo/database/queries/management-insights";
import { listActiveProjectsWithUrgency } from "@repo/database/queries/active-projects-with-urgency";
import { ManagementInsightsOutputSchema } from "@repo/ai/validations/management-insights";
import { Greeting } from "@/components/dashboard/greeting";
import { MeetingCarousel } from "@/components/dashboard/meeting-carousel";
import { ManagementInsightsStrip } from "@/components/dashboard/management-insights-strip";
import { RecentVerifiedMeetings } from "@/components/dashboard/recent-verified-meetings";
import { TasksCard } from "@/components/dashboard/tasks-card";
import { ProjectSwitcher } from "@/components/dashboard/project-switcher";

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
  const [briefingResult, verifiedMeetings, tasks, people, insightsRow, activeProjects] =
    await Promise.all([
      listTodaysBriefingMeetings(supabase),
      listRecentVerifiedMeetings(5, supabase),
      listAllTasks(50, supabase),
      listPeopleForAssignment(supabase),
      getManagementInsights(supabase),
      listActiveProjectsWithUrgency(supabase),
    ]);

  const parsedInsights = insightsRow?.structured_content
    ? ManagementInsightsOutputSchema.safeParse(insightsRow.structured_content)
    : null;
  const managementInsights = parsedInsights?.success ? parsedInsights.data : null;

  const { meetings: briefingMeetings, dayLabel } = briefingResult;

  // Batch-fetch extraction counts for carousel meetings (avoid N+1)
  const meetingIds = briefingMeetings.map((m) => m.id);
  const extractionCounts = await getExtractionCountsByMeetingIds(meetingIds, supabase);

  return (
    <div className="space-y-8 px-4 py-8 lg:px-10">
      {/* Greeting */}
      <Greeting userName={userName} />

      {/* Project-first switcher — open je werkblad in één klik */}
      <ProjectSwitcher projects={activeProjects} />

      {/* Management insights one-liner */}
      {managementInsights && <ManagementInsightsStrip insights={managementInsights} />}

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
