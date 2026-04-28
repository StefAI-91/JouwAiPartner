import Link from "next/link";
import { notFound } from "next/navigation";
import { createPageClient } from "@repo/auth/helpers";
import { getTopicWithIssues } from "@repo/database/queries/topics";
import { getProjectName } from "@repo/database/queries/projects";
import type { TopicLifecycleStatus } from "@repo/database/constants/topics";
import { LinkedIssuesPanel } from "./linked-issues-panel";
import { TopicDeleteButton } from "./topic-delete-button";
import { TopicStatusSelect } from "./topic-status-select";

interface TopicDetailProps {
  topicId: string;
}

export async function TopicDetail({ topicId }: TopicDetailProps) {
  const supabase = await createPageClient();
  const topic = await getTopicWithIssues(topicId, supabase);
  if (!topic) notFound();

  const projectName = await getProjectName(topic.project_id, supabase);

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

          <LinkedIssuesPanel
            topicId={topic.id}
            projectId={topic.project_id}
            initialLinked={topic.linked_issues}
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
              Gevarenzone
            </h2>
            <TopicDeleteButton topicId={topic.id} linkedCount={topic.linked_issues.length} />
          </section>
        </aside>
      </div>
    </div>
  );
}
