export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getVerifiedMeetingById } from "@repo/database/queries/meetings";
import { listPeopleWithOrg } from "@repo/database/queries/people";
import { listOrganizations } from "@repo/database/queries/organizations";
import { listProjects } from "@repo/database/queries/projects";
import { MeetingDetailView } from "@/components/meetings/meeting-detail";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [meeting, people, organizations, projects] = await Promise.all([
    getVerifiedMeetingById(id, supabase),
    listPeopleWithOrg(supabase),
    listOrganizations(supabase),
    listProjects(supabase),
  ]);

  if (!meeting) notFound();

  return (
    <MeetingDetailView
      meeting={meeting}
      allPeople={people}
      organizations={organizations}
      projects={projects}
    />
  );
}
