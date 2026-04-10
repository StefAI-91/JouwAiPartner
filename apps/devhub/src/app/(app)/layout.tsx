import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { listAccessibleProjects } from "@repo/database/queries/project-access";
import { getAuthenticatedUser, createPageClient } from "@repo/auth/helpers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, supabase] = await Promise.all([getAuthenticatedUser(), createPageClient()]);

  const projects = await listAccessibleProjects(user?.id ?? "", supabase);

  return (
    <div className="flex h-full">
      <Suspense>
        <AppSidebar />
      </Suspense>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Suspense>
          <TopBar projects={projects} />
        </Suspense>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
