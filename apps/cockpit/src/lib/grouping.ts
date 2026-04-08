import type { VerifiedMeetingListItem } from "@repo/database/queries/meetings";

function formatDayHeading(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export interface DateGroup {
  date: string;
  label: string;
  meetings: VerifiedMeetingListItem[];
}

export function groupMeetingsByDate(meetings: VerifiedMeetingListItem[]): DateGroup[] {
  const groups: DateGroup[] = [];
  let currentDate = "";

  for (const meeting of meetings) {
    const dateKey = meeting.date?.slice(0, 10) ?? "unknown";
    if (dateKey !== currentDate) {
      currentDate = dateKey;
      groups.push({
        date: dateKey,
        label: meeting.date ? formatDayHeading(meeting.date) : "Geen datum",
        meetings: [],
      });
    }
    groups[groups.length - 1].meetings.push(meeting);
  }

  return groups;
}
