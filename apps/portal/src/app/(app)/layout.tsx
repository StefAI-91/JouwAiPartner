import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { getAuthenticatedUser } from "@repo/auth/helpers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();

  return (
    <div className="flex min-h-screen flex-1">
      <Suspense
        fallback={
          <div className="hidden w-56 border-r border-sidebar-border bg-sidebar lg:block" />
        }
      >
        <AppSidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar email={user?.email ?? null} />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
