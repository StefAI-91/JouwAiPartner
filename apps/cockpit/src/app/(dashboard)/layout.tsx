import { createClient } from "@repo/database/supabase/server";
import { BottomNav } from "@/components/layout/bottom-nav";

async function getReviewCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .eq("verification_status", "draft");
  return count ?? 0;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const reviewCount = await getReviewCount();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Mobile header */}
      <header className="flex h-14 items-center border-b border-border/50 bg-white/60 px-4 backdrop-blur-sm">
        <span className="font-heading text-sm font-semibold text-[#006B3F]">
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
