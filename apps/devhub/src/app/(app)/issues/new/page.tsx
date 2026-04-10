import { listPeople } from "@repo/database/queries/people";
import { createPageClient } from "@repo/auth/helpers";
import { IssueForm } from "@/components/issues/issue-form";

export default async function NewIssuePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const params = await searchParams;
  const projectId = params.project ?? null;
  const supabase = await createPageClient();
  const people = await listPeople(supabase, { limit: 200 });

  return (
    <IssueForm projectId={projectId} people={people.map((p) => ({ id: p.id, name: p.name }))} />
  );
}
