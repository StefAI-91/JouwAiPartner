import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ingestFirefliesTranscripts } from "@/lib/services/fireflies-ingest";

const ingestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  if (process.env.CRON_SECRET && authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = ingestSchema.safeParse(body);
  const limit = parsed.success ? parsed.data.limit : 20;

  const result = await ingestFirefliesTranscripts(limit);
  return NextResponse.json(result);
}
