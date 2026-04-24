import { listTeamMembers } from "@repo/database/queries/team";
import { createPageClient } from "@repo/auth/helpers";
import { IssueForm } from "@/features/issues/components/issue-form";

export default async function NewIssuePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const params = await searchParams;
  const projectId = params.project ?? null;
  const supabase = await createPageClient();
  const members = await listTeamMembers(supabase);

  const assignees = members.map((m) => ({
    id: m.id,
    name: m.full_name?.trim() || m.email,
  }));

  return <IssueForm projectId={projectId} people={assignees} />;
}
