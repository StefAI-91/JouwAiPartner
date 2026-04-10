export const MEETING_TYPES = [
  { value: "strategy", label: "Strategy" },
  { value: "one_on_one", label: "One on one" },
  { value: "team_sync", label: "Team sync" },
  { value: "discovery", label: "Discovery" },
  { value: "sales", label: "Sales" },
  { value: "project_kickoff", label: "Project kickoff" },
  { value: "status_update", label: "Status update" },
  { value: "collaboration", label: "Collaboration" },
  { value: "other", label: "Overig" },
] as const;

export type MeetingTypeValue = (typeof MEETING_TYPES)[number]["value"];

export function formatMeetingType(type: string): string {
  return type.replace(/_/g, " ");
}
