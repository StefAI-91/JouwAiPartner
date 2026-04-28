import { notFound, redirect } from "next/navigation";
import { createPageClient, getAuthenticatedUser } from "@repo/auth/helpers";
import { getTopicById } from "@repo/database/queries/topics";
import { TopicDetail } from "@/features/topics/components/topic-detail";

/**
 * `?project=<id>` is verplicht in de URL — zonder query forceert de
 * ProjectSwitcher in de layout een reset naar het alfabetisch eerste
 * project. We resolven het project via het topic en redirecten zelf,
 * zodat directe URLs (bookmarks, gedeelde links) ook in het juiste
 * project landen.
 */
export default async function TopicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  if (!sp.project) {
    const supabase = await createPageClient();
    const topic = await getTopicById(id, supabase);
    if (!topic) notFound();
    redirect(`/topics/${id}?project=${topic.project_id}`);
  }

  return <TopicDetail topicId={id} />;
}
