import { NextRequest, NextResponse } from "next/server";
import { runReEmbedWorker } from "@/lib/services/re-embed-worker";

export async function POST(req: NextRequest) {
  // Verify the request is authorized via shared secret
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runReEmbedWorker();

  return NextResponse.json({
    success: true,
    processed: result.total,
    byTable: result.byTable,
  });
}
