const TYPE_LABELS: Record<string, string> = {
  decision: "Besluiten",
  action_item: "Actiepunten",
  insight: "Inzichten",
  need: "Behoeften",
};

/**
 * Build rich embed text for a meeting including its extractions.
 * Used by both embed-pipeline (initial embed) and re-embed-worker (stale refresh).
 */
export function buildMeetingEmbedText(
  meeting: { title?: string | null; participants?: string[] | null; summary?: string | null },
  extractions: { type: string; content: string }[],
): string {
  const parts: string[] = [];

  if (meeting.title) parts.push(`Meeting: ${meeting.title}`);
  if (meeting.participants?.length) {
    parts.push(`Deelnemers: ${meeting.participants.join(", ")}`);
  }
  if (meeting.summary) parts.push(`Samenvatting: ${meeting.summary}`);

  const grouped: Record<string, string[]> = {};
  for (const e of extractions) {
    if (!grouped[e.type]) grouped[e.type] = [];
    grouped[e.type].push(e.content);
  }

  for (const [type, items] of Object.entries(grouped)) {
    const label = TYPE_LABELS[type] || type;
    parts.push(`${label}:\n` + items.map((item) => `- ${item}`).join("\n"));
  }

  return parts.join("\n\n");
}
