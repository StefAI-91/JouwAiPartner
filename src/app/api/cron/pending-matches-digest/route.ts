import { NextRequest, NextResponse } from "next/server";
import { sendPendingMatchesDigest } from "@/lib/services/pending-matches-digest";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await sendPendingMatchesDigest();

  return NextResponse.json({ success: true });
}
