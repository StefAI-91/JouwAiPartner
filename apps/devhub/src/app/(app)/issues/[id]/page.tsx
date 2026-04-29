import { notFound, redirect } from "next/navigation";
import { getIssueById } from "@repo/database/queries/issues";
import { listIssueComments } from "@repo/database/queries/issues/comments";
import { listIssueActivity } from "@repo/database/queries/issues/activity";
import { listIssueAttachments } from "@repo/database/queries/issues/attachments";
import { listTeamMembers } from "@repo/database/queries/team";
import { getTopicMembershipForIssues, listTopics } from "@repo/database/queries/topics";
import { createPageClient, getAuthenticatedUser } from "@repo/auth/helpers";
import { assertProjectAccess, NotAuthorizedError } from "@repo/auth/access";
import { IssueDetail } from "@/features/issues/components/issue-detail";

export default async function IssueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
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

  // Houd `?project=` consistent — zonder query forceert de ProjectSwitcher
  // anders een reset naar het alfabetisch eerste project. Hetzelfde patroon
  // als /topics/[id]/page.tsx.
  if (sp.project !== issue.project_id) {
    redirect(`/issues/${id}?project=${issue.project_id}`);
  }

  const [comments, activities, members, attachments, topicMembership, projectTopics] =
    await Promise.all([
      listIssueComments(id, { limit: 100 }, supabase),
      listIssueActivity(id, { limit: 100 }, supabase),
      listTeamMembers(supabase),
      listIssueAttachments(id, supabase),
      getTopicMembershipForIssues([id], supabase),
      listTopics(issue.project_id, {}, supabase),
    ]);

  const assignees = members.map((m) => ({
    id: m.id,
    name: m.full_name?.trim() || m.email,
  }));

  const currentTopic = topicMembership.get(id) ?? null;
  const topics = projectTopics.map((t) => ({ id: t.id, title: t.title }));

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
      currentTopic={currentTopic}
      topics={topics}
    />
  );
}
