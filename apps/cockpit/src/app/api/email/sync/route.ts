import { NextResponse } from "next/server";
import { createClient } from "@repo/database/supabase/server";
import { listActiveGoogleAccounts } from "@repo/database/queries/emails";
import { getExistingGmailIds, getUnprocessedEmails } from "@repo/database/queries/emails";
import {
  insertEmails,
  updateGoogleAccountTokens,
  updateGoogleAccountLastSync,
} from "@repo/database/mutations/emails";
import { fetchEmails } from "@repo/ai/gmail";
import { processEmailBatch } from "@repo/ai/pipeline/email-pipeline";

export const maxDuration = 300;

/**
 * POST /api/email/sync
 * Manual email sync: fetches new emails from all connected Google accounts,
 * stores them, then runs the AI pipeline on unprocessed emails.
 */
export async function POST() {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await listActiveGoogleAccounts();

  if (accounts.length === 0) {
    return NextResponse.json({ error: "No connected Google accounts" }, { status: 400 });
  }

  let totalFetched = 0;
  let totalProcessed = 0;
  const errors: string[] = [];

  // 1. Fetch new emails from each connected account
  for (const account of accounts) {
    try {
      const tokens = {
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: new Date(account.token_expiry).getTime(),
      };

      // Fetch emails since last sync, or last 7 days for first sync
      const afterDate = account.last_sync_at
        ? new Date(account.last_sync_at).toISOString().split("T")[0].replace(/-/g, "/")
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]
            .replace(/-/g, "/");

      const { messages, newTokens } = await fetchEmails(tokens, {
        maxResults: 5,
        afterDate,
      });

      // Update tokens if refreshed
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

      // Filter out already-stored emails
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
          // Gmail always stamps user-sent messages with the SENT label.
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

  // 2. Process unprocessed emails through AI pipeline
  try {
    const unprocessed = await getUnprocessedEmails(5);

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

      totalProcessed = results.filter((r) => r.classifier !== null).length;
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
    fetched: totalFetched,
    processed: totalProcessed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
