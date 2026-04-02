// Sprint 013: Dashboard with attention zone, project cards, verified meetings & action items
export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import { getReviewQueueCount, listRecentVerifiedMeetings } from "@repo/database/queries/dashboard";
import { listOpenActionItems } from "@repo/database/queries/action-items";
import { listProjects } from "@repo/database/queries/projects";
import Link from "next/link";
import { Map } from "lucide-react";
import { AttentionZone } from "@/components/dashboard/attention-zone";
import { ProjectCard } from "@/components/projects/project-card";
import { RecentVerifiedMeetings } from "@/components/dashboard/recent-verified-meetings";
import { ActionItemsCard } from "@/components/dashboard/action-items-card";

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
      <div className="flex items-start justify-between">
        <div>
          <h1>Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of platform activity and pending tasks.
          </p>
        </div>
        <Link
          href="/roadmap"
          className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Map className="h-3.5 w-3.5" />
          Roadmap
        </Link>
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
        <ActionItemsCard items={actionItems} />
      </div>
    </div>
  );
}
