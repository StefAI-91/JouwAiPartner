import { notFound, redirect } from "next/navigation";
import { createPageClient, getAuthenticatedUser } from "@repo/auth/helpers";
import { listAccessibleProjectIds } from "@repo/auth/access";
import { getTopicById } from "@repo/database/queries/topics";
import type { TopicType } from "@repo/database/constants/topics";
import { TopicForm } from "@/features/topics/components/topic-form";

export default async function EditTopicPage({
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

  const supabase = await createPageClient();
  const topic = await getTopicById(id, supabase);
  if (!topic) notFound();

  const accessibleIds = await listAccessibleProjectIds(user.id, supabase);
  if (!accessibleIds.includes(topic.project_id)) notFound();

  // Houd `?project=` consistent — zie comment in /topics/[id]/page.tsx.
  if (sp.project !== topic.project_id) {
    redirect(`/topics/${id}/edit?project=${topic.project_id}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Topic bewerken</h1>
        <p className="text-sm text-muted-foreground">
          Status muteer je via de detail-pagina — hier alleen titel, beschrijving, etc.
        </p>
      </header>
      <TopicForm
        projectId={topic.project_id}
        initial={{
          id: topic.id,
          title: topic.title,
          type: topic.type as TopicType,
          priority: topic.priority,
          target_sprint_id: topic.target_sprint_id,
          client_title: topic.client_title,
          description: topic.description,
          client_description: topic.client_description,
        }}
      />
    </div>
  );
}
