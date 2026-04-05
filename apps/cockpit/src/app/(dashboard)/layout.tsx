import { createClient } from "@repo/database/supabase/server";
import { getReviewQueueCount } from "@repo/database/queries/dashboard";
import { SideMenu } from "@/components/layout/side-menu";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const reviewCount = await getReviewQueueCount(supabase);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header with menu trigger */}
      <header className="flex h-16 items-center gap-3 border-b border-border/50 bg-white/60 px-4 backdrop-blur-sm">
        <SideMenu reviewCount={reviewCount} />
        <img
          src="https://gattprzzbpnyygzgzvxg.supabase.co/storage/v1/object/public/Public/images/679a9066567ec01242301e4d_jap_logo_zwart_gradient.svg"
          alt="Jouw AI Partner"
          className="h-8 w-auto"
        />
        <span className="font-heading text-base font-semibold text-primary">
          Knowledge Platform
        </span>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
