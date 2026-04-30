import Link from "next/link";
import { notFound } from "next/navigation";
import { createPageClient } from "@repo/auth/helpers";
import { getTopicWithIssues } from "@repo/database/queries/topics";
import { getProjectName } from "@repo/database/queries/projects";
import { CLOSED_STATUSES, type IssueStatus } from "@repo/database/constants/issues";
import type { TopicLifecycleStatus } from "@repo/database/constants/topics";
import { LinkedIssuesPanel } from "./linked-issues-panel";
import { TopicDeleteButton } from "./topic-delete-button";
import { TopicResolutionEditor } from "./topic-resolution-editor";
import { TopicStatusSelect } from "./topic-status-select";
import { TopicTestInstructionsEditor } from "./topic-test-instructions-editor";

const RESOLUTION_OPEN_BY_DEFAULT = new Set<TopicLifecycleStatus>([
  "done",
  "wont_do",
  "wont_do_proposed_by_client",
]);

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface TopicDetailProps {
  topicId: string;
}

export async function TopicDetail({ topicId }: TopicDetailProps) {
  const supabase = await createPageClient();
  const topic = await getTopicWithIssues(topicId, supabase);
  if (!topic) notFound();

  const projectName = await getProjectName(topic.project_id, supabase);

  const closedIssueCount = topic.linked_issues.filter((i) =>
    CLOSED_STATUSES.has(i.status as IssueStatus),
  ).length;
  const openIssueCount = topic.linked_issues.length - closedIssueCount;
  const resolutionDefaultOpen =
    RESOLUTION_OPEN_BY_DEFAULT.has(topic.status as TopicLifecycleStatus) ||
    Boolean(topic.resolution || topic.client_resolution);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <nav className="text-xs text-muted-foreground" aria-label="Broodkruimels">
          <Link href={`/topics?project=${topic.project_id}`} className="hover:underline">
            Topics
          </Link>
          <span className="px-1">/</span>
          <span>{projectName ?? "Project"}</span>
        </nav>

        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-foreground">
            {topic.title}
          </h1>
          <Link
            href={`/topics/${topic.id}/edit`}
            className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            Bewerk topic
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono uppercase tracking-[0.14em]">● {topic.type}</span>
          {topic.priority ? <span className="font-mono">{topic.priority}</span> : null}
          {topic.target_sprint_id ? <span>sprint: {topic.target_sprint_id}</span> : null}
          <span>· bijgewerkt {new Date(topic.updated_at).toLocaleString("nl-NL")}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          {topic.client_title || topic.client_description ? (
            <section className="flex flex-col gap-2 rounded-md border border-dashed border-border p-4">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Wat de klant ziet
              </h2>
              {topic.client_title ? (
                <p className="text-base font-medium">{topic.client_title}</p>
              ) : null}
              {topic.client_description ? (
                <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {topic.client_description}
                </p>
              ) : null}
            </section>
          ) : null}

          {topic.description ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Interne beschrijving
              </h2>
              <p className="whitespace-pre-wrap break-words text-sm">{topic.description}</p>
            </section>
          ) : null}

          <TopicTestInstructionsEditor
            topicId={topic.id}
            initialInstructions={topic.client_test_instructions}
          />

          <LinkedIssuesPanel
            topicId={topic.id}
            projectId={topic.project_id}
            initialLinked={topic.linked_issues}
          />

          <TopicResolutionEditor
            topicId={topic.id}
            initialResolution={topic.resolution}
            initialClientResolution={topic.client_resolution}
            defaultOpen={resolutionDefaultOpen}
          />
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <section className="flex flex-col gap-2 rounded-md border border-border p-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </h2>
            <TopicStatusSelect topicId={topic.id} current={topic.status as TopicLifecycleStatus} />
            {topic.wont_do_reason ? (
              <p className="text-xs text-muted-foreground">Reden: {topic.wont_do_reason}</p>
            ) : null}
          </section>

          <section className="flex flex-col gap-2 rounded-md border border-border p-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Details
            </h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-xs text-muted-foreground">Project</dt>
                <dd className="min-w-0 truncate text-right">
                  <Link href={`/topics?project=${topic.project_id}`} className="hover:underline">
                    {projectName ?? "—"}
                  </Link>
                </dd>
              </div>
              {topic.priority ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-muted-foreground">Prioriteit</dt>
                  <dd className="font-mono text-xs uppercase tracking-wider">{topic.priority}</dd>
                </div>
              ) : null}
              {topic.target_sprint_id ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-muted-foreground">Sprint</dt>
                  <dd className="font-mono text-xs">{topic.target_sprint_id}</dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-xs text-muted-foreground">Aangemaakt</dt>
                <dd>{formatDate(topic.created_at)}</dd>
              </div>
              {topic.closed_at ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-muted-foreground">Afgesloten</dt>
                  <dd>{formatDate(topic.closed_at)}</dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-xs text-muted-foreground">Issues</dt>
                <dd className="text-xs text-muted-foreground">
                  {topic.linked_issues.length === 0 ? (
                    <span>geen</span>
                  ) : (
                    <span>
                      <span className="text-foreground">{openIssueCount}</span> open ·{" "}
                      <span className="text-foreground">{closedIssueCount}</span> afgerond
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="flex flex-col gap-2 rounded-md border border-border p-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Gevarenzone
            </h2>
            <TopicDeleteButton
              topicId={topic.id}
              projectId={topic.project_id}
              linkedCount={topic.linked_issues.length}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
