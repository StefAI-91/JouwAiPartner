export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import { listRecentDecisions } from "@repo/database/queries/decisions";
import { listOpenActionItems } from "@repo/database/queries/action-items";
import { listRecentMeetings } from "@repo/database/queries/meetings";
import { DecisionsCard } from "@/components/dashboard/decisions-card";
import { ActionItemsCard } from "@/components/dashboard/action-items-card";
import { MeetingsCard } from "@/components/dashboard/meetings-card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const [decisions, actionItems, meetings] = await Promise.all([
    listRecentDecisions(5, supabase),
    listOpenActionItems(5, supabase),
    listRecentMeetings(5, supabase),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Page header */}
      <div>
        <h1>Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overzicht van recente activiteit in het platform.
        </p>
      </div>

      {/* Three content sections */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <DecisionsCard decisions={decisions} />
        <ActionItemsCard items={actionItems} />
        <MeetingsCard meetings={meetings} />
      </div>
    </div>
  );
}
