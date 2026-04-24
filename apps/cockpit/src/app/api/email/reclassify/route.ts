import { NextResponse } from "next/server";
import { createClient } from "@repo/database/supabase/server";
import { listEmailsForReclassify } from "@repo/database/queries/emails";
import { processEmail } from "@repo/ai/pipeline/email/core";
import { updateEmailFilterStatus } from "@repo/database/mutations/emails";
import { isAdmin } from "@repo/auth/access";

export const maxDuration = 300;

/**
 * POST /api/email/reclassify
 *
 * Herverwerkt emails met de huidige pipeline (inclusief de deterministische
 * pre-classifier). Gebruikt na een filter-regel-update OF om een backlog van
 * onverwerkte emails alsnog door de pipeline te halen.
 *
 * Scope standaard (skipFiltered=true):
 *   - onverwerkte emails (is_processed=false) → door pipeline alsnog
 *   - verwerkte + KEPT emails (filter_status='kept') → opnieuw beoordeeld
 *   - al-gefilterde emails blijven gefilterd (geen onnodig werk)
 *
 * skipFiltered=false: pakt ALLE emails, ook die al in Gefilterd staan.
 *
 * Body (optioneel):
 *   - limit: max aantal emails (default 200, hard cap 500)
 *   - skipFiltered: bool — default true (sla al-gefilterde over)
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

  // Admin-only: dit endpoint start een batch-run van 200 emails door Haiku,
  // dus we willen niet dat members of gasten deze kunnen afvuren (kosten).
  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { limit?: number; skipFiltered?: boolean; onlyKept?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine
  }

  const limit = Math.min(Math.max(body.limit ?? 200, 1), 500);
  // Back-compat: onlyKept is het oude veld, skipFiltered het nieuwe
  const skipFiltered = body.skipFiltered ?? body.onlyKept ?? true;

  const emails = await listEmailsForReclassify({ limit, skipFiltered });

  if (emails.length === 0) {
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

      const result = await processEmail(email);

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
