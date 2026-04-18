import { createPageClient, getAuthenticatedUser } from "@repo/auth/helpers";
import { listPortalProjectsWithDetails } from "@repo/database/queries/portal";
import { AppSidebarClient } from "./app-sidebar-client";

export async function AppSidebar() {
  const user = await getAuthenticatedUser();
  let projects: { id: string; name: string }[] = [];

  if (user) {
    const supabase = await createPageClient();
    const rows = await listPortalProjectsWithDetails(user.id, supabase);
    projects = rows.map((p) => ({ id: p.id, name: p.name }));
  }

  return <AppSidebarClient projects={projects} />;
}
