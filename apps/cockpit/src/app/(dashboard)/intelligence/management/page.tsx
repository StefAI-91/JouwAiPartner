export const dynamic = "force-dynamic";

import { Crown } from "lucide-react";
import { createClient } from "@repo/database/supabase/server";
import { listBoardMeetings } from "@repo/database/queries/meetings";
import {
  getManagementInsights,
  getDismissedInsightKeys,
} from "@repo/database/queries/management-insights";
import { ManagementInsightsOutputSchema } from "@repo/ai/validations/management-insights";
import { BoardMeetingCard } from "@/components/intelligence/board-meeting-card";
import { ManagementInsightsPanel } from "@/components/intelligence/management-insights-panel";
import { GenerateInsightsButton } from "@/components/intelligence/generate-insights-button";

export default async function ManagementPage() {
  const supabase = await createClient();

  const [
    { data: meetings, total },
    insightsRow,
    {
      data: { user },
    },
  ] = await Promise.all([
    listBoardMeetings(supabase, { limit: 20 }),
    getManagementInsights(supabase),
    supabase.auth.getUser(),
  ]);

  const dismissedKeys = user ? await getDismissedInsightKeys(supabase, user.id) : [];

  const parsed = insightsRow?.structured_content
    ? ManagementInsightsOutputSchema.safeParse(insightsRow.structured_content)
    : null;
  const insights = parsed?.success ? parsed.data : null;

  return (
    <div className="space-y-5 px-4 pb-32 pt-6 lg:px-10">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary/60" />
            <h1 className="text-xl font-bold tracking-tight">Management</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Bestuurlijke overleggen tussen Stef en Wouter — {total} meeting
            {total !== 1 ? "s" : ""}
          </p>
        </div>
        <GenerateInsightsButton />
      </div>

      <ManagementInsightsPanel
        insights={insights}
        dismissedKeys={dismissedKeys}
        generatedAt={insightsRow?.created_at ?? null}
      />

      {meetings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted-foreground/20 bg-muted/30 p-12 text-center">
          <Crown className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <h2 className="mt-4 text-lg font-medium text-foreground/70">
            Nog geen bestuurlijk overleg
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Zodra een meeting met uitsluitend admin-deelnemers verwerkt en geverifieerd is,
            verschijnt hij hier.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {meetings.map((meeting) => (
            <BoardMeetingCard key={meeting.id} meeting={meeting} />
          ))}
        </div>
      )}
    </div>
  );
}
