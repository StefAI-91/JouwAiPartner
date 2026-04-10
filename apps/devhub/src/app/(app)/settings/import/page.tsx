import { createPageClient } from "@repo/auth/helpers";
import { getSyncStatus } from "@/actions/import";
import { SyncCard } from "./sync-card";

export default async function ImportPage() {
  const supabase = await createPageClient();

  // Get the project with userback_project_id
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, userback_project_id")
    .eq("userback_project_id", "127499")
    .single();

  if (!project) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-lg font-semibold">Import</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Geen project gevonden met Userback koppeling (project ID: 127499). Stel eerst{" "}
          <code>userback_project_id</code> in op een project.
        </p>
      </div>
    );
  }

  const status = await getSyncStatus(project.id);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-lg font-semibold">Import</h1>
      <p className="mt-1 text-sm text-muted-foreground">Importeer feedback uit externe bronnen.</p>

      <div className="mt-6">
        <SyncCard
          projectId={project.id}
          projectName={project.name}
          userbackProjectId={project.userback_project_id!}
          itemCount={status.itemCount}
          lastSyncCursor={status.lastSyncCursor}
        />
      </div>
    </div>
  );
}
