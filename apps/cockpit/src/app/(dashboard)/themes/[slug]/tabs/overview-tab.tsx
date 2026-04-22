import Link from "next/link";
import { formatDate } from "@repo/ui/format";
import type { ThemeMeetingEntry, ThemeDecisionEntry } from "@repo/database/queries/themes";

export interface OverviewTabProps {
  meetingsCount: number;
  decisionsCount: number;
  /** v1: altijd 0 — type=need status-tracking komt in v2. */
  openQuestionsCount: number;
  /** Laatste 3 activities (meeting-matches of decisions), mixed en desc op tijd. */
  recentMeetings: ThemeMeetingEntry[];
  recentDecisions: ThemeDecisionEntry[];
}

/**
 * UI-271: Overview-tab met 3 stat-kaartjes (meetings / besluiten / open vragen)
 * + de laatste 3 activities (meeting-matches + decisions gemengd, desc).
 */
export function OverviewTab({
  meetingsCount,
  decisionsCount,
  openQuestionsCount,
  recentMeetings,
  recentDecisions,
}: OverviewTabProps) {
  const activities = buildActivityFeed(recentMeetings, recentDecisions).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Meetings" value={meetingsCount} />
        <StatCard label="Besluiten" value={decisionsCount} />
        <StatCard label="Open vragen" value={openQuestionsCount} muted />
      </div>

      <section className="rounded-xl border border-border/60 bg-card p-5">
        <h2 className="mb-3 text-[13px] font-semibold text-foreground">Laatste activity</h2>
        {activities.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Nog geen matches — zodra de ThemeTagger dit thema tagt verschijnt hier activity.
          </p>
        ) : (
          <ul className="space-y-2">
            {activities.map((a) => (
              <li key={a.key} className="flex items-start gap-3 text-[13px]">
                <span className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {a.kind === "meeting" ? "Meeting" : "Besluit"}
                </span>
                <Link
                  href={`/meetings/${a.meetingId}`}
                  className="flex-1 text-foreground hover:text-primary hover:underline"
                >
                  {a.label}
                </Link>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {formatDate(a.date)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-semibold ${muted ? "text-muted-foreground" : "text-foreground"}`}
      >
        {value}
      </div>
      {muted && <div className="mt-1 text-[11px] text-muted-foreground">komt in v2</div>}
    </div>
  );
}

interface ActivityEntry {
  key: string;
  kind: "meeting" | "decision";
  meetingId: string;
  label: string;
  date: string | null;
  sortKey: string;
}

function buildActivityFeed(
  meetings: ThemeMeetingEntry[],
  decisions: ThemeDecisionEntry[],
): ActivityEntry[] {
  const feed: ActivityEntry[] = [
    ...meetings.map<ActivityEntry>((m) => ({
      key: `m-${m.meeting_id}`,
      kind: "meeting",
      meetingId: m.meeting_id,
      label: m.title ?? "(meeting zonder titel)",
      date: m.date ?? m.matched_at,
      sortKey: m.date ?? m.matched_at,
    })),
    ...decisions.map<ActivityEntry>((d) => ({
      key: `d-${d.extraction_id}`,
      kind: "decision",
      meetingId: d.meeting_id,
      label: d.content,
      date: d.meeting_date ?? d.created_at,
      sortKey: d.created_at,
    })),
  ];
  feed.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  return feed;
}
