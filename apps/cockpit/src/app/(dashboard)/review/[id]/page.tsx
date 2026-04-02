export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getDraftMeetingById } from "@repo/database/queries/review";
import { listPeopleWithOrg } from "@repo/database/queries/people";
import { listOrganizations } from "@repo/database/queries/organizations";
import { listProjects } from "@repo/database/queries/projects";
import { ReviewDetail } from "@/components/review/review-detail";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [meeting, people, organizations, projects] = await Promise.all([
    getDraftMeetingById(id, supabase),
    listPeopleWithOrg(supabase),
    listOrganizations(supabase),
    listProjects(supabase),
  ]);

  if (!meeting) notFound();

  return (
    <ReviewDetail
      meeting={meeting}
      allPeople={people}
      organizations={organizations}
      projects={projects}
    />
  );
}
