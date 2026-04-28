import { redirect } from "next/navigation";
import { z } from "zod";
import { createPageClient, getAuthenticatedUser } from "@repo/auth/helpers";
import { listAccessibleProjectIds } from "@repo/auth/access";
import { TOPIC_LIFECYCLE_STATUSES, TOPIC_TYPES } from "@repo/database/constants/topics";
import { TopicList } from "@/features/topics/components/topic-list";

const searchParamsSchema = z.object({
  project: z.string().uuid().optional(),
  type: z.enum(TOPIC_TYPES).optional(),
  status: z.enum(TOPIC_LIFECYCLE_STATUSES).optional(),
});

export default async function TopicsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = searchParamsSchema.safeParse(raw);
  const params = parsed.success ? parsed.data : searchParamsSchema.parse({});

  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const supabase = await createPageClient();
  const accessibleIds = await listAccessibleProjectIds(user.id, supabase);

  if (accessibleIds.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="max-w-md text-center text-sm text-muted-foreground">
          Je hebt nog geen toegang tot projecten. Vraag een admin om je toe te voegen.
        </p>
      </div>
    );
  }

  if (!params.project) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          Selecteer een project om topics te bekijken.
        </p>
      </div>
    );
  }

  if (!accessibleIds.includes(params.project)) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Geen topics gevonden voor dit project.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-xl font-semibold tracking-tight">Topics</h1>
      <TopicList
        projectId={params.project}
        filters={{ type: params.type, status: params.status }}
      />
    </div>
  );
}
