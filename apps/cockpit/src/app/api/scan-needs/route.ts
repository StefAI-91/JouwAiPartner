import { NextResponse } from "next/server";
import { scanAllUnscannedMeetings } from "@repo/ai/pipeline/scan-needs";

/**
 * POST /api/scan-needs
 * Backfill: scan all verified team meetings that haven't been scanned yet.
 * Protected by CRON_SECRET.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await scanAllUnscannedMeetings();

  return NextResponse.json({
    success: true,
    ...result,
  });
}
