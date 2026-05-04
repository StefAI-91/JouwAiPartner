import { notFound } from "next/navigation";
import { createPageClient } from "@repo/auth/helpers";
import { listTopicsByBucket, countIssuesPerTopic } from "@repo/database/queries/topics";
import { listSprintsWithTopics } from "@repo/database/queries/sprints";
import { getProjectBriefingHeader } from "@repo/database/queries/portal";
import { BucketStack } from "@/components/roadmap/bucket-stack";
import { RoadmapHero } from "@/components/roadmap/roadmap-hero";
import { SprintTimeline } from "@/components/roadmap/sprint-timeline";

const DEV_PHASE_STATUSES = new Set(["kickoff", "in_progress", "review"]);

export default async function ProjectRoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createPageClient();

  // Re-use de header-query om aan project.status te komen — deze loopt
  // door dezelfde RLS-bescherming als de briefing-page, dus cross-org URL-
  // manipulatie krijgt notFound() in plaats van een lege roadmap.
  const header = await getProjectBriefingHeader(id, supabase);
  if (!header) notFound();

  const isDevMode = DEV_PHASE_STATUSES.has(header.status);

  if (isDevMode) {
    const sprints = await listSprintsWithTopics(id, supabase);
    return (
      <div className="flex flex-1 flex-col gap-8 px-6 py-8">
        {sprints.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            Het team heeft nog geen sprints ingepland. Zodra dat gebeurt verschijnt hier de tijdlijn
            van wat en wanneer.
          </p>
        ) : (
          <SprintTimeline sprints={sprints} />
        )}
      </div>
    );
  }

  // Productie-modus — bestaande 4-bucket-view, maar gefilterd op
  // origin='production' zodat sprint-werk uit de dev-fase niet meer
  // opduikt in de actuele roadmap.
  const buckets = await listTopicsByBucket(id, null, supabase, { origin: "production" });

  const allTopicIds = [
    ...buckets.recent_done,
    ...buckets.upcoming,
    ...buckets.high_prio,
    ...buckets.awaiting_input,
  ].map((t) => t.id);

  const issueCounts = await countIssuesPerTopic(allTopicIds, supabase);

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 py-8">
      <RoadmapHero buckets={buckets} />
      <BucketStack buckets={buckets} issueCounts={issueCounts} projectId={id} />
    </div>
  );
}
