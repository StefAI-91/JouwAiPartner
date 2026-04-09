import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { createClient } from "@repo/database/supabase/server";
import { listAccessibleProjects } from "@repo/database/queries/project-access";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
