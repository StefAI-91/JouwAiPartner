import { notFound, redirect } from "next/navigation";
import {
  getIssueById,
  listIssueComments,
  listIssueActivity,
  listIssueAttachments,
} from "@repo/database/queries/issues";
import { listPeople } from "@repo/database/queries/people";
import { createPageClient, getAuthenticatedUser } from "@repo/auth/helpers";
import { assertProjectAccess, NotAuthorizedError } from "@repo/auth/access";
import { IssueDetail } from "@/components/issues/issue-detail";

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

  const [comments, activities, people, attachments] = await Promise.all([
    listIssueComments(id, { limit: 100 }, supabase),
    listIssueActivity(id, { limit: 100 }, supabase),
    listPeople(supabase, { limit: 200 }),
    listIssueAttachments(id, supabase),
  ]);

  return (
    <IssueDetail
      issue={issue}
      comments={comments}
      activities={activities}
      people={people.map((p) => ({ id: p.id, name: p.name }))}
      attachments={attachments}
    />
  );
}
