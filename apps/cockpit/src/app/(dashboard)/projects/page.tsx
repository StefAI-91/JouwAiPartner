export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import { listProjects } from "@repo/database/queries/projects";
import { listOrganizations } from "@repo/database/queries/organizations";
import { ProjectsList } from "@/features/projects/components/projects-list";
import { AddProjectButton } from "@/features/projects/components/add-project-button";
import { FolderKanban } from "lucide-react";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const [projects, organizations] = await Promise.all([
    listProjects(supabase),
    listOrganizations(supabase),
  ]);

  const orgOptions = organizations.map((o) => ({ id: o.id, name: o.name }));

  if (projects.length === 0) {
    return (
      <div className="px-4 py-16 text-center lg:px-10">
        <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h2 className="mt-4 font-heading text-xl font-semibold">No projects yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Projects will appear here once meetings are linked to them.
        </p>
        <div className="mt-6">
          <AddProjectButton organizations={orgOptions} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-8 lg:px-10">
      <div className="flex items-center justify-between gap-4">
        <h1>Projects</h1>
        <AddProjectButton organizations={orgOptions} />
      </div>

      <ProjectsList projects={projects} />
    </div>
  );
}
