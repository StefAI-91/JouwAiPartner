import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { listAccessibleProjects } from "@repo/database/queries/project-access";
import { getAuthenticatedUser, createPageClient } from "@repo/auth/helpers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, supabase] = await Promise.all([getAuthenticatedUser(), createPageClient()]);

  const projects = await listAccessibleProjects(user?.id ?? "", supabase);

  const userEmail = user?.email ?? null;
  const userFullName =
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ?? null;

  return (
    <div className="flex min-h-screen flex-1">
      <Suspense
        fallback={
          <div className="hidden w-56 border-r border-sidebar-border bg-sidebar lg:block" />
        }
      >
        <AppSidebar userEmail={userEmail} userFullName={userFullName} />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense
          fallback={
            <div className="sticky top-0 z-20 h-14 shrink-0 border-b border-border bg-background" />
          }
        >
          <TopBar projects={projects} userEmail={userEmail} userFullName={userFullName} />
        </Suspense>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
