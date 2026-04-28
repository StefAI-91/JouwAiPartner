import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@repo/ui/badge";
import { formatDate, timeAgoDays } from "@repo/ui/format";
import { topicStatusToBucket, type PortalBucketKey } from "@repo/database/constants/topics";
import type { TopicWithIssues } from "@repo/database/queries/topics";
import { TypeBadge, PriorityBadge } from "./badges";

const STATUS_LABEL: Record<PortalBucketKey, string> = {
  recent_done: "Afgerond",
  upcoming: "Komende week",
  high_prio: "Hoge prio daarna",
  awaiting_input: "Niet geprioritiseerd",
};

const PROSE_CLASSES = [
  "prose prose-sm max-w-[58ch] text-foreground",
  "[&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-2",
  "[&_ul]:my-2 [&_ul]:pl-5 [&_ul]:space-y-1",
  "[&_ol]:my-2 [&_ol]:pl-5 [&_ol]:space-y-1",
  "[&_li]:text-sm [&_li]:leading-relaxed",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs",
  "[&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-xs",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
].join(" ");

interface TopicDetailViewProps {
  topic: TopicWithIssues;
  projectId: string;
}

export function TopicDetailView({ topic, projectId }: TopicDetailViewProps) {
  const heading = topic.client_title ?? topic.title;
  const body = topic.client_description ?? topic.description;
  const bucket = topicStatusToBucket(topic.status, topic.closed_at);
  const statusLabel = bucket ? STATUS_LABEL[bucket] : null;

  return (
    <article className="flex flex-col gap-5">
      <Link
        href={`/projects/${projectId}/roadmap`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Terug naar roadmap
      </Link>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-4">
          {statusLabel ? <Badge variant="secondary">{statusLabel}</Badge> : null}
          <TypeBadge type={topic.type} />
          <PriorityBadge priority={topic.priority} />
        </header>

        <div className="px-6 py-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{heading}</h1>

          <div className="mt-4">
            {body ? (
              <div className={PROSE_CLASSES}>
                <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Geen beschrijving beschikbaar.</p>
            )}
          </div>

          <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-3 border-t border-border pt-6 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Aangemaakt</dt>
              <dd className="mt-1 text-sm text-foreground">{formatDate(topic.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Onderwerpen
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {topic.linked_issues.length} gekoppeld
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Laatste activiteit
              </dt>
              <dd className="mt-1 text-sm text-foreground">{timeAgoDays(topic.updated_at)}</dd>
            </div>
          </dl>

          {topic.linked_issues.length > 0 ? (
            <section className="mt-8 border-t border-border pt-6">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
                Gekoppelde meldingen
              </h2>
              <ul className="mt-3">
                {topic.linked_issues.map((issue) => (
                  <li
                    key={issue.id}
                    className="flex items-baseline justify-between gap-4 border-t border-border py-2.5"
                  >
                    <span className="text-sm text-foreground">{issue.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(issue.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </article>
  );
}
