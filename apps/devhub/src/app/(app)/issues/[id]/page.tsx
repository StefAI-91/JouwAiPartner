import { notFound, redirect } from "next/navigation";
import { getIssueById } from "@repo/database/queries/issues";
import { listIssueComments } from "@repo/database/queries/issues/comments";
import { listIssueActivity } from "@repo/database/queries/issues/activity";
import { listIssueAttachments } from "@repo/database/queries/issues/attachments";
import { listTeamMembers } from "@repo/database/queries/team";
import { createPageClient, getAuthenticatedUser } from "@repo/auth/helpers";
import { assertProjectAccess, NotAuthorizedError } from "@repo/auth/access";
import { IssueDetail } from "@/features/issues/components/issue-detail";

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, supabase] = await Promise.all([getAuthenticatedUser(), createPageClient()]);
  if (!user) redirect("/login");

  const issue = await getIssueById(id, supabase);
  if (!issue) notFound();

  try {
    await assertProjectAccess(user.id, issue.project_id, supabase);
  } catch (e) {
    // 404 rather than 403 so we don't leak the existence of inaccessible issues.
    if (e instanceof NotAuthorizedError) notFound();
    throw e;
  }

  const [comments, activities, members, attachments] = await Promise.all([
    listIssueComments(id, { limit: 100 }, supabase),
    listIssueActivity(id, { limit: 100 }, supabase),
    listTeamMembers(supabase),
    listIssueAttachments(id, supabase),
  ]);

  const assignees = members.map((m) => ({
    id: m.id,
    name: m.full_name?.trim() || m.email,
  }));

  const currentMember = members.find((m) => m.id === user.id);
  const currentUser = currentMember
    ? { id: currentMember.id, name: currentMember.full_name?.trim() || currentMember.email }
    : null;

  return (
    <IssueDetail
      issue={issue}
      comments={comments}
      activities={activities}
      people={assignees}
      attachments={attachments}
      currentUser={currentUser}
    />
  );
}
