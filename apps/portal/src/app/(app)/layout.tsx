import { createPageClient, getAuthenticatedUser } from "@repo/auth/helpers";
import { listPortalProjectsWithDetails } from "@repo/database/queries/portal";
import { AppSidebarClient } from "@/components/layout/app-sidebar-client";
import { MobileNavDrawer, MobileNavProvider } from "@/components/layout/mobile-nav";
import { TopBar } from "@/components/layout/top-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();

  let projects: { id: string; name: string }[] = [];
  if (user) {
    const supabase = await createPageClient();
    const rows = await listPortalProjectsWithDetails(user.id, supabase);
    projects = rows.map((p) => ({ id: p.id, name: p.name }));
  }

  return (
    <MobileNavProvider>
      <div className="flex min-h-screen flex-1">
        <AppSidebarClient projects={projects} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar email={user?.email ?? null} projects={projects} />
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
      </div>
      <MobileNavDrawer projects={projects} />
    </MobileNavProvider>
  );
}
