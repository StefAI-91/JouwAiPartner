export const dynamic = "force-dynamic";

import { Users } from "lucide-react";
import { createClient } from "@repo/database/supabase/server";
import { listNeedsGroupedByCategory } from "@repo/database/queries/needs";
import { NeedsCategoryList } from "@/components/intelligence/needs-category-list";
import { ScanNeedsButton } from "@/components/intelligence/scan-needs-button";

export default async function TeamNeedsPage() {
  const supabase = await createClient();
  const { grouped, total } = await listNeedsGroupedByCategory(supabase);

  return (
    <div className="space-y-5 px-4 pb-32 pt-6 lg:px-10">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary/60" />
            <h1 className="text-xl font-bold tracking-tight">Team Behoeftes</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {total} behoefte{total !== 1 ? "s" : ""} gedetecteerd uit team meetings
          </p>
        </div>
        <ScanNeedsButton />
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-muted-foreground/20 bg-muted/30 p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <h2 className="mt-4 text-lg font-medium text-foreground/70">Nog geen behoeftes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Klik op &ldquo;Scannen&rdquo; om bestaande team meetings te analyseren, of wacht tot
            nieuwe meetings worden goedgekeurd.
          </p>
        </div>
      ) : (
        <NeedsCategoryList groups={grouped} />
      )}
    </div>
  );
}
