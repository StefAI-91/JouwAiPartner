import { notFound } from "next/navigation";
import { createPageClient } from "@repo/auth/helpers";
import { getPortalIssue } from "@repo/database/queries/portal";
import { IssueDetail } from "@/components/issues/issue-detail";

export default async function ProjectIssueDetailPage({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const { id, issueId } = await params;

  const supabase = await createPageClient();
  const issue = await getPortalIssue(issueId, id, supabase);

  if (!issue) notFound();

  return (
    <div className="flex flex-1 flex-col gap-5 px-6 py-8">
      <IssueDetail projectId={id} issue={issue} />
    </div>
  );
}
