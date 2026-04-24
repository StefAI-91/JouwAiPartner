export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { createClient } from "@repo/database/supabase/server";
import {
  listRecentVerifiedMeetings,
  listTodaysBriefingMeetings,
  getExtractionCountsByMeetingIds,
} from "@repo/database/queries/dashboard";
import { listAllTasks } from "@repo/database/queries/tasks";
import { listPeopleForAssignment } from "@repo/database/queries/people";
import { getManagementInsights } from "@repo/database/queries/management-insights";
import { fetchWindowAggregation } from "@repo/database/queries/themes";
import { ManagementInsightsOutputSchema } from "@repo/ai/validations/management-insights";
import { Greeting } from "@/components/dashboard/greeting";
import { MeetingCarousel } from "@/components/dashboard/meeting-carousel";
import { ManagementInsightsStrip } from "@/components/dashboard/management-insights-strip";
import { RecentVerifiedMeetings } from "@/components/dashboard/recent-verified-meetings";
import { TasksCard } from "@/components/dashboard/tasks-card";
import { ThemePillsStrip } from "@/features/themes/components/theme-pills-strip";
import { ThemePillsSkeleton } from "@/features/themes/components/theme-pills-skeleton";
import { TimeSpentDonutSection } from "@/features/themes/components/time-spent-donut-section";
import { TimeSpentDonutSkeleton } from "@/features/themes/components/time-spent-donut-skeleton";

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

  // Fetch all dashboard data in parallel. TH-008 FIX-TH-804: themes-aggregation
  // wordt één keer opgehaald en gedeeld tussen pills + donut (voorheen 4× DB).
  const [briefingResult, verifiedMeetings, tasks, people, insightsRow, themesAggregation] =
    await Promise.all([
      listTodaysBriefingMeetings(supabase),
      listRecentVerifiedMeetings(5, supabase),
      listAllTasks(50, supabase),
      listPeopleForAssignment(supabase),
      getManagementInsights(supabase),
      fetchWindowAggregation(30, supabase),
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

      {/* Management insights one-liner */}
      {managementInsights && <ManagementInsightsStrip insights={managementInsights} />}

      {/* Themes: floating pills (A1) bovenaan, time-spent donut (B8) in de
          rechter kolom naast de meeting-carousel. Suspense zodat elk onderdeel
          zelfstandig laadt zonder de hele dashboard op te houden. */}
      <Suspense fallback={<ThemePillsSkeleton />}>
        <ThemePillsStrip preloadedAggregation={themesAggregation} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <MeetingCarousel
          meetings={briefingMeetings}
          extractionCounts={extractionCounts}
          dayLabel={dayLabel}
        />
        <Suspense fallback={<TimeSpentDonutSkeleton />}>
          <TimeSpentDonutSection preloadedAggregation={themesAggregation} />
        </Suspense>
      </div>

      {/* Two-column bottom: recent meetings + tasks */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentVerifiedMeetings meetings={verifiedMeetings} />
        <TasksCard tasks={tasks} people={people} />
      </div>
    </div>
  );
}
