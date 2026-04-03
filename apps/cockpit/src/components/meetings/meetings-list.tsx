import Link from "next/link";
import { CalendarDays, Building2, Users, ChevronRight } from "lucide-react";
import type { VerifiedMeetingListItem } from "@repo/database/queries/meetings";
import { formatDateShort } from "@/lib/format";

interface MeetingsListProps {
  meetings: VerifiedMeetingListItem[];
}

export function MeetingsList({ meetings }: MeetingsListProps) {
  return (
    <div className="-mx-1">
      {meetings.map((meeting) => (
        <Link
          key={meeting.id}
          href={`/meetings/${meeting.id}`}
          className="group flex items-center gap-3 rounded-lg px-2.5 py-3 transition-all hover:bg-muted/60"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-snug">
              {meeting.title ?? "Untitled"}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              {meeting.date && (
                <span className="flex items-center gap-0.5">
                  <CalendarDays className="h-3 w-3" />
                  {formatDateShort(meeting.date)}
                </span>
              )}
              {meeting.organization && (
                <span className="flex items-center gap-0.5">
                  <Building2 className="h-3 w-3" />
                  {meeting.organization.name}
                </span>
              )}
              {meeting.participant_count > 0 && (
                <span className="flex items-center gap-0.5">
                  <Users className="h-3 w-3" />
                  {meeting.participant_count}
                </span>
              )}
              {meeting.meeting_type && (
                <span className="rounded-md bg-muted px-1.5 py-px font-medium">
                  {meeting.meeting_type.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ))}
    </div>
  );
}
