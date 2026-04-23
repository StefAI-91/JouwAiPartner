/**
 * TH-011 (FUNC-278) — One-off batch: Theme-Detector + link-themes over alle
 * verified meetings. Vervangt `scripts/batch-tag-themes.ts` (TH-003).
 *
 * Doel: bij launch van de extract-time theme scoping zijn de meeting_themes-
 * en extraction_themes-rijen direct gevuld. Draait lokaal via:
 *
 *     npx tsx scripts/batch-detect-themes.ts
 *     npx tsx scripts/batch-detect-themes.ts --limit=5
 *     npx tsx scripts/batch-detect-themes.ts --force --limit=20
 *
 * Default-modus is idempotent: meetings met bestaande meeting_themes-rijen
 * worden overgeslagen. `--force` her-detect ook die, met `replace: true` in
 * de link-themes step zodat er geen stale matches blijven staan.
 *
 * Pipeline per meeting: Theme-Detector → link-themes. Summarizer wordt NIET
 * opnieuw gedraaid (consistent met de regenerate-action in FUNC-283): dat
 * zou bestaande summary/extraction-edits van reviewers kunnen overschrijven.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import {
  listVerifiedMeetingIdsOrderedByDate,
  getVerifiedMeetingById,
  type VerifiedMeetingIdRow,
} from "@repo/database/queries/meetings";
import { listTaggedMeetingIds } from "@repo/database/queries/meeting-themes";
import { runThemeDetectorStep } from "@repo/ai/pipeline/steps/theme-detector";
import { runLinkThemesStep } from "@repo/ai/pipeline/steps/link-themes";

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
      console.warn(`[batch-detect-themes] unknown arg: ${arg}`);
    }
  }
  return { force, limit, concurrency };
}

async function fetchTargetMeetings(args: BatchArgs): Promise<VerifiedMeetingIdRow[]> {
  if (args.force) {
    return listVerifiedMeetingIdsOrderedByDate({ limit: args.limit ?? undefined });
  }

  const taggedIds = await listTaggedMeetingIds();
  const candidates = await listVerifiedMeetingIdsOrderedByDate({
    limit: args.limit ? args.limit * 2 : undefined,
  });
  const remaining = candidates.filter((m) => !taggedIds.has(m.id));
  return args.limit ? remaining.slice(0, args.limit) : remaining;
}

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
    `[batch-detect-themes] start — force=${args.force}, limit=${args.limit ?? "∞"}, concurrency=${args.concurrency}`,
  );

  const targets = await fetchTargetMeetings(args);
  if (targets.length === 0) {
    console.log("[batch-detect-themes] 0 meetings to process — niks te doen.");
    return;
  }
  console.log(`[batch-detect-themes] ${targets.length} meetings te verwerken`);

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
      // Volledige meeting-context ophalen voor de Theme-Detector. Detector
      // heeft meer context nodig dan alleen title + summary (meeting_type,
      // party_type, participants).
      const full = await getVerifiedMeetingById(meeting.id);
      if (!full) {
        results.skipped += 1;
        console.log(`${label} → skipped (meeting niet gevonden)`);
        return;
      }

      const detector = await runThemeDetectorStep({
        meeting: {
          meetingId: meeting.id,
          title: full.title ?? "",
          meeting_type: full.meeting_type ?? "team_sync",
          party_type: full.party_type ?? "internal",
          participants: full.meeting_participants.map((mp) => mp.person.name),
          summary: full.summary ?? "",
          identifiedProjects: [],
        },
      });
      if (detector.error) {
        results.failed += 1;
        console.warn(`${label} → detector failed: ${detector.error}`);
        return;
      }

      const result = await runLinkThemesStep({
        meetingId: meeting.id,
        detectorOutput: detector.output,
        replace: args.force,
      });

      if (result.skipped) {
        results.skipped += 1;
        console.log(`${label} → skipped (${result.skipped})`);
        return;
      }
      if (!result.success) {
        results.failed += 1;
        console.warn(`${label} → link-themes failed: ${result.error}`);
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

  console.log("\n[batch-detect-themes] klaar:");
  console.log(`  success:   ${results.success}`);
  console.log(`  skipped:   ${results.skipped}`);
  console.log(`  failed:    ${results.failed}`);
  console.log(`  matches:   ${results.matches_total}`);
  console.log(`  proposals: ${results.proposals_total}`);
}

main().catch((err) => {
  console.error("[batch-detect-themes] fatal:", err);
  process.exit(1);
});
