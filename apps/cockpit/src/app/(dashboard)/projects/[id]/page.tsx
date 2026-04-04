export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getProjectById } from "@repo/database/queries/projects";
import { getLatestSummary } from "@repo/database/queries/summaries";
import { listOrganizations } from "@repo/database/queries/organizations";
import { listPeople } from "@repo/database/queries/people";
import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectSummary } from "@/components/projects/project-summary";
import { ProjectBriefing } from "@/components/projects/project-briefing";
import { OrgProfile } from "@/components/projects/org-profile";
import { ActionItemsList } from "@/components/projects/action-items-list";
import { DecisionsList } from "@/components/projects/decisions-list";
import { NeedsList } from "@/components/projects/needs-list";
import { MeetingsList } from "@/components/projects/meetings-list";
import { EditProject } from "@/components/projects/edit-project";
import { RegenerateSummaryButton } from "@/components/projects/regenerate-summary-button";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [project, organizations, people] = await Promise.all([
    getProjectById(id, supabase),
    listOrganizations(supabase),
    listPeople(supabase),
  ]);

  if (!project) notFound();

  // Get org summary if project has an organization
  let orgSummary: { content: string; created_at: string } | null = null;
  if (project.organization_id) {
    const summary = await getLatestSummary("organization", project.organization_id, "context", supabase);
    if (summary) {
      orgSummary = { content: summary.content, created_at: summary.created_at };
    }
  }

  // Split extractions by type (only verified ones)
  const verifiedExtractions = project.extractions;
  const actionItems = verifiedExtractions.filter((e) => e.type === "action_item");
  const decisions = verifiedExtractions.filter((e) => e.type === "decision");
  const needs = verifiedExtractions.filter((e) => e.type === "need");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header with edit button */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <ProjectHeader
            name={project.name}
            organizationName={project.organization?.name ?? null}
            status={project.status}
            ownerName={project.owner?.name ?? null}
            contactPersonName={project.contact_person?.name ?? null}
            startDate={project.start_date}
            deadline={project.deadline}
          />
        </div>
        <EditProject
          project={project}
          organizationId={project.organization_id}
          organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
          people={people.map((p) => ({ id: p.id, name: p.name }))}
        />
      </div>

      {/* Regenerate summary button */}
      <div className="mb-4 flex justify-end">
        <RegenerateSummaryButton entityType="project" entityId={project.id} />
      </div>

      {/* AI Project Summary */}
      <ProjectSummary
        content={project.context_summary?.content ?? null}
        version={project.context_summary?.version}
        createdAt={project.context_summary?.created_at}
      />

      {/* AI Briefing */}
      <ProjectBriefing
        content={project.briefing_summary?.content ?? null}
        createdAt={project.briefing_summary?.created_at}
      />

      {/* Organization Profile (collapsible) */}
      {project.organization && (
        <OrgProfile
          organizationName={project.organization.name}
          summaryContent={orgSummary?.content ?? null}
          summaryCreatedAt={orgSummary?.created_at ?? null}
        />
      )}

      {/* Action Items */}
      <ActionItemsList items={actionItems} />

      {/* Decisions */}
      <DecisionsList items={decisions} />

      {/* Open Needs */}
      <NeedsList items={needs} />

      {/* Meetings */}
      <MeetingsList meetings={project.meetings} />
    </div>
  );
}
