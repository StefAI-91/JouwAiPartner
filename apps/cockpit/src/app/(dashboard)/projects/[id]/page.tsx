export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getProjectById } from "@repo/database/queries/projects";
import { listOrganizations } from "@repo/database/queries/organizations";
import { StatusPipeline } from "@/components/projects/status-pipeline";
import { ProjectSections } from "@/components/projects/project-sections";
import { EditProject } from "@/components/projects/edit-project";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [project, organizations] = await Promise.all([
    getProjectById(id, supabase),
    listOrganizations(supabase),
  ]);

  if (!project) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
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
          />
        </div>
        <div className="mt-3">
          <StatusPipeline status={project.status} size="lg" />
        </div>
      </div>

      {/* Sections */}
      <ProjectSections meetings={project.meetings} extractions={project.extractions} />
    </div>
  );
}
