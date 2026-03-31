// Sprint 013: Dashboard with attention zone, project cards, verified meetings & action items
export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import { getReviewQueueCount, listRecentVerifiedMeetings } from "@repo/database/queries/dashboard";
import { listOpenActionItems } from "@repo/database/queries/action-items";
import { listProjects } from "@repo/database/queries/projects";
import { AttentionZone } from "@/components/dashboard/attention-zone";
import { ProjectCard } from "@/components/projects/project-card";
import { RecentVerifiedMeetings } from "@/components/dashboard/recent-verified-meetings";
import { OpenActionsList } from "@/components/dashboard/open-actions-list";

export default async function DashboardPage() {
  const supabase = await createClient();
  const [reviewCount, verifiedMeetings, actionItems, projects] = await Promise.all([
    getReviewQueueCount(supabase),
    listRecentVerifiedMeetings(5, supabase),
    listOpenActionItems(10, supabase),
    listProjects(supabase),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Page header */}
      <div>
        <h1>Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of platform activity and pending tasks.
        </p>
      </div>

      {/* Attention zone — review queue */}
      <AttentionZone reviewCount={reviewCount} />

      {/* Project cards */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
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
        <OpenActionsList items={actionItems} />
      </div>
    </div>
  );
}
