import { NextRequest, NextResponse } from "next/server";
import { generateObject, generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { embedText } from "@/lib/embeddings";
import { getAdminClient } from "@/lib/supabase/admin";

const SearchPlanSchema = z.object({
  queries: z
    .array(
      z.object({
        search_text: z
          .string()
          .describe("Semantic search query optimized for embedding similarity"),
        participant_filter: z
          .string()
          .nullable()
          .describe("Filter on participant name if the question is about a specific person"),
        source_filter: z
          .enum(["all", "meetings", "documents", "slack_messages", "emails"])
          .describe("Which source to search, 'all' for cross-table search"),
      }),
    )
    .describe("1-3 search queries to answer the question from different angles"),
  reasoning: z.string().describe("Why these queries will find the answer"),
});

async function searchAll(embedding: number[], threshold: number, count: number, queryText = "") {
  const { data } = await getAdminClient().rpc("search_all_content", {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query_embedding: embedding as any,
    query_text: queryText,
    match_threshold: threshold,
    match_count: count,
  });
  return data ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function searchMeetingsByParticipant(
  embedding: number[],
  participant: string,
  threshold: number,
  count: number,
) {
  const { data } = await getAdminClient().rpc("search_meetings_by_participant", {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query_embedding: embedding as any,
    participant_name: participant,
    match_threshold: threshold,
    match_count: count,
  });
  return data ?? [];
}

async function searchSingleTable(
  table: string,
  embedding: number[],
  threshold: number,
  count: number,
  queryText = "",
) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const rpcMap: Record<string, string> = {
    meetings: "search_all_content",
    documents: "search_all_content",
  };

  // Fall back to search_all_content and filter client-side
  const allResults = await searchAll(embedding, threshold, count * 2, queryText);
  if (table === "all") return allResults;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return allResults.filter((r: any) => r.source_table === table);
}

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  // Step 1: Decompose the question into search queries
  const { object: plan } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: SearchPlanSchema,
    system: `Je bent een search planner voor een kennisplatform. Het platform bevat meetings (met transcripts en deelnemers), documenten, Slack berichten en emails.

Gegeven een vraag, maak 1-3 zoekqueries die samen het beste antwoord opleveren. Denk aan:
- Als de vraag over een specifiek persoon gaat, filter op die persoon als participant
- Gebruik verschillende formuleringen om meer te vinden
- Als de vraag breed is, zoek in alle bronnen. Als het specifiek over een meeting gaat, filter op meetings.`,
    prompt: question,
  });

  // Step 2: Execute all searches in parallel
  // Include participant name in search text for better embedding match
  const searchResults = await Promise.all(
    plan.queries.map(async (q) => {
      const searchText = q.participant_filter
        ? `${q.participant_filter} ${q.search_text}`
        : q.search_text;
      const embedding = await embedText(searchText, "search_query");

      if (q.source_filter !== "all") {
        return {
          query: q,
          results: await searchSingleTable(q.source_filter, embedding, 0.2, 8, q.search_text),
        };
      }

      return {
        query: q,
        results: await searchAll(embedding, 0.2, 8, q.search_text),
      };
    }),
  );

  // Step 3: Deduplicate and collect all unique results
  const seen = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allResults: any[] = [];

  for (const sr of searchResults) {
    for (const r of sr.results) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        allResults.push(r);
      }
    }
  }

  // Sort by similarity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allResults.sort((a: any, b: any) => (b.similarity ?? 0) - (a.similarity ?? 0));
  const topResults = allResults.slice(0, 10);

  if (topResults.length === 0) {
    return NextResponse.json({
      answer: "Ik heb geen relevante informatie gevonden om deze vraag te beantwoorden.",
      sources: [],
      plan,
    });
  }

  // Step 4: Synthesize answer with Claude
  const contextBlock = topResults
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any, i: number) => {
      const source = r.source_table ?? "meetings";
      const title = r.title ?? r.subject ?? r.channel ?? "Untitled";
      const content = r.transcript ?? r.content ?? r.summary ?? r.body ?? "";
      const participants = r.participants ? `Deelnemers: ${r.participants.join(", ")}` : "";
      const date = r.date ? `Datum: ${new Date(r.date).toLocaleDateString("nl-NL")}` : "";
      const similarity = r.similarity ? `(relevantie: ${(r.similarity * 100).toFixed(0)}%)` : "";

      return `--- Bron ${i + 1} [${source}] ${similarity} ---
Titel: ${title}
${date}
${participants}
${content}`.trim();
    })
    .join("\n\n");

  const { text: answer } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: `Je bent een kennisassistent. Beantwoord de vraag op basis van de gevonden bronnen.

Regels:
- Baseer je antwoord ALLEEN op de gegeven bronnen
- Verwijs naar bronnen met [Bron X]
- Als de bronnen het antwoord niet volledig geven, zeg dat eerlijk
- Citeer relevante uitspraken letterlijk waar mogelijk
- Wees concreet en specifiek, geen vage samenvattingen`,
    prompt: `Vraag: ${question}

${contextBlock}

Beantwoord de vraag op basis van bovenstaande bronnen.`,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sources = topResults.map((r: any, i: number) => ({
    index: i + 1,
    id: r.id,
    source_table: r.source_table ?? "meetings",
    title: r.title ?? r.subject ?? r.channel ?? "Untitled",
    date: r.date ?? null,
    participants: r.participants ?? null,
    similarity: r.similarity,
  }));

  return NextResponse.json({ answer, sources, plan });
}
