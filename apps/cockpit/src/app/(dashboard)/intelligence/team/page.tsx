export const dynamic = "force-dynamic";

import { Users } from "lucide-react";
import { createClient } from "@repo/database/supabase/server";
import { listNeedsGroupedByCategory } from "@repo/database/queries/needs";
import { NeedsCategoryList } from "@/components/intelligence/needs-category-list";

export default async function TeamNeedsPage() {
  const supabase = await createClient();
  const { grouped, total } = await listNeedsGroupedByCategory(supabase);

  if (total === 0) {
    return (
      <div className="px-4 py-16 text-center lg:px-10">
        <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h2 className="mt-4 font-heading text-xl font-semibold">Nog geen behoeftes</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Behoeftes worden automatisch gedetecteerd wanneer team meetings worden goedgekeurd.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 pb-32 pt-6 lg:px-10">
      <div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary/60" />
          <h1 className="text-xl font-bold tracking-tight">Team Behoeftes</h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {total} behoefte{total !== 1 ? "s" : ""} gedetecteerd uit team meetings
        </p>
      </div>

      <NeedsCategoryList groups={grouped} />
    </div>
  );
}
