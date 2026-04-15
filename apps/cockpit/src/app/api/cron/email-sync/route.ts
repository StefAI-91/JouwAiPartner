import { NextRequest, NextResponse } from "next/server";
import {
  listActiveGoogleAccounts,
  getExistingGmailIds,
  getUnprocessedEmails,
} from "@repo/database/queries/emails";
import {
  insertEmails,
  updateGoogleAccountTokens,
  updateGoogleAccountLastSync,
} from "@repo/database/mutations/emails";
import { fetchEmails } from "@repo/ai/gmail";
import { processEmailBatch } from "@repo/ai/pipeline/email-pipeline";

export const maxDuration = 300;

/** Hard cap — nooit verder terug kijken dan dit, ook niet op eerste sync. */
const MAX_LOOKBACK_DAYS = 7;

/** Max aantal emails per Gmail-account per cron-run. */
const MAX_RESULTS_PER_ACCOUNT = 50;

/** Max aantal emails door de AI-pipeline per cron-run. */
const MAX_PROCESS_PER_RUN = 100;

/**
 * Bepaal vanaf welke datum we emails ophalen. Formatteert als Gmail query-
 * string (YYYY/MM/DD). Logica:
 *   - Neem max(last_sync_at, now - MAX_LOOKBACK_DAYS)
 *   - Dus: na lange downtime halen we nooit meer dan MAX_LOOKBACK_DAYS op
 *
 * Dit voorkomt dat een account dat weken niet gesynced is ineens een
 * enorme backlog ophaalt — wat én Gmail API-quota én de AI-pipeline zou
 * overbelasten.
 */
function computeAfterDate(lastSyncAt: string | null): string {
  const capDate = new Date(Date.now() - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const fromDate = lastSyncAt ? new Date(lastSyncAt) : capDate;
  const effective = fromDate > capDate ? fromDate : capDate;
  return effective.toISOString().split("T")[0].replace(/-/g, "/");
}

/**
 * GET/POST /api/cron/email-sync
 *
 * Hourly cron (via Vercel Scheduled Functions). Synchroniseert nieuwe
 * emails van alle actieve Google-accounts en draait de AI-pipeline op
 * de backlog van onverwerkte emails.
 *
 * Auth: CRON_SECRET bearer — dezelfde conventie als /api/cron/re-embed
 * en /api/cron/reclassify.
 *
 * Vercel Cron stuurt GET requests; POST blijft beschikbaar voor handmatige
 * triggers. Beide methodes delen dezelfde handler.
 *
 * Hard caps om runaway kosten te voorkomen:
 *   - MAX_LOOKBACK_DAYS (7) — nooit verder terug dan 7 dagen
 *   - MAX_RESULTS_PER_ACCOUNT (50) — Gmail fetch cap per account
 *   - MAX_PROCESS_PER_RUN (100) — AI-pipeline cap per run
 *
 * Als de backlog groter is dan deze cap, eet de volgende cron-run 'm op.
 */
async function handleEmailSync(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await listActiveGoogleAccounts();

  if (accounts.length === 0) {
    return NextResponse.json({
      success: true,
      accounts: 0,
      fetched: 0,
      processed: 0,
    });
  }

  let totalFetched = 0;
  const errors: string[] = [];

  // 1. Fetch nieuwe emails per account (met 7-daagse lookback cap)
  for (const account of accounts) {
    try {
      const tokens = {
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: new Date(account.token_expiry).getTime(),
      };

      const afterDate = computeAfterDate(account.last_sync_at);

      const { messages, newTokens } = await fetchEmails(tokens, {
        maxResults: MAX_RESULTS_PER_ACCOUNT,
        afterDate,
      });

      if (newTokens) {
        await updateGoogleAccountTokens(account.id, {
          access_token: newTokens.access_token,
          token_expiry: new Date(newTokens.expiry_date).toISOString(),
        });
      }

      if (messages.length === 0) {
        await updateGoogleAccountLastSync(account.id);
        continue;
      }

      const existingIds = await getExistingGmailIds(
        account.id,
        messages.map((m) => m.gmail_id),
      );
      const newMessages = messages.filter((m) => !existingIds.has(m.gmail_id));

      if (newMessages.length > 0) {
        const rows = newMessages.map((m) => ({
          google_account_id: account.id,
          gmail_id: m.gmail_id,
          thread_id: m.thread_id,
          subject: m.subject,
          from_address: m.from_address,
          from_name: m.from_name,
          to_addresses: m.to_addresses,
          cc_addresses: m.cc_addresses,
          date: m.date,
          body_text: m.body_text,
          body_html: m.body_html,
          snippet: m.snippet,
          labels: m.labels,
          has_attachments: m.has_attachments,
          direction: (m.labels.includes("SENT") ? "outgoing" : "incoming") as
            | "incoming"
            | "outgoing",
          raw_gmail: m.raw_gmail,
          embedding_stale: true,
          verification_status: "draft",
        }));

        const insertResult = await insertEmails(rows);
        if ("error" in insertResult) {
          errors.push(`Insert failed for ${account.email}: ${insertResult.error}`);
        } else {
          totalFetched += insertResult.count;
        }
      }

      await updateGoogleAccountLastSync(account.id);
    } catch (err) {
      errors.push(`Fetch failed for ${account.email}: ${err}`);
    }
  }

  // 2. Run AI-pipeline op onverwerkte emails (pre-classifier skipt AI voor
  // notifications/newsletters/cold_outreach, dus 100 is meestal haalbaar)
  let totalProcessed = 0;
  let totalFiltered = 0;
  let totalKept = 0;
  try {
    const unprocessed = await getUnprocessedEmails(MAX_PROCESS_PER_RUN);
    if (unprocessed.length > 0) {
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

      totalProcessed = results.length;
      totalFiltered = results.filter((r) => r.filter_status === "filtered").length;
      totalKept = results.filter((r) => r.filter_status === "kept").length;

      for (const r of results) {
        if (r.errors.length > 0) {
          errors.push(...r.errors.map((e) => `Email ${r.emailId}: ${e}`));
        }
      }
    }
  } catch (err) {
    errors.push(`Pipeline error: ${err}`);
  }

  return NextResponse.json({
    success: true,
    accounts: accounts.length,
    fetched: totalFetched,
    processed: totalProcessed,
    filtered: totalFiltered,
    kept: totalKept,
    lookback_days: MAX_LOOKBACK_DAYS,
    errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
  });
}

export const GET = handleEmailSync;
export const POST = handleEmailSync;
