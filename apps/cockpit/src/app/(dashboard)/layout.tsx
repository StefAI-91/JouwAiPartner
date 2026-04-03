import { createClient } from "@repo/database/supabase/server";
import { getReviewQueueCount } from "@repo/database/queries/dashboard";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const reviewCount = await getReviewQueueCount(supabase);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Mobile header */}
      <header className="flex h-14 items-center gap-2.5 border-b border-border/50 bg-white/60 px-4 backdrop-blur-sm">
        <img
          src="https://gattprzzbpnyygzgzvxg.supabase.co/storage/v1/object/public/Public/images/679a9066567ec01242301e4d_jap_logo_zwart_gradient.svg"
          alt="Jouw AI Partner"
          className="h-6 w-auto"
        />
        <span className="font-heading text-sm font-semibold text-primary">
          Knowledge Platform
        </span>
      </header>

      {/* Page content — extra bottom padding for nav bar */}
      <main className="flex-1 pb-28">{children}</main>

      {/* Bottom navigation */}
      <BottomNav reviewCount={reviewCount} />
    </div>
  );
}
