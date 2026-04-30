import { notFound } from "next/navigation";
import { createPageClient } from "@repo/auth/helpers";
import {
  getProjectBriefingHeader,
  getProjectIssueCounts,
  listTopicsAwaitingInput,
  listTopicsReadyToTest,
  listWeeklyChangelog,
} from "@repo/database/queries/portal";
import { ProjectHeader } from "@/components/briefing/project-header";
import { ReadyToTestList } from "@/components/briefing/ready-to-test-list";
import { AwaitingInputList } from "@/components/briefing/awaiting-input-list";
import { WeeklyChangelog } from "@/components/briefing/weekly-changelog";
import { StatusFooter } from "@/components/briefing/status-footer";

export default async function ProjectBriefingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createPageClient();

  const [header, ready, waiting, changelog, counts] = await Promise.all([
    getProjectBriefingHeader(id, supabase),
    listTopicsReadyToTest(id, supabase),
    listTopicsAwaitingInput(id, supabase),
    listWeeklyChangelog(id, supabase),
    getProjectIssueCounts(id, supabase),
  ]);

  // CP-REQ-111 — defensieve 404 wanneer RLS de header blokkeert (cross-org
  // URL-manipulatie). RLS op individuele kolomvelden is de primaire lijn,
  // dit bevestigt het op page-niveau.
  if (!header) notFound();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10 lg:px-12 lg:py-12">
      <ProjectHeader header={header} />
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReadyToTestList topics={ready} hasPreviewLink={Boolean(header.preview_url)} />
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
