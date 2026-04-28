import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

const BUCKET_COLOR: Record<PortalBucketKey, { bg: string; rule: string; ink: string }> = {
  recent_done: {
    bg: "var(--bucket-fixed-bg)",
    rule: "var(--bucket-fixed-rule)",
    ink: "var(--bucket-fixed-ink)",
  },
  upcoming: {
    bg: "var(--bucket-soon-bg)",
    rule: "var(--bucket-soon-rule)",
    ink: "var(--bucket-soon-ink)",
  },
  high_prio: {
    bg: "var(--bucket-priority-bg)",
    rule: "var(--bucket-priority-rule)",
    ink: "var(--bucket-priority-ink)",
  },
  awaiting_input: {
    bg: "var(--bucket-unprio-bg)",
    rule: "var(--bucket-unprio-rule)",
    ink: "var(--bucket-unprio-ink)",
  },
};

const PROSE_CLASSES = [
  "prose prose-sm max-w-[58ch] text-[var(--ink-soft)]",
  "[&_p]:text-[16px] [&_p]:leading-[1.65] [&_p]:my-2",
  "[&_ul]:my-2 [&_ul]:pl-5 [&_ul]:space-y-1",
  "[&_ol]:my-2 [&_ol]:pl-5 [&_ol]:space-y-1",
  "[&_li]:text-[15px] [&_li]:leading-relaxed",
  "[&_a]:text-[var(--accent-brand)] [&_a]:underline [&_a]:underline-offset-2",
  "[&_code]:rounded [&_code]:bg-[var(--paper-deep)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs",
  "[&_pre]:rounded-md [&_pre]:bg-[var(--paper-deep)] [&_pre]:p-3 [&_pre]:text-xs",
  "[&_strong]:font-semibold [&_strong]:text-[var(--ink)]",
].join(" ");

interface TopicDetailViewProps {
  topic: TopicWithIssues;
  projectId: string;
}

export function TopicDetailView({ topic, projectId }: TopicDetailViewProps) {
  const heading = topic.client_title ?? topic.title;
  const body = topic.client_description ?? topic.description;
  const bucket = topicStatusToBucket(topic.status, topic.closed_at);
  const colors = bucket ? BUCKET_COLOR[bucket] : null;
  const statusLabel = bucket ? STATUS_LABEL[bucket] : null;

  return (
    <article className="flex flex-col gap-5">
      <Link
        href={`/projects/${projectId}/roadmap`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
      >
        <ArrowLeft className="size-4" />
        Terug naar roadmap
      </Link>

      <div
        className="rounded-lg border bg-[var(--paper-elevated)] overflow-hidden"
        style={{ borderColor: "var(--rule-hairline)" }}
      >
        <header className="px-7 py-5 border-b" style={{ borderColor: "var(--rule-hairline)" }}>
          <div className="flex flex-wrap items-center gap-3">
            {colors && statusLabel ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]"
                style={{
                  backgroundColor: colors.bg,
                  borderColor: colors.rule,
                  color: colors.ink,
                }}
              >
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: colors.ink, opacity: 0.6 }}
                />
                {statusLabel}
              </span>
            ) : null}
            <TypeBadge type={topic.type} />
            <PriorityBadge priority={topic.priority} />
          </div>
        </header>

        <div className="px-7 py-8">
          <h1 className="font-display text-[2rem] leading-[1.1] tracking-tight text-[var(--ink)]">
            {heading}
          </h1>

          <div className="mt-5">
            {body ? (
              <div className={PROSE_CLASSES}>
                <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
              </div>
            ) : (
              <p className="text-[14px] text-[var(--ink-muted)]">Geen beschrijving beschikbaar.</p>
            )}
          </div>

          <dl
            className="mt-8 grid grid-cols-1 gap-y-3 gap-x-8 sm:grid-cols-3 border-t pt-6"
            style={{ borderColor: "var(--rule-soft)" }}
          >
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                Aangemaakt
              </dt>
              <dd className="mt-1 font-mono text-[13px] num-tabular text-[var(--ink-soft)]">
                {formatDate(topic.created_at)}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                Onderwerpen
              </dt>
              <dd className="mt-1 font-mono text-[13px] num-tabular text-[var(--ink-soft)]">
                {topic.linked_issues.length} gekoppeld
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                Laatste activiteit
              </dt>
              <dd className="mt-1 font-mono text-[13px] num-tabular text-[var(--ink-soft)]">
                {timeAgoDays(topic.updated_at)}
              </dd>
            </div>
          </dl>

          {topic.linked_issues.length > 0 ? (
            <section className="mt-8 border-t pt-6" style={{ borderColor: "var(--rule-soft)" }}>
              <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                Gekoppelde meldingen
              </h2>
              <ul className="mt-3" style={{ borderColor: "var(--rule-soft)" }}>
                {topic.linked_issues.map((issue) => (
                  <li
                    key={issue.id}
                    className="flex items-baseline justify-between gap-4 py-2.5"
                    style={{ borderTop: "1px solid var(--rule-soft)" }}
                  >
                    <span className="text-[14px] text-[var(--ink-soft)]">{issue.title}</span>
                    <span className="font-mono text-[11px] num-tabular text-[var(--ink-faint)] shrink-0">
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
