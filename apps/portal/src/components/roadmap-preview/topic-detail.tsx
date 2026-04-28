import type { Topic } from "./mock-data";
import { TypeBadge, PriorityBadge } from "./badges";

type TopicDetailProps = {
  topic: Topic;
  /** Optional linked-issues to render below the description. */
  linkedIssues?: Array<{ id: string; title: string; date: string; status: "done" | "open" }>;
};

const statusLabels: Record<
  Topic["bucket"],
  { label: string; tone: "fixed" | "soon" | "priority" | "unprio" }
> = {
  recent_fixed: { label: "Afgerond", tone: "fixed" },
  coming_week: { label: "Komende week", tone: "soon" },
  high_prio_after: { label: "Hoge prio daarna", tone: "priority" },
  unprioritized: { label: "Niet geprioritiseerd", tone: "unprio" },
};

const cssVars: Record<string, { bg: string; rule: string; ink: string }> = {
  fixed: {
    bg: "var(--bucket-fixed-bg)",
    rule: "var(--bucket-fixed-rule)",
    ink: "var(--bucket-fixed-ink)",
  },
  soon: {
    bg: "var(--bucket-soon-bg)",
    rule: "var(--bucket-soon-rule)",
    ink: "var(--bucket-soon-ink)",
  },
  priority: {
    bg: "var(--bucket-priority-bg)",
    rule: "var(--bucket-priority-rule)",
    ink: "var(--bucket-priority-ink)",
  },
  unprio: {
    bg: "var(--bucket-unprio-bg)",
    rule: "var(--bucket-unprio-rule)",
    ink: "var(--bucket-unprio-ink)",
  },
};

export function TopicDetail({ topic, linkedIssues = [] }: TopicDetailProps) {
  const status = statusLabels[topic.bucket];
  const colors = cssVars[status.tone]!;

  return (
    <article
      className="rounded-lg border bg-[var(--paper-elevated)] overflow-hidden"
      style={{ borderColor: "var(--rule-hairline)" }}
    >
      {/* Header: status pill + meta */}
      <header className="px-7 py-5 border-b" style={{ borderColor: "var(--rule-hairline)" }}>
        <div className="flex flex-wrap items-center gap-3">
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
            {status.label}
          </span>
          <TypeBadge type={topic.type} />
          {topic.priority ? <PriorityBadge priority={topic.priority} /> : null}
        </div>
      </header>

      {/* Body */}
      <div className="px-7 py-8">
        <h3 className="font-display text-[2rem] leading-[1.1] tracking-tight text-[var(--ink)]">
          {topic.title}
        </h3>

        <div className="mt-5 max-w-[58ch] text-[16px] leading-[1.65] text-[var(--ink-soft)]">
          <p>{topic.clientDescription}</p>
        </div>

        {/* Meta strip */}
        <dl
          className="mt-8 grid grid-cols-1 gap-y-3 gap-x-8 sm:grid-cols-3 border-t pt-6"
          style={{ borderColor: "var(--rule-soft)" }}
        >
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Aangevraagd
            </dt>
            <dd className="mt-1 font-mono text-[13px] num-tabular text-[var(--ink-soft)]">
              {topic.requestedAt}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Onderwerpen
            </dt>
            <dd className="mt-1 font-mono text-[13px] num-tabular text-[var(--ink-soft)]">
              {topic.linkedIssuesCount} gekoppeld
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Laatste activiteit
            </dt>
            <dd className="mt-1 font-mono text-[13px] num-tabular text-[var(--ink-soft)]">
              {topic.updatedDaysAgo} dagen geleden
            </dd>
          </div>
        </dl>

        {/* Linked issues */}
        {linkedIssues.length > 0 ? (
          <section className="mt-8 border-t pt-6" style={{ borderColor: "var(--rule-soft)" }}>
            <h4 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
              Gekoppelde meldingen
            </h4>
            <ul className="mt-3 divide-y" style={{ borderColor: "var(--rule-soft)" }}>
              {linkedIssues.map((issue) => (
                <li
                  key={issue.id}
                  className="flex items-baseline justify-between gap-4 py-2.5"
                  style={{ borderTop: "1px solid var(--rule-soft)" }}
                >
                  <span className="text-[14px] text-[var(--ink-soft)]">{issue.title}</span>
                  <span className="font-mono text-[11px] num-tabular text-[var(--ink-faint)] shrink-0">
                    {issue.date}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </article>
  );
}
