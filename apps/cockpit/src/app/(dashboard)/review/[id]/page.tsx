export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getDraftMeetingById } from "@repo/database/queries/review";
import { listPeopleWithOrg, listPeopleForAssignment } from "@repo/database/queries/people";
import { listOrganizations } from "@repo/database/queries/organizations";
import { listProjects } from "@repo/database/queries/projects";
import { getPromotedExtractionIds } from "@repo/database/queries/tasks";
import { getSegmentsByMeetingId } from "@repo/database/queries/meetings/project-summaries";
import { listProposedThemesForMeeting } from "@repo/database/queries/themes";
import { ReviewDetail } from "@/components/review/review-detail";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [meeting, people, peopleForAssignment, organizations, projects, segments, proposals] =
    await Promise.all([
      getDraftMeetingById(id, supabase),
      listPeopleWithOrg(supabase),
      listPeopleForAssignment(supabase),
      listOrganizations(supabase),
      listProjects(supabase),
      getSegmentsByMeetingId(id, supabase),
      listProposedThemesForMeeting(id, supabase),
    ]);

  if (!meeting) notFound();

  const actionItemIds = meeting.extractions
    .filter((e) => e.type === "action_item")
    .map((e) => e.id);
  const promotedIds = await getPromotedExtractionIds(actionItemIds, supabase);

  return (
    <div>
      <div className="border-b border-border/50 px-6 py-2">
        <Link
          href="/review"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Terug naar review
        </Link>
      </div>
      <ReviewDetail
        meeting={meeting}
        allPeople={people}
        organizations={organizations}
        projects={projects}
        promotedExtractionIds={Array.from(promotedIds)}
        peopleForAssignment={peopleForAssignment}
        segments={segments}
        proposedThemes={proposals.map((p) => ({
          id: p.id,
          name: p.name,
          emoji: p.emoji,
          description: p.description,
          matching_guide: p.matching_guide,
          status: p.status,
        }))}
      />
    </div>
  );
}
