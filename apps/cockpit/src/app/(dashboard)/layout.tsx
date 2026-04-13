import { createClient } from "@repo/database/supabase/server";
import { getReviewQueueCount } from "@repo/database/queries/dashboard";
import { listFocusProjects } from "@repo/database/queries/projects";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { SideMenu } from "@/components/layout/side-menu";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [reviewCount, focusProjects, user] = await Promise.all([
    getReviewQueueCount(supabase),
    listFocusProjects(supabase),
    getAuthenticatedUser(),
  ]);

  const userEmail = user?.email ?? null;
  const userFullName =
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ?? null;

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — hidden on mobile */}
      <DesktopSidebar
        reviewCount={reviewCount}
        focusProjects={focusProjects}
        userEmail={userEmail}
        userFullName={userFullName}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Mobile header — hidden on desktop */}
        <header className="flex h-14 items-center gap-3 border-b border-border/50 bg-white/60 px-4 backdrop-blur-sm lg:hidden">
          <SideMenu
            reviewCount={reviewCount}
            focusProjects={focusProjects}
            userEmail={userEmail}
            userFullName={userFullName}
          />
          <img
            src="https://gattprzzbpnyygzgzvxg.supabase.co/storage/v1/object/public/Public/images/679a9066567ec01242301e4d_jap_logo_zwart_gradient.svg"
            alt="Jouw AI Partner"
            className="h-7 w-auto"
          />
          <span className="font-heading text-sm font-semibold text-primary">
            Knowledge Platform
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
