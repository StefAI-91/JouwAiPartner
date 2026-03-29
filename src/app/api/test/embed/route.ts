import { NextRequest, NextResponse } from "next/server";
import { runReEmbedWorker } from "@/lib/services/re-embed-worker";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  if (process.env.CRON_SECRET && authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runReEmbedWorker();

  return NextResponse.json({
    success: true,
    processed: result.total,
    byTable: result.byTable,
  });
}
