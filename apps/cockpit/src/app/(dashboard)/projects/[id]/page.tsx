export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getProjectById } from "@repo/database/queries/projects";
import { getSegmentsByProjectId } from "@repo/database/queries/meetings/project-summaries";
import { listOrganizations } from "@repo/database/queries/organizations";
import { listPeople } from "@repo/database/queries/people";
import { ExternalLink } from "lucide-react";
import { ProjectSections } from "@/components/projects/project-sections";
import { EditProject } from "@/components/projects/edit-project";
import { RegenerateSummaryButton } from "@/components/projects/regenerate-summary-button";
import { ProjectTimeline } from "@/components/projects/project-timeline";
import { extractProjectTimeline } from "@repo/ai/validations/project-summary";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [project, segments, organizations, people] = await Promise.all([
    getProjectById(id, supabase),
    getSegmentsByProjectId(id, supabase),
    listOrganizations(supabase),
    listPeople(supabase),
  ]);

  if (!project) notFound();

  // Gevalideerde timeline uit briefing.structured_content (lege array als corrupt).
  // Schema-default vangt entries van vóór de email-uitbreiding op (source_type='meeting').
  const timeline = extractProjectTimeline(project.briefing_summary?.structured_content);

  return (
    <div className="px-4 py-8 lg:px-10">
      {/* Header */}
      <div className="mb-8">
        {project.organization && (
          <p className="text-sm font-medium text-foreground/70">{project.organization.name}</p>
        )}
        <div className="flex items-center gap-2">
          <h1>{project.name}</h1>
          <EditProject
            project={project}
            organizationId={project.organization_id}
            organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
            people={people.map((p) => ({ id: p.id, name: p.name }))}
          />
        </div>
        {project.github_url && (
          <a
            href={project.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="size-3.5" />
            {project.github_url.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
          </a>
        )}
      </div>

      {timeline.length > 0 && (
        <div className="mb-6 space-y-4">
          <ProjectTimeline timeline={timeline} />
          <div className="flex justify-end">
            <RegenerateSummaryButton entityType="project" entityId={project.id} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <ProjectSections
        meetings={project.meetings}
        emails={project.emails}
        extractions={project.extractions}
        emailExtractions={project.email_extractions}
        segments={segments}
      />
    </div>
  );
}
