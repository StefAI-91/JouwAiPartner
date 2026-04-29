import { createPageClient } from "@repo/auth/helpers";
import { listTopicsByBucket, countIssuesPerTopic } from "@repo/database/queries/topics";
import { BucketStack } from "@/components/roadmap/bucket-stack";

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
    <div className="flex flex-1 flex-col gap-5 px-6 py-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Wat &amp; wanneer</h2>
        <p className="text-sm text-muted-foreground">
          Wat is er gefixed, wat staat op de planning, wat heeft daarna prioriteit en wat is nog
          niet geprioriteerd. Per fase gesplitst in bugs en functionaliteit.
        </p>
      </div>
      <BucketStack buckets={buckets} issueCounts={issueCounts} projectId={id} />
    </div>
  );
}
