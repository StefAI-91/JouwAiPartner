import { notFound } from "next/navigation";
import { getIssueById, listIssueComments, listIssueActivity } from "@repo/database/queries/issues";
import { listPeople } from "@repo/database/queries/people";
import { createClient } from "@repo/database/supabase/server";
import { IssueDetail } from "@/components/issues/issue-detail";

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [issue, comments, activities, people] = await Promise.all([
    getIssueById(id, supabase),
    listIssueComments(id, { limit: 100 }, supabase),
    listIssueActivity(id, { limit: 100 }, supabase),
    listPeople(supabase, { limit: 200 }),
  ]);

  if (!issue) notFound();

  return (
    <IssueDetail
      issue={issue}
      comments={comments}
      activities={activities}
      people={people.map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}
