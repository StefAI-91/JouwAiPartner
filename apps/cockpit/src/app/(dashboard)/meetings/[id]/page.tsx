export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getVerifiedMeetingById } from "@repo/database/queries/meetings";
import { listPeopleWithOrg, listPeopleForAssignment } from "@repo/database/queries/people";
import { listOrganizations } from "@repo/database/queries/organizations";
import { listProjects } from "@repo/database/queries/projects";
import { getPromotedExtractionIds } from "@repo/database/queries/tasks";
import { getSegmentsByMeetingId } from "@repo/database/queries/meetings/project-summaries";
import { MeetingDetailView } from "@/features/meetings/components/meeting-detail";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [meeting, people, peopleForAssignment, organizations, projects, segments] =
    await Promise.all([
      getVerifiedMeetingById(id, supabase),
      listPeopleWithOrg(supabase),
      listPeopleForAssignment(supabase),
      listOrganizations(supabase),
      listProjects(supabase),
      getSegmentsByMeetingId(id, supabase),
    ]);

  if (!meeting) notFound();

  const actionItemIds = meeting.extractions
    .filter((e) => e.type === "action_item")
    .map((e) => e.id);
  const promotedIds = await getPromotedExtractionIds(actionItemIds, supabase);

  return (
    <MeetingDetailView
      meeting={meeting}
      allPeople={people}
      organizations={organizations}
      projects={projects}
      promotedExtractionIds={Array.from(promotedIds)}
      peopleForAssignment={peopleForAssignment}
      segments={segments}
    />
  );
}
