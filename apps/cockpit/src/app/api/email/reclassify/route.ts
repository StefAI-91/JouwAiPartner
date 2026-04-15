import { NextResponse } from "next/server";
import { createClient } from "@repo/database/supabase/server";
import { getAdminClient } from "@repo/database/supabase/admin";
import { processEmail } from "@repo/ai/pipeline/email-pipeline";
import { updateEmailFilterStatus } from "@repo/database/mutations/emails";

export const maxDuration = 300;

/**
 * POST /api/email/reclassify
 *
 * Herclassificeert bestaande emails met de huidige pipeline (inclusief de
 * deterministische pre-classifier). Gebruikt om na een filter-regel-update
 * de backlog opnieuw te beoordelen zonder handmatig per email te klikken.
 *
 * Body (optioneel):
 *   - limit: max aantal emails (default 200, hard cap 500)
 *   - onlyKept: bool — alleen emails met filter_status='kept' opnieuw kijken
 *               (default true, zodat al-gefilterde mails niet onnodig hertest)
 *
 * Flow per email:
 *   1. Reset filter_status naar 'kept' (pipeline bepaalt opnieuw)
 *   2. processEmail() — past eerst pre-classifier toe, dan AI-classifier
 *   3. Pipeline zet filter_status vanzelf weer op 'filtered' als van toepassing
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { limit?: number; onlyKept?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine
  }

  const limit = Math.min(Math.max(body.limit ?? 200, 1), 500);
  const onlyKept = body.onlyKept ?? true;

  const admin = getAdminClient();
  let query = admin
    .from("emails")
    .select("id, subject, from_address, from_name, to_addresses, date, body_text, snippet")
    .eq("is_processed", true)
    .order("date", { ascending: false })
    .limit(limit);

  if (onlyKept) {
    query = query.eq("filter_status", "kept");
  }

  const { data: emails, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!emails || emails.length === 0) {
    return NextResponse.json({ processed: 0, filtered: 0, kept: 0 });
  }

  let filtered = 0;
  let kept = 0;
  const errors: string[] = [];

  for (const email of emails) {
    try {
      // Reset filter state — pipeline bepaalt opnieuw
      await updateEmailFilterStatus(email.id, {
        filter_status: "kept",
        filter_reason: null,
      });

      const result = await processEmail({
        id: email.id,
        subject: email.subject,
        from_address: email.from_address,
        from_name: email.from_name,
        to_addresses: email.to_addresses ?? [],
        date: email.date,
        body_text: email.body_text,
        snippet: email.snippet,
      });

      if (result.filter_status === "filtered") {
        filtered++;
      } else {
        kept++;
      }

      if (result.errors.length > 0) {
        errors.push(...result.errors.map((e) => `Email ${email.id}: ${e}`));
      }
    } catch (err) {
      errors.push(`Email ${email.id}: ${err}`);
    }
  }

  return NextResponse.json({
    processed: emails.length,
    filtered,
    kept,
    errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
  });
}
