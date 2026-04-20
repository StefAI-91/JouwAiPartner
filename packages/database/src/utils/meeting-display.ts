/**
 * Kies de titel die we aan gebruikers tonen.
 *
 * - `meeting_title` (gatekeeper, structureel format) heeft voorrang
 * - `title` (Fireflies of handmatig bewerkt) als fallback voor oude rows
 * - Lege string als laatste vangnet — voorkomt `null` in de UI
 */
export function displayMeetingTitle(meeting: {
  meeting_title?: string | null;
  title?: string | null;
}): string {
  return meeting.meeting_title ?? meeting.title ?? "";
}
