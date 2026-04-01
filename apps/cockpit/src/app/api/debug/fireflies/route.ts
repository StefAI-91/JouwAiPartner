import { NextRequest, NextResponse } from "next/server";
import { listFirefliesTranscripts } from "@repo/ai/fireflies";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transcripts = await listFirefliesTranscripts(20);

  const withDates = transcripts.map((t) => ({
    id: t.id,
    title: t.title,
    date: t.date,
    date_human: new Date(Number(t.date)).toISOString(),
    participants: t.participants,
  }));

  return NextResponse.json({ transcripts: withDates });
}
