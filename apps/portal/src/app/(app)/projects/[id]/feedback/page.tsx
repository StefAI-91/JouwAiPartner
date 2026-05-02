import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Bug, HelpCircle, Lightbulb, MessageSquare } from "lucide-react";
import { createPageClient } from "@repo/auth/helpers";
import { getPortalProjectDashboard } from "@repo/database/queries/portal";
import { listClientIssuesForOrg, type ClientIssueRow } from "@repo/database/queries/issues";
import { STATUS_LABELS, type ProjectStatus } from "@repo/database/constants/projects";
import { FeedbackForm } from "@/components/feedback/feedback-form";

const DATE_FORMATTER = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
});

const TYPE_ICONS = {
  bug: Bug,
  feature_request: Lightbulb,
  question: HelpCircle,
} as const;

const TYPE_LABELS: Record<string, string> = {
  bug: "Melding",
  feature_request: "Wens",
  question: "Vraag",
};

// Bronnen die de klant op deze pagina ziet. Nu alleen wat hij zelf via het
// portal-formulier indiende; later uitbreidbaar (bv. "jaip_widget" voor
// eindgebruiker-feedback) zonder query-aanpassing.
const FEEDBACK_PAGE_SOURCES = ["portal"] as const;

export default async function ProjectFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createPageClient();
  const [project, submissions] = await Promise.all([
    getPortalProjectDashboard(id, supabase),
    listClientIssuesForOrg(id, supabase, FEEDBACK_PAGE_SOURCES),
  ]);

  if (!project) notFound();

  const statusLabel = STATUS_LABELS[project.status as ProjectStatus] ?? project.status;

  return (
    <div className="mx-auto flex max-w-6xl flex-col px-6 py-12 lg:px-12 lg:py-16">
      {/* Geïntegreerde header — project-context + page-titel als één blok */}
      <div className="mb-12 max-w-2xl">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {project.organization ? `${project.organization.name} · ` : ""}
            {project.name}
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            {statusLabel}
          </span>
        </div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground">Feedback</h1>
        <p className="mt-3 text-base text-muted-foreground">
          Deel een bug, wens of vraag. Het team pakt het direct op en je volgt de status hieronder —
          zodra een melding op de roadmap landt zie je de link er meteen bij.
        </p>
      </div>

      {/* Two-column grid: form left (7/12) + sticky submissions right (5/12) */}
      <div className="grid gap-x-12 gap-y-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <FeedbackForm projectId={project.id} projectName={project.name} />
        </div>

        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-foreground">Wat je hebt ingediend</h2>
              <span className="font-mono text-xs text-muted-foreground">
                {submissions.length} {submissions.length === 1 ? "item" : "items"}
              </span>
            </div>
            <SubmissionsList projectId={project.id} submissions={submissions} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function SubmissionsList({
  projectId,
  submissions,
}: {
  projectId: string;
  submissions: ClientIssueRow[];
}) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 grid size-10 place-items-center rounded-full bg-muted">
          <MessageSquare className="size-5 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <p className="text-sm font-medium text-foreground">Je eerste indiening</p>
        <p className="mx-auto mt-1 max-w-[26ch] text-xs text-muted-foreground">
          Wat je hier indient verschijnt als kaart. Zodra het team het op de roadmap zet zie je de
          link.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-1 border-l border-border pl-6">
      {submissions.map((row) => (
        <SubmissionItem key={row.id} projectId={projectId} row={row} />
      ))}
    </ol>
  );
}

function SubmissionItem({ projectId, row }: { projectId: string; row: ClientIssueRow }) {
  const Icon = TYPE_ICONS[row.type as keyof typeof TYPE_ICONS] ?? HelpCircle;
  const typeLabel = TYPE_LABELS[row.type] ?? row.type;
  const submitted = formatDate(row.created_at);
  const onRoadmap = Boolean(row.topic);

  const content = (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
        <Icon className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="font-mono">#{row.issue_number}</span>
        <span className="text-border">·</span>
        <span>{typeLabel}</span>
        {submitted ? (
          <>
            <span className="text-border">·</span>
            <span>{submitted}</span>
          </>
        ) : null}
      </div>
      <p className="mt-1 text-sm leading-snug text-foreground">{row.title}</p>
      {onRoadmap ? (
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:text-primary/80">
          Op de roadmap
          <ArrowRight className="size-3" />
        </span>
      ) : (
        <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-border" />
          Ontvangen — wachten op triage
        </span>
      )}
    </>
  );

  return (
    <li className="relative">
      <span
        className={
          "absolute -left-[1.625rem] top-4 size-[9px] rounded-full bg-card ring-[3px] ring-background " +
          (onRoadmap ? "border-[1.5px] border-primary" : "border-[1.5px] border-border")
        }
        aria-hidden
      />
      {onRoadmap ? (
        <Link
          href={`/projects/${projectId}/roadmap/${row.topic!.id}`}
          className="group -mx-3 block rounded-md px-3 py-3 transition-colors hover:bg-card hover:shadow-sm"
        >
          {content}
        </Link>
      ) : (
        <div className="-mx-3 block rounded-md px-3 py-3">{content}</div>
      )}
    </li>
  );
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return DATE_FORMATTER.format(date);
}
