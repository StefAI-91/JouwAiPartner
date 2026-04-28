import { notFound } from "next/navigation";
import { createPageClient } from "@repo/auth/helpers";
import { getTopicWithIssues } from "@repo/database/queries/topics";
import { topicStatusToBucket } from "@repo/database/constants/topics";
import { TopicDetailView } from "@/components/roadmap/topic-detail-view";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string; topicId: string }>;
}) {
  const { id, topicId } = await params;

  const supabase = await createPageClient();
  const topic = await getTopicWithIssues(topicId, supabase);

  if (!topic || topic.project_id !== id) notFound();

  // Hide topics that don't belong in any client-visible bucket
  // (clustering, wont_do, wont_do_proposed_by_client). RLS handles this
  // server-side, but we treat them as not-found defensively.
  if (!topicStatusToBucket(topic.status, topic.closed_at)) notFound();

  return (
    <div className="flex flex-1 flex-col gap-5 px-6 py-8">
      <TopicDetailView topic={topic} projectId={id} />
    </div>
  );
}
