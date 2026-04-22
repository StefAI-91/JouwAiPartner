/**
 * TH-003 — One-off batch: ThemeTagger over alle verified meetings.
 *
 * Doel: bij launch van de themes-feature is de junction-tabel niet leeg zodat
 * dashboard-pills en de donut direct gevulde data tonen. Draait lokaal via:
 *
 *     npx tsx scripts/batch-tag-themes.ts
 *     npx tsx scripts/batch-tag-themes.ts --limit=5
 *     npx tsx scripts/batch-tag-themes.ts --force --limit=20
 *
 * Default-modus is idempotent: meetings met bestaande meeting_themes-rijen
 * worden overgeslagen. `--force` hertagt ook die, met `replace: true` in de
 * step zodat er geen stale matches blijven staan.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { getAdminClient } from "@repo/database/supabase/admin";
import { runTagThemesStep } from "@repo/ai/pipeline/steps/tag-themes";

const DEFAULT_CONCURRENCY = 5;

interface BatchArgs {
  force: boolean;
  limit: number | null;
  concurrency: number;
}

function parseArgs(argv: string[]): BatchArgs {
  let force = false;
  let limit: number | null = null;
  let concurrency = DEFAULT_CONCURRENCY;

  for (const arg of argv.slice(2)) {
    if (arg === "--force") force = true;
    else if (arg.startsWith("--limit=")) limit = Number(arg.slice("--limit=".length));
    else if (arg.startsWith("--concurrency=")) {
      concurrency = Number(arg.slice("--concurrency=".length));
    } else {
      console.warn(`[batch-tag-themes] unknown arg: ${arg}`);
    }
  }
  return { force, limit, concurrency };
}

async function fetchTargetMeetings(
  args: BatchArgs,
): Promise<Array<{ id: string; title: string | null; summary: string | null }>> {
  const db = getAdminClient();

  if (args.force) {
    const query = db
      .from("meetings")
      .select("id, title, summary")
      .eq("verification_status", "verified")
      .order("date", { ascending: false });
    if (args.limit) query.limit(args.limit);
    const { data, error } = await query;
    if (error) throw new Error(`meetings fetch failed: ${error.message}`);
    return data ?? [];
  }

  // Idempotent-modus: skip meetings die al meeting_themes-rijen hebben.
  const { data: taggedRows, error: taggedErr } = await db
    .from("meeting_themes")
    .select("meeting_id");
  if (taggedErr) throw new Error(`tagged-meetings fetch failed: ${taggedErr.message}`);

  const taggedIds = new Set((taggedRows ?? []).map((r) => r.meeting_id));

  const query = db
    .from("meetings")
    .select("id, title, summary")
    .eq("verification_status", "verified")
    .order("date", { ascending: false });
  if (args.limit) query.limit(args.limit * 2); // overshoot zodat skips niet onder limit duwen
  const { data, error } = await query;
  if (error) throw new Error(`meetings fetch failed: ${error.message}`);

  const remaining = (data ?? []).filter((m) => !taggedIds.has(m.id));
  return args.limit ? remaining.slice(0, args.limit) : remaining;
}

/**
 * Simpele concurrency-limiter zonder p-limit dependency. Start batches van
 * `concurrency` workers en wacht tot allemaal klaar zijn voor de volgende.
 */
async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    await Promise.all(batch.map((item, j) => worker(item, i + j)));
  }
}

async function main() {
  const args = parseArgs(process.argv);
  console.log(
    `[batch-tag-themes] start — force=${args.force}, limit=${args.limit ?? "∞"}, concurrency=${args.concurrency}`,
  );

  const targets = await fetchTargetMeetings(args);
  if (targets.length === 0) {
    console.log("[batch-tag-themes] 0 meetings to process — niks te doen.");
    return;
  }
  console.log(`[batch-tag-themes] ${targets.length} meetings te verwerken`);

  const results = {
    success: 0,
    skipped: 0,
    failed: 0,
    matches_total: 0,
    proposals_total: 0,
  };

  await runWithConcurrency(targets, args.concurrency, async (meeting, index) => {
    const label = `[${index + 1}/${targets.length}] ${meeting.id} — ${meeting.title ?? "(geen titel)"}`;
    try {
      const result = await runTagThemesStep({
        meetingId: meeting.id,
        meetingTitle: meeting.title ?? "",
        summary: meeting.summary ?? "",
        replace: args.force,
      });

      if (result.skipped) {
        results.skipped += 1;
        console.log(`${label} → skipped (${result.skipped})`);
        return;
      }
      if (!result.success) {
        results.failed += 1;
        console.warn(`${label} → failed: ${result.error}`);
        return;
      }
      results.success += 1;
      results.matches_total += result.matches_saved;
      results.proposals_total += result.proposals_saved;
      console.log(
        `${label} → ${result.matches_saved} matches, ${result.proposals_saved} proposals`,
      );
    } catch (err) {
      results.failed += 1;
      console.error(`${label} → crashed:`, err instanceof Error ? err.message : err);
    }
  });

  console.log("\n[batch-tag-themes] klaar:");
  console.log(`  success:   ${results.success}`);
  console.log(`  skipped:   ${results.skipped}`);
  console.log(`  failed:    ${results.failed}`);
  console.log(`  matches:   ${results.matches_total}`);
  console.log(`  proposals: ${results.proposals_total}`);
}

main().catch((err) => {
  console.error("[batch-tag-themes] fatal:", err);
  process.exit(1);
});
