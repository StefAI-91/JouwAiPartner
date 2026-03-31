export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import { listProjects } from "@repo/database/queries/projects";
import { ProjectCard } from "@/components/projects/project-card";
import { FolderKanban } from "lucide-react";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const projects = await listProjects(supabase);

  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h2 className="mt-4 font-heading text-xl font-semibold">No projects yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Projects will appear here once meetings are linked to them.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1>Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
