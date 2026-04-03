export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getDraftMeetingById } from "@repo/database/queries/review";
import { listPeopleWithOrg, listPeopleForAssignment } from "@repo/database/queries/people";
import { listOrganizations } from "@repo/database/queries/organizations";
import { listProjects } from "@repo/database/queries/projects";
import { getPromotedExtractionIds } from "@repo/database/queries/tasks";
import { ReviewDetail } from "@/components/review/review-detail";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [meeting, people, peopleForAssignment, organizations, projects] = await Promise.all([
    getDraftMeetingById(id, supabase),
    listPeopleWithOrg(supabase),
    listPeopleForAssignment(supabase),
    listOrganizations(supabase),
    listProjects(supabase),
  ]);

  if (!meeting) notFound();

  const actionItemIds = meeting.extractions
    .filter((e) => e.type === "action_item")
    .map((e) => e.id);
  const promotedIds = await getPromotedExtractionIds(actionItemIds, supabase);

  return (
    <ReviewDetail
      meeting={meeting}
      allPeople={people}
      organizations={organizations}
      projects={projects}
      promotedExtractionIds={Array.from(promotedIds)}
      peopleForAssignment={peopleForAssignment}
    />
  );
}
