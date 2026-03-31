export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getProjectById } from "@repo/database/queries/projects";
import { StatusPipeline } from "@/components/projects/status-pipeline";
import { ProjectSections } from "@/components/projects/project-sections";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const project = await getProjectById(id, supabase);

  if (!project) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        {project.organization && (
          <p className="text-sm font-medium text-foreground/70">{project.organization.name}</p>
        )}
        <h1 className="mt-1">{project.name}</h1>
        <div className="mt-3">
          <StatusPipeline status={project.status} size="lg" />
        </div>
      </div>

      {/* Sections */}
      <ProjectSections meetings={project.meetings} extractions={project.extractions} />
    </div>
  );
}
