import { createPageClient } from "@repo/auth/helpers";
import { listTopicsByBucket, countIssuesPerTopic } from "@repo/database/queries/topics";
import { BucketStack } from "@/components/roadmap/bucket-stack";
import { RoadmapHero } from "@/components/roadmap/roadmap-hero";

export default async function ProjectRoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createPageClient();
  const buckets = await listTopicsByBucket(id, null, supabase);

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
