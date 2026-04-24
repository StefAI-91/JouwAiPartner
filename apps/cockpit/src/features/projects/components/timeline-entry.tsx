import { CheckCircle2, CircleAlert, Mail, Video } from "lucide-react";
import { formatDate } from "@repo/ui/format";
import type { TimelineEntry } from "@repo/ai/validations/project-summary";
import { detectPivot } from "../utils/detect-pivot";
import { stripTitlePrefix } from "../utils/strip-title-prefix";

const MEETING_TYPE_LABELS: Record<string, string> = {
  team_sync: "Team sync",
  status_update: "Status update",
  discovery: "Discovery",
  sales: "Sales",
  strategy: "Strategie",
  kickoff: "Kickoff",
  review: "Review",
  demo: "Demo",
  retrospective: "Retrospective",
  workshop: "Workshop",
  interview: "Interview",
  other: "Overig",
};

function getMeetingTypeLabel(type: string): string {
  return MEETING_TYPE_LABELS[type] ?? type;
}

interface TimelineEntryItemProps {
  entry: TimelineEntry;
}

export function TimelineEntryItem({ entry }: TimelineEntryItemProps) {
  const isPivot = detectPivot(entry);
  const isEmail = entry.source_type === "email";
  const SourceIcon = isEmail ? Mail : Video;
  const sourceLabel = isEmail
    ? "E-mail"
    : entry.meeting_type
      ? getMeetingTypeLabel(entry.meeting_type)
      : "Meeting";
  const title = stripTitlePrefix(entry.title);

  return (
    <article className="relative pl-4 py-2" data-entry>
      {isPivot && (
        <div
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
          style={{
            background: "linear-gradient(180deg, #006B3F 0%, rgba(0, 107, 63, 0.2) 100%)",
          }}
          aria-hidden
        />
      )}

      <div className="flex items-baseline gap-2 flex-wrap mb-1">
        <span className="text-xs font-medium text-muted-foreground">{formatDate(entry.date)}</span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{
            background: isPivot ? "rgba(0, 107, 63, 0.12)" : "rgba(0, 107, 63, 0.08)",
            color: isPivot ? "#006B3F" : "rgba(0, 107, 63, 0.7)",
          }}
        >
          <SourceIcon className="h-2.5 w-2.5" />
          {sourceLabel}
        </span>
        {isPivot && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
            style={{ background: "rgba(0, 107, 63, 0.08)", color: "#006B3F" }}
          >
            ★ Kantelpunt
          </span>
        )}
      </div>

      <h4
        className={`mb-1 text-foreground/90 ${isPivot ? "text-base font-semibold" : "text-sm font-medium"}`}
      >
        {title}
      </h4>
      <p className="text-[13px] leading-relaxed text-foreground/70">{entry.summary}</p>

      {entry.key_decisions.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {entry.key_decisions.map((decision, j) => (
            <div key={j} className="flex items-start gap-1.5">
              <CheckCircle2
                className="mt-0.5 h-3 w-3 shrink-0"
                style={{ color: "rgba(0, 107, 63, 0.55)" }}
              />
              <span className="text-xs text-foreground/65">{decision}</span>
            </div>
          ))}
        </div>
      )}

      {entry.open_actions.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {entry.open_actions.map((action, j) => (
            <div key={j} className="flex items-start gap-1.5">
              <CircleAlert className="mt-0.5 h-3 w-3 shrink-0 text-amber-500/70" />
              <span className="text-xs text-foreground/65">{action}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
