import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { embedText, embedBatch } from "./embeddings";

// Lazy-init to avoid build-time errors when env vars aren't available
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

const BATCH_SIZE = 50;

// Tables that have embeddings
const EMBEDDABLE_TABLES = [
  { table: "documents", contentField: "content" },
  { table: "meetings", contentField: "summary" },
  { table: "slack_messages", contentField: "content" },
  { table: "emails", contentField: "body" },
  { table: "projects", contentField: "name" },
] as const;

/**
 * Process stale embeddings for a single table.
 * Returns the number of rows re-embedded.
 */
async function reEmbedTable(
  table: string,
  contentField: string
): Promise<number> {
  // Fetch stale rows
  const { data: staleRows, error } = await getSupabase()
    .from(table)
    .select("*")
    .eq("embedding_stale", true)
    .limit(BATCH_SIZE);

  if (error || !staleRows || staleRows.length === 0) return 0;

  const rows = staleRows as Record<string, any>[];

  // Extract texts for batch embedding
  const texts = rows.map((row) => row[contentField] || "");
  const embeddings = await embedBatch(texts);

  // Update each row with new embedding
  for (let i = 0; i < rows.length; i++) {
    await getSupabase()
      .from(table)
      .update({
        embedding: embeddings[i] as any,
        embedding_stale: false,
      })
      .eq("id", rows[i].id);
  }

  return rows.length;
}

/**
 * Special handler for people table: aggregate profile before embedding.
 */
async function reEmbedPeople(): Promise<number> {
  const { data: stalePeople, error } = await getSupabase()
    .from("people")
    .select("id, name, team, role")
    .eq("embedding_stale", true)
    .limit(BATCH_SIZE);

  if (error || !stalePeople || stalePeople.length === 0) return 0;

  for (const person of stalePeople) {
    // Fetch skills
    const { data: skills } = await getSupabase()
      .from("people_skills")
      .select("skill, evidence_count")
      .eq("person_id", person.id);

    // Fetch projects
    const { data: projects } = await getSupabase()
      .from("people_projects")
      .select("project, role_in_project")
      .eq("person_id", person.id);

    // Build profile text for embedding
    const profileText = buildProfileText(person, skills || [], projects || []);
    const embedding = await embedText(profileText);

    await getSupabase()
      .from("people")
      .update({ embedding: embedding as any, embedding_stale: false })
      .eq("id", person.id);
  }

  return stalePeople.length;
}

/**
 * Aggregate person data into a text profile for embedding.
 */
function buildProfileText(
  person: { name: string; team: string | null; role: string | null },
  skills: { skill: string; evidence_count: number }[],
  projects: { project: string; role_in_project: string | null }[]
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
      `Projects: ${projects.map((p) => `${p.project}${p.role_in_project ? ` (${p.role_in_project})` : ""}`).join(", ")}`
    );
  }

  return lines.join("\n");
}

/**
 * Main worker entry point. Call this from the cron job.
 */
export async function runReEmbedWorker(): Promise<{
  total: number;
  byTable: Record<string, number>;
}> {
  const results: Record<string, number> = {};

  for (const { table, contentField } of EMBEDDABLE_TABLES) {
    results[table] = await reEmbedTable(table, contentField);
  }

  results["people"] = await reEmbedPeople();

  const total = Object.values(results).reduce((sum, n) => sum + n, 0);
  return { total, byTable: results };
}
