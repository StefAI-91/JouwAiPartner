export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import { listProjects } from "@repo/database/queries/projects";
import { listOrganizations } from "@repo/database/queries/organizations";
import { ProjectCard } from "@/components/projects/project-card";
import { AddProjectButton } from "@/components/projects/add-project-button";
import { FolderKanban } from "lucide-react";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const [projects, organizations] = await Promise.all([
    listProjects(supabase),
    listOrganizations(supabase),
  ]);

  if (projects.length === 0) {
    return (
      <div className="px-4 py-16 text-center lg:px-10">
        <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h2 className="mt-4 font-heading text-xl font-semibold">No projects yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Projects will appear here once meetings are linked to them.
        </p>
        <div className="mt-6">
          <AddProjectButton
            organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-8 lg:px-10">
      <div className="flex items-center justify-between">
        <div>
          <h1>Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AddProjectButton organizations={organizations.map((o) => ({ id: o.id, name: o.name }))} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
