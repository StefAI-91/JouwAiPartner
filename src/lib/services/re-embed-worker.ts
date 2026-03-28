import { embedText, embedBatch } from "@/lib/embeddings";
import { getStaleRows } from "@/lib/queries/content";
import { getMeetingExtractions } from "@/lib/queries/meetings";
import { getStalePeople, getPersonSkills, getPersonProjects } from "@/lib/queries/people";
import { updateRowEmbedding } from "@/lib/actions/embeddings";

const SIMPLE_EMBEDDABLE_TABLES = [
  { table: "documents", contentField: "content" },
  { table: "decisions", contentField: "decision" },
  { table: "slack_messages", contentField: "content" },
  { table: "emails", contentField: "body" },
  { table: "projects", contentField: "name" },
] as const;

/**
 * Process stale embeddings for a simple table (single content field).
 */
async function reEmbedTable(table: string, contentField: string): Promise<number> {
  const staleRows = await getStaleRows(table);
  if (staleRows.length === 0) return 0;

  const texts = staleRows.map((row) => row[contentField] || "");
  const embeddings = await embedBatch(texts);

  for (let i = 0; i < staleRows.length; i++) {
    await updateRowEmbedding(table, staleRows[i].id, embeddings[i]);
  }

  return staleRows.length;
}

/**
 * Build rich embed text for a meeting: title, participants, summary,
 * transcript, decisions, and action items.
 */
function buildMeetingEmbedText(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meeting: Record<string, any>,
  decisions: { decision: string; made_by: string }[],
  actionItems: { description: string; assignee: string | null }[],
): string {
  const parts: string[] = [];

  if (meeting.title) parts.push(`Meeting: ${meeting.title}`);
  if (meeting.participants?.length) {
    parts.push(`Deelnemers: ${meeting.participants.join(", ")}`);
  }
  if (meeting.summary) parts.push(`Samenvatting: ${meeting.summary}`);
  if (meeting.transcript) parts.push(`Transcript:\n${meeting.transcript}`);

  if (decisions.length > 0) {
    parts.push(
      "Besluiten:\n" + decisions.map((d) => `- ${d.decision} (door ${d.made_by})`).join("\n"),
    );
  }

  if (actionItems.length > 0) {
    parts.push(
      "Actiepunten:\n" +
        actionItems
          .map((a) => `- ${a.description}${a.assignee ? ` (${a.assignee})` : ""}`)
          .join("\n"),
    );
  }

  return parts.join("\n\n");
}

/**
 * Process stale meetings with enriched embed text.
 */
async function reEmbedMeetings(): Promise<number> {
  const staleRows = await getStaleRows("meetings");
  if (staleRows.length === 0) return 0;

  for (const meeting of staleRows) {
    const { decisions, actionItems } = await getMeetingExtractions(meeting.id);
    const text = buildMeetingEmbedText(meeting, decisions, actionItems);
    const embedding = await embedText(text);
    await updateRowEmbedding("meetings", meeting.id, embedding);
  }

  return staleRows.length;
}

/**
 * Aggregate person data into a text profile for embedding.
 */
function buildProfileText(
  person: { name: string; team: string | null; role: string | null },
  skills: { skill: string; evidence_count: number }[],
  projects: { project: string; role_in_project: string | null }[],
): string {
  const lines = [`${person.name}`];
  if (person.role) lines.push(`Role: ${person.role}`);
  if (person.team) lines.push(`Team: ${person.team}`);

  if (skills.length > 0) {
    const sorted = skills.sort((a, b) => b.evidence_count - a.evidence_count);
    lines.push(`Skills: ${sorted.map((s) => s.skill).join(", ")}`);
  }

  if (projects.length > 0) {
    lines.push(
      `Projects: ${projects.map((p) => `${p.project}${p.role_in_project ? ` (${p.role_in_project})` : ""}`).join(", ")}`,
    );
  }

  return lines.join("\n");
}

/**
 * Special handler for people table: aggregate profile before embedding.
 */
async function reEmbedPeople(): Promise<number> {
  const stalePeople = await getStalePeople();
  if (stalePeople.length === 0) return 0;

  for (const person of stalePeople) {
    const skills = await getPersonSkills(person.id);
    const projects = await getPersonProjects(person.id);
    const profileText = buildProfileText(person, skills, projects);
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
