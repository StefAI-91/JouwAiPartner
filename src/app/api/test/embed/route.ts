import { NextResponse } from "next/server";
import { runReEmbedWorker } from "@/lib/services/re-embed-worker";

export async function POST() {
  const result = await runReEmbedWorker();

  return NextResponse.json({
    success: true,
    processed: result.total,
    byTable: result.byTable,
  });
}
