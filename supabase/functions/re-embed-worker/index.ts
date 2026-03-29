import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMBEDDING_MODEL = "embed-v4.0";
const BATCH_SIZE = 50;

const EMBEDDABLE_TABLES = [
  { table: "meetings", contentField: "summary" },
  { table: "extractions", contentField: "content" },
  { table: "projects", contentField: "name" },
] as const;

async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
  const response = await fetch("https://api.cohere.com/v2/embed", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      texts,
      input_type: "search_document",
      embedding_types: ["float"],
    }),
  });

  if (!response.ok) {
    throw new Error(`Cohere API error: ${response.status} ${await response.text()}`);
  }

  const json = await response.json();
  return json.embeddings.float;
}

async function reEmbedTable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  table: string,
  contentField: string,
  cohereKey: string,
): Promise<number> {
  const { data: staleRows, error } = await supabase
    .from(table)
    .select(`id, ${contentField}`)
    .eq("embedding_stale", true)
    .limit(BATCH_SIZE);

  if (error || !staleRows || staleRows.length === 0) return 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const texts = staleRows.map((row: any) => row[contentField] || "");
  const embeddings = await embedBatch(texts, cohereKey);

  for (let i = 0; i < staleRows.length; i++) {
    await supabase
      .from(table)
      .update({ embedding: embeddings[i], embedding_stale: false })
      .eq("id", staleRows[i].id);
  }

  return staleRows.length;
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!authHeader?.includes(serviceRoleKey)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

  const cohereKey = Deno.env.get("COHERE_API_KEY")!;
  const results: Record<string, number> = {};

  for (const { table, contentField } of EMBEDDABLE_TABLES) {
    results[table] = await reEmbedTable(supabase, table, contentField, cohereKey);
  }

  const total = Object.values(results).reduce((sum, n) => sum + n, 0);

  return new Response(JSON.stringify({ success: true, total, byTable: results }), {
    headers: { "Content-Type": "application/json" },
  });
});
