import { embedBatch } from "../embeddings";
import { getStaleRows, StaleRow } from "@repo/database/queries/content";
import { getMeetingExtractionsBatch } from "@repo/database/queries/meetings";
import { getStalePeople } from "@repo/database/queries/people";
import { batchUpdateEmbeddings } from "@repo/database/mutations/embeddings";

const SIMPLE_EMBEDDABLE_TABLES = [
  { table: "extractions", contentField: "content" },
  { table: "projects", contentField: "name" },
] as const;

/**
 * Process stale embeddings for a simple table (single content field).
 * Uses batch embedding + batch update to avoid N+1.
 */
async function reEmbedTable(
  table: "meetings" | "extractions" | "projects",
  contentField: string,
): Promise<number> {
  const staleRows = await getStaleRows(table);
  if (staleRows.length === 0) return 0;

  const texts = staleRows.map(
    (row) => (row as unknown as Record<string, string>)[contentField] || "",
  );
  const embeddings = await embedBatch(texts);
  const ids = staleRows.map((row) => row.id);

  await batchUpdateEmbeddings(table, ids, embeddings);

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
 * Uses batch query for extractions and batch embedding to avoid N+1.
 */
async function reEmbedMeetings(): Promise<number> {
  const staleRows = await getStaleRows("meetings");
  if (staleRows.length === 0) return 0;

  // Batch fetch all extractions for stale meetings (avoids N+1)
  const meetingIds = staleRows.map((m) => m.id);
  const allExtractions = await getMeetingExtractionsBatch(meetingIds);

  // Batch embed all meetings at once (fixes N+1: Q-02)
  const texts = staleRows.map((meeting) => {
    const extractions = allExtractions.get(meeting.id) ?? [];
    return buildMeetingEmbedText(meeting, extractions);
  });
  const embeddings = await embedBatch(texts);

  await batchUpdateEmbeddings("meetings", meetingIds, embeddings);

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
 * Uses batch embedding to avoid N+1 (fixes Q-03).
 */
async function reEmbedPeople(): Promise<number> {
  const stalePeople = await getStalePeople();
  if (stalePeople.length === 0) return 0;

  const texts = stalePeople.map(buildProfileText);
  const embeddings = await embedBatch(texts);
  const ids = stalePeople.map((p) => p.id);

  await batchUpdateEmbeddings("people", ids, embeddings);

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
