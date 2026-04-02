export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import {
  getReviewQueueCount,
  listRecentVerifiedMeetings,
  listBriefingMeetings,
  getExtractionCountsByMeetingIds,
  getAiPulseData,
} from "@repo/database/queries/dashboard";
import { listOpenActionItems } from "@repo/database/queries/action-items";
import { listProjects } from "@repo/database/queries/projects";
import { Greeting } from "@/components/dashboard/greeting";
import { AiPulseStrip } from "@/components/dashboard/ai-pulse-strip";
import { MeetingCarousel } from "@/components/dashboard/meeting-carousel";
import { AttentionZone } from "@/components/dashboard/attention-zone";
import { ProjectCard } from "@/components/projects/project-card";
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
  const [reviewCount, briefingMeetings, verifiedMeetings, actionItems, projects, pulseData] =
    await Promise.all([
      getReviewQueueCount(supabase),
      listBriefingMeetings(8, supabase),
      listRecentVerifiedMeetings(5, supabase),
      listOpenActionItems(10, supabase),
      listProjects(supabase),
      getAiPulseData(supabase),
    ]);

  // Batch-fetch extraction counts for carousel meetings (avoid N+1)
  const meetingIds = briefingMeetings.map((m) => m.id);
  const extractionCounts = await getExtractionCountsByMeetingIds(meetingIds, supabase);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Greeting + AI Pulse */}
      <div className="space-y-4">
        <Greeting userName={userName} />
        <AiPulseStrip data={pulseData} />
      </div>

      {/* Attention zone — review queue */}
      <AttentionZone reviewCount={reviewCount} />

      {/* Meeting briefing carousel */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Laatste briefings</h2>
        <MeetingCarousel meetings={briefingMeetings} extractionCounts={extractionCounts} />
      </section>

      {/* Project cards */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Projecten</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen projecten.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      {/* Two-column bottom: recent meetings + open actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentVerifiedMeetings meetings={verifiedMeetings} />
        <ActionItemsCard items={actionItems} />
      </div>
    </div>
  );
}
