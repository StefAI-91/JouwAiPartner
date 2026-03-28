import { listRecentDecisions } from "@/lib/queries/decisions";
import { listOpenActionItems } from "@/lib/queries/action-items";
import { listRecentMeetings } from "@/lib/queries/meetings";
import { DecisionsCard } from "@/components/dashboard/decisions-card";
import { ActionItemsCard } from "@/components/dashboard/action-items-card";
import { MeetingsCard } from "@/components/dashboard/meetings-card";

export default async function DashboardPage() {
  const [decisions, actionItems, meetings] = await Promise.all([
    listRecentDecisions(5),
    listOpenActionItems(5),
    listRecentMeetings(5),
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
