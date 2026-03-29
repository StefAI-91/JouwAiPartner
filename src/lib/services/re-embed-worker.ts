import { embedText, embedBatch } from "@/lib/embeddings";
import { getStaleRows, StaleRow } from "@/lib/queries/content";
import { getMeetingExtractionsBatch } from "@/lib/queries/meetings";
import { getStalePeople } from "@/lib/queries/people";
import { updateRowEmbedding } from "@/lib/actions/embeddings";

const SIMPLE_EMBEDDABLE_TABLES = [
  { table: "extractions", contentField: "content" },
  { table: "projects", contentField: "name" },
] as const;

/**
 * Process stale embeddings for a simple table (single content field).
 */
async function reEmbedTable(table: string, contentField: string): Promise<number> {
  const staleRows = await getStaleRows(table);
  if (staleRows.length === 0) return 0;

  const texts = staleRows.map(
    (row) => (row as unknown as Record<string, string>)[contentField] || "",
  );
  const embeddings = await embedBatch(texts);

  for (let i = 0; i < staleRows.length; i++) {
    await updateRowEmbedding(table, staleRows[i].id, embeddings[i]);
  }

  return staleRows.length;
}

/**
 * Build rich embed text for a meeting: title, participants, summary,
 * and extractions (decisions, action items, insights, needs).
 */
function buildMeetingEmbedText(
  meeting: StaleRow,
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

  const typeLabels: Record<string, string> = {
    decision: "Besluiten",
    action_item: "Actiepunten",
    insight: "Inzichten",
    need: "Behoeften",
  };

  for (const [type, items] of Object.entries(grouped)) {
    const label = typeLabels[type] || type;
    parts.push(`${label}:\n` + items.map((item) => `- ${item}`).join("\n"));
  }

  return parts.join("\n\n");
}

/**
 * Process stale meetings with enriched embed text.
 * Uses batch query for extractions to avoid N+1.
 */
async function reEmbedMeetings(): Promise<number> {
  const staleRows = await getStaleRows("meetings");
  if (staleRows.length === 0) return 0;

  // Batch fetch all extractions for stale meetings (avoids N+1)
  const meetingIds = staleRows.map((m) => m.id);
  const allExtractions = await getMeetingExtractionsBatch(meetingIds);

  for (const meeting of staleRows) {
    const extractions = allExtractions.get(meeting.id) ?? [];
    const text = buildMeetingEmbedText(meeting, extractions);
    const embedding = await embedText(text);
    await updateRowEmbedding("meetings", meeting.id, embedding);
  }

  return staleRows.length;
}

/**
 * Build simple profile text for embedding.
 */
function buildProfileText(person: {
  name: string;
  team: string | null;
  role: string | null;
}): string {
  const lines = [person.name];
  if (person.role) lines.push(`Role: ${person.role}`);
  if (person.team) lines.push(`Team: ${person.team}`);
  return lines.join("\n");
}

/**
 * Special handler for people table: aggregate profile before embedding.
 */
async function reEmbedPeople(): Promise<number> {
  const stalePeople = await getStalePeople();
  if (stalePeople.length === 0) return 0;

  for (const person of stalePeople) {
    const profileText = buildProfileText(person);
    const embedding = await embedText(profileText);
    await updateRowEmbedding("people", person.id, embedding);
  }

  return stalePeople.length;
}

/**
 * Main worker entry point. Call this from the cron job.
 */
export async function runReEmbedWorker(): Promise<{
  total: number;
  byTable: Record<string, number>;
}> {
  const results: Record<string, number> = {};

  for (const { table, contentField } of SIMPLE_EMBEDDABLE_TABLES) {
    results[table] = await reEmbedTable(table, contentField);
  }

  results["meetings"] = await reEmbedMeetings();
  results["people"] = await reEmbedPeople();

  const total = Object.values(results).reduce((sum, n) => sum + n, 0);
  return { total, byTable: results };
}
