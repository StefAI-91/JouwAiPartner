import Link from "next/link";
import { getMeetingHref } from "@/lib/meeting-href";

interface Meeting {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
  verification_status: string;
}

interface MeetingsListProps {
  meetings: Meeting[];
}

const MEETING_TYPE_LABELS: Record<string, string> = {
  status_update: "Status",
  review: "Review",
  internal_sync: "Internal",
  discovery: "Discovery",
  sales: "Sales",
  team_sync: "Team Sync",
  strategy: "Strategy",
  kickoff: "Kickoff",
  demo: "Demo",
  retrospective: "Retro",
  workshop: "Workshop",
  brainstorm: "Brainstorm",
};

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

export function MeetingsList({ meetings }: MeetingsListProps) {
  if (meetings.length === 0) {
    return (
      <section className="mb-6 rounded-lg border border-border/30 px-5 py-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
          Meetings
        </h3>
        <p className="mt-3 text-sm text-muted-foreground/60">Geen meetings gevonden</p>
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-lg border border-border/30 px-5 py-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
          Meetings
        </h3>
        <span className="text-xs text-muted-foreground/55 tabular-nums">{meetings.length}</span>
      </div>

      <div className="space-y-2">
        {meetings.map((meeting) => (
          <Link
            key={meeting.id}
            href={getMeetingHref(meeting.id, meeting.verification_status)}
            className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-3 transition-colors hover:bg-muted/50"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm">{meeting.title ?? "Untitled meeting"}</p>
            </div>
            <div className="ml-4 flex items-center gap-3 text-xs text-muted-foreground/65 shrink-0">
              {meeting.meeting_type && (
                <span>
                  {MEETING_TYPE_LABELS[meeting.meeting_type] ?? meeting.meeting_type}
                </span>
              )}
              {meeting.date && (
                <span className="tabular-nums">{formatDateShort(meeting.date)}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
