import { NextResponse } from "next/server";
import { createClient } from "@repo/database/supabase/server";
import { getUnprocessedEmails } from "@repo/database/queries/emails";
import { processEmailBatch } from "@repo/ai/pipeline/email/core";
import { isAdmin } from "@repo/auth/access";

export const maxDuration = 300;

/**
 * POST /api/email/process-pending
 *
 * Verwerkt alle emails met is_processed=false in één call. Handig na een
 * grote sync waarbij de standaard sync-batch van 25 te klein is. Hard cap
 * op 100 per call om binnen Vercel's 300s timeout te blijven.
 *
 * De pre-classifier skipt de AI-call voor onmiskenbare notifications/
 * newsletters/cold_outreach, dus voor een inbox vol SaaS-mails gaat dit
 * vaak sneller dan de naïeve Haiku-rate suggereert.
 *
 * Body (optioneel):
 *   - limit: max aantal emails (default 100, cap 100)
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin-only: dit endpoint vuurt max 100 Haiku-calls af, dus geen
  // self-service voor members/clients (consistent met unfilterEmailAction).
  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { limit?: number } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }

  const limit = Math.min(Math.max(body.limit ?? 100, 1), 100);

  const unprocessed = await getUnprocessedEmails(limit);

  if (unprocessed.length === 0) {
    return NextResponse.json({ processed: 0, filtered: 0, kept: 0 });
  }

  const results = await processEmailBatch(
    unprocessed.map((e) => ({
      id: e.id,
      subject: e.subject,
      from_address: e.from_address,
      from_name: e.from_name,
      to_addresses: e.to_addresses,
      date: e.date,
      body_text: e.body_text,
      snippet: e.snippet,
    })),
  );

  const filtered = results.filter((r) => r.filter_status === "filtered").length;
  const kept = results.filter((r) => r.filter_status === "kept").length;
  const errors = results.flatMap((r) => r.errors.map((e) => `Email ${r.emailId}: ${e}`));

  return NextResponse.json({
    processed: results.length,
    filtered,
    kept,
    remaining: Math.max(0, unprocessed.length === limit ? -1 : 0), // -1 = "mogelijk meer"
    errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
  });
}
