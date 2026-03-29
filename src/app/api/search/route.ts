import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { embedText } from "@/lib/embeddings";
import { searchAllContent } from "@/lib/queries/content";

const searchSchema = z.object({
  query: z.string().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = searchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "query is required (string, 1-1000 chars)" },
      { status: 400 },
    );
  }

  const { query } = parsed.data;
  const embedding = await embedText(query, "search_query");
  const data = await searchAllContent(embedding, 0.3, 10, query);

  return NextResponse.json({ results: data });
}
