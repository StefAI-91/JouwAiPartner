import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { RecentVerifiedMeeting } from "@repo/database/queries/dashboard";
import { formatDateShort } from "@repo/ui/format";
import { displayMeetingTitle } from "@repo/database/utils/meeting-display";

interface RecentVerifiedMeetingsProps {
  meetings: RecentVerifiedMeeting[];
}

export function RecentVerifiedMeetings({ meetings }: RecentVerifiedMeetingsProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border/50">
        <CardTitle>Recent geverifieerd</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {meetings.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nog geen geverifieerde meetings.
          </p>
        ) : (
          <ul className="-mx-1">
            {meetings.map((meeting) => (
              <li key={meeting.id}>
                <Link
                  href={`/meetings/${meeting.id}`}
                  className="group flex items-center gap-3 rounded-lg px-2.5 py-3 transition-all hover:bg-muted/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-snug">
                      {displayMeetingTitle(meeting) || "Untitled"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      {meeting.organization && <span>{meeting.organization.name}</span>}
                      {meeting.date && (
                        <span className="flex items-center gap-0.5">
                          <CalendarDays className="h-3 w-3" />
                          {formatDateShort(meeting.date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
