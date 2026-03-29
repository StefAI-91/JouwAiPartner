import { NextRequest, NextResponse } from "next/server";
import { generateObject, generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { embedText } from "@/lib/embeddings";
import { searchAllContent } from "@/lib/queries/content";

const askSchema = z.object({
  question: z.string().min(1).max(2000),
});

const SearchPlanSchema = z.object({
  queries: z
    .array(
      z.object({
        search_text: z
          .string()
          .describe("Semantic search query optimized for embedding similarity"),
        source_filter: z
          .enum(["all", "meetings", "documents", "slack_messages", "emails"])
          .describe("Which source to search, 'all' for cross-table search"),
      }),
    )
    .describe("1-3 search queries to answer the question from different angles"),
  reasoning: z.string().describe("Why these queries will find the answer"),
});

interface SearchResult {
  id: string;
  similarity?: number;
  source_table?: string;
  title?: string;
  subject?: string;
  channel?: string;
  transcript?: string;
  content?: string;
  summary?: string;
  body?: string;
  participants?: string[];
  date?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = askSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "question is required (string, 1-2000 chars)" },
      { status: 400 },
    );
  }

  const { question } = parsed.data;

  // Step 1: Decompose the question into search queries
  const { object: plan } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: SearchPlanSchema,
    system: `Je bent een search planner voor een kennisplatform. Het platform bevat meetings (met transcripts en deelnemers), documenten, Slack berichten en emails.

Gegeven een vraag, maak 1-3 zoekqueries die samen het beste antwoord opleveren. Denk aan:
- Gebruik verschillende formuleringen om meer te vinden
- Als de vraag breed is, zoek in alle bronnen. Als het specifiek over een meeting gaat, filter op meetings.`,
    prompt: question,
  });

  // Step 2: Execute all searches in parallel using centralized query
  const searchResults = await Promise.all(
    plan.queries.map(async (q) => {
      const embedding = await embedText(q.search_text, "search_query");
      const results = (await searchAllContent(embedding, 0.2, 8, q.search_text)) as SearchResult[];

      if (q.source_filter !== "all") {
        return {
          query: q,
          results: results.filter((r) => r.source_table === q.source_filter),
        };
      }

      return { query: q, results };
    }),
  );

  // Step 3: Deduplicate and collect all unique results
  const seen = new Set<string>();
  const allResults: SearchResult[] = [];

  for (const sr of searchResults) {
    for (const r of sr.results) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        allResults.push(r);
      }
    }
  }

  // Sort by similarity
  allResults.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
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
    .map((r, i) => {
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
    prompt: `Vraag: ${question}\n\n${contextBlock}\n\nBeantwoord de vraag op basis van bovenstaande bronnen.`,
  });

  const sources = topResults.map((r, i) => ({
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
