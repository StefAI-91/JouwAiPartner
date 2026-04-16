import { NextResponse } from "next/server";
import { generateManagementInsights } from "@repo/ai/pipeline/management-insights-pipeline";

export const maxDuration = 120;

/**
 * POST /api/management-insights/generate
 * Generate cross-meeting management insights from board meetings.
 * Protected by CRON_SECRET.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await generateManagementInsights();

  return NextResponse.json(result);
}
