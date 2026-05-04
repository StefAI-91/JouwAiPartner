import { notFound } from "next/navigation";
import { createPageClient } from "@repo/auth/helpers";
import {
  getProjectBriefingHeader,
  getProjectIssueCounts,
  listSprintsReadyToTest,
  listTopicsAwaitingInput,
  listTopicsReadyToTest,
  listWeeklyChangelog,
} from "@repo/database/queries/portal";
import { getCurrentSprint } from "@repo/database/queries/sprints";
import { ProjectHeader } from "@/components/briefing/project-header";
import { ReadyToTestList } from "@/components/briefing/ready-to-test-list";
import { AwaitingInputList } from "@/components/briefing/awaiting-input-list";
import { WeeklyChangelog } from "@/components/briefing/weekly-changelog";
import { StatusFooter } from "@/components/briefing/status-footer";
import { SprintBanner } from "@/components/briefing/sprint-banner";

const DEV_PHASE_STATUSES = new Set(["kickoff", "in_progress", "review"]);

export default async function ProjectBriefingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createPageClient();

  const header = await getProjectBriefingHeader(id, supabase);

  // CP-REQ-111 — defensieve 404 wanneer RLS de header blokkeert (cross-org
  // URL-manipulatie). RLS op individuele kolomvelden is de primaire lijn,
  // dit bevestigt het op page-niveau.
  if (!header) notFound();

  // CP-012 — strikte mode-scheiding. Dev-mode = sprint-content, productie-
  // mode = production-feedback. Een tussenfase bestaat niet: het team zet
  // project.status terug naar `in_progress` als ze tijdelijk weer in een
  // sprint zitten op een live app.
  const isDevMode = DEV_PHASE_STATUSES.has(header.status);
  const originFilter = isDevMode ? "sprint" : "production";

  const [ready, waiting, changelog, counts, currentSprint, readySprints] = await Promise.all([
    listTopicsReadyToTest(id, supabase, originFilter),
    listTopicsAwaitingInput(id, supabase, originFilter),
    listWeeklyChangelog(id, supabase),
    getProjectIssueCounts(id, supabase),
    isDevMode ? getCurrentSprint(id, supabase) : Promise.resolve(null),
    isDevMode ? listSprintsReadyToTest(id, supabase) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10 lg:px-12 lg:py-12">
      <ProjectHeader header={header} />
      {isDevMode && currentSprint ? <SprintBanner sprint={currentSprint} /> : null}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReadyToTestList
            topics={ready}
            sprints={readySprints}
            hasPreviewLink={Boolean(header.preview_url)}
          />
        </div>
        <div className="lg:col-span-1">
          <AwaitingInputList topics={waiting} projectId={id} />
        </div>
      </section>
      <WeeklyChangelog entries={changelog} projectId={id} />
      <StatusFooter counts={counts} projectId={id} />
    </div>
  );
}
