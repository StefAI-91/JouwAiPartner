import { redirect } from "next/navigation";
import { FolderKanban } from "lucide-react";
import { createPageClient, getAuthenticatedUser } from "@repo/auth/helpers";
import { listPortalProjectsWithDetails } from "@repo/database/queries/portal";
import { ProjectCard } from "@/components/projects/project-card";

export default async function PortalHomePage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const supabase = await createPageClient();
  const projects = await listPortalProjectsWithDetails(user.id, supabase);

  if (projects.length === 1) {
    redirect(`/projects/${projects[0].id}`);
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FolderKanban className="size-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl">Geen projecten gekoppeld</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Je account heeft nog geen toegang tot projecten. Neem contact op met Jouw AI Partner om
            dit te regelen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Jouw projecten</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kies een project om de voortgang en recente activiteit te bekijken.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
