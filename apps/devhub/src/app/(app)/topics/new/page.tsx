import { redirect } from "next/navigation";
import { z } from "zod";
import { createPageClient, getAuthenticatedUser } from "@repo/auth/helpers";
import { listAccessibleProjectIds } from "@repo/auth/access";
import { TopicForm } from "@/features/topics/components/topic-form";

const searchSchema = z.object({ project: z.string().uuid().optional() });

export default async function NewTopicPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const parsed = searchSchema.safeParse(await searchParams);
  const projectId = parsed.success ? parsed.data.project : undefined;

  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  if (!projectId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          Open dit scherm vanuit een project — &lsquo;?project=&lt;id&gt;&rsquo; ontbreekt.
        </p>
      </div>
    );
  }

  const supabase = await createPageClient();
  const accessibleIds = await listAccessibleProjectIds(user.id, supabase);
  if (!accessibleIds.includes(projectId)) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Geen toegang tot dit project.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Nieuw topic</h1>
        <p className="text-sm text-muted-foreground">
          Maak een topic aan om losse issues te bundelen tot één klant-zichtbaar item.
        </p>
      </header>
      <TopicForm projectId={projectId} />
    </div>
  );
}
