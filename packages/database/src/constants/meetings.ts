export const MEETING_TYPES = [
  { value: "strategy", label: "Strategie" },
  { value: "one_on_one", label: "Één-op-één" },
  { value: "team_sync", label: "Teamoverleg" },
  { value: "discovery", label: "Kennismaking" },
  { value: "sales", label: "Sales" },
  { value: "project_kickoff", label: "Project kickoff" },
  { value: "status_update", label: "Statusupdate" },
  { value: "collaboration", label: "Samenwerking" },
  { value: "other", label: "Overig" },
] as const;

export type MeetingTypeValue = (typeof MEETING_TYPES)[number]["value"];

export function formatMeetingType(type: string): string {
  return type.replace(/_/g, " ");
}
