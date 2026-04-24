export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import { getLatestWeeklySummary } from "@repo/database/queries/summaries/weekly";
import { WeeklySummaryView } from "@/components/weekly/weekly-summary-view";
import { GenerateWeeklyButton } from "@/components/weekly/generate-weekly-button";
import { CalendarDays } from "lucide-react";

export default async function WeeklyPage() {
  const supabase = await createClient();
  const summary = await getLatestWeeklySummary(supabase);

  const structuredContent = summary?.structured_content as {
    week_start: string;
    week_end: string;
    management_summary: string;
    project_health: {
      project_id: string;
      project_name: string;
      status: "groen" | "oranje" | "rood";
      summary: string;
      risks: string[];
      recommendations: string[];
    }[];
    cross_project_risks: string[];
    team_insights: string[];
    focus_next_week: string[];
  } | null;

  return (
    <div className="px-4 pb-32 pt-6 lg:px-10">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#006B3F]/60" />
            <h1 className="text-xl font-bold tracking-tight">Weekoverzicht</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            AI-gegenereerd management dashboard met projectstatus, risico&apos;s en aanbevelingen.
          </p>
        </div>
        <GenerateWeeklyButton />
      </div>

      {structuredContent ? (
        <WeeklySummaryView data={structuredContent} createdAt={summary?.created_at ?? ""} />
      ) : (
        <div className="rounded-xl border border-dashed border-muted-foreground/20 bg-muted/30 p-12 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <h2 className="mt-4 text-lg font-medium text-foreground/70">Nog geen weekoverzicht</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Klik op &ldquo;Genereren&rdquo; om het eerste overzicht te maken.
          </p>
        </div>
      )}
    </div>
  );
}
