export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getProjectById } from "@repo/database/queries/projects";
import { getSegmentsByProjectId } from "@repo/database/queries/meeting-project-summaries";
import { listOrganizations } from "@repo/database/queries/organizations";
import { listPeople } from "@repo/database/queries/people";
import { ExternalLink } from "lucide-react";
import { StatusPipeline } from "@/components/projects/status-pipeline";
import { ProjectSections } from "@/components/projects/project-sections";
import { ProjectSummary } from "@/components/projects/project-summary";
import { ProjectBriefing } from "@/components/projects/project-briefing";
import { EditProject } from "@/components/projects/edit-project";
import { RegenerateSummaryButton } from "@/components/projects/regenerate-summary-button";
import { ProjectTimeline } from "@/components/projects/project-timeline";

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

  // Extract timeline from briefing structured_content
  const structuredContent = project.briefing_summary?.structured_content;
  const timeline =
    structuredContent && Array.isArray((structuredContent as Record<string, unknown>).timeline)
      ? ((structuredContent as Record<string, unknown>).timeline as {
          date: string;
          meeting_type: string;
          title: string;
          summary: string;
          key_decisions: string[];
          open_actions: string[];
        }[])
      : [];

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
        <div className="mt-3">
          <StatusPipeline status={project.status} size="lg" />
        </div>
      </div>

      {/* AI Summaries */}
      <div className="mb-6 space-y-4">
        <ProjectSummary
          content={project.context_summary?.content ?? null}
          version={project.context_summary?.version}
          createdAt={project.context_summary?.created_at}
        />
        <ProjectBriefing
          content={project.briefing_summary?.content ?? null}
          createdAt={project.briefing_summary?.created_at}
        />
        {timeline.length > 0 && <ProjectTimeline timeline={timeline} />}
        <div className="flex justify-end">
          <RegenerateSummaryButton entityType="project" entityId={project.id} />
        </div>
      </div>

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
