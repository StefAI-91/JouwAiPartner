import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { TopicDetail } from "@/features/topics/components/topic-detail";

export default async function TopicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  return <TopicDetail topicId={id} />;
}
