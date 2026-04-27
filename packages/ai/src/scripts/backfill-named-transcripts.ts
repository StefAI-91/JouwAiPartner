/**
 * Backfill `transcript_elevenlabs_named` voor bestaande meetings.
 *
 * Selecteert meetings met `transcript_elevenlabs IS NOT NULL` en
 * `transcript_elevenlabs_named IS NULL`, draait de speaker-mapping
 * pipeline-stap per meeting, en slaat de named-versie op.
 *
 * Usage:
 *   npx tsx packages/ai/src/scripts/backfill-named-transcripts.ts
 *   npx tsx packages/ai/src/scripts/backfill-named-transcripts.ts --dry-run
 *   npx tsx packages/ai/src/scripts/backfill-named-transcripts.ts --limit 5
 *   npx tsx packages/ai/src/scripts/backfill-named-transcripts.ts --force  # overschrijf bestaande
 *
 * Idempotent: standaard slaat-ie meetings over die al een named-versie hebben.
 * Met `--force` draait-ie alle meetings opnieuw (handig wanneer de prompt
 * verbeterd is en je opnieuw wilt mappen).
 */

import { getAdminClient } from "@repo/database/supabase/admin";
import { runSpeakerMappingStep } from "../pipeline/steps/speaker-mapping";

interface BackfillStats {
  scanned: number;
  mapped_full: number; // alle speakers gemapped
  mapped_partial: number; // sommige speakers nog [speaker_X]
  no_speakers: number; // ElevenLabs-transcript zonder herkenbare speakers
  errors: number;
}

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.info(`[${ts}] ${msg}`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const limitArg = args.find((a) => a.startsWith("--limit"));
  const limit = limitArg
    ? parseInt(limitArg.split("=")[1] ?? args[args.indexOf(limitArg) + 1], 10)
    : undefined;

  log(`Starting backfill (dryRun=${dryRun}, force=${force}, limit=${limit ?? "none"})`);

  const db = getAdminClient();
  let query = db
    .from("meetings")
    .select("id, title, date")
    .not("transcript_elevenlabs", "is", null);
  if (!force) {
    query = query.is("transcript_elevenlabs_named", null);
  }
  query = query.order("date", { ascending: false, nullsFirst: false });
  if (limit) query = query.limit(limit);

  const { data: meetings, error } = await query;
  if (error) {
    log(`Failed to list meetings: ${error.message}`);
    process.exit(1);
  }
  if (!meetings || meetings.length === 0) {
    log("Geen meetings om te backfillen.");
    return;
  }

  log(`${meetings.length} meetings om te verwerken.`);

  const stats: BackfillStats = {
    scanned: 0,
    mapped_full: 0,
    mapped_partial: 0,
    no_speakers: 0,
    errors: 0,
  };

  for (const meeting of meetings) {
    stats.scanned += 1;
    log(`[${stats.scanned}/${meetings.length}] ${meeting.title} (${meeting.date ?? "no-date"})`);

    // Haal alle benodigde transcripts in één query
    const { data: detail, error: detailErr } = await db
      .from("meetings")
      .select("transcript, transcript_elevenlabs")
      .eq("id", meeting.id)
      .single();
    if (detailErr || !detail) {
      log(`  ✗ kon meeting niet ophalen: ${detailErr?.message ?? "no data"}`);
      stats.errors += 1;
      continue;
    }

    if (dryRun) {
      log(
        `  [dry-run] zou speaker-mapping draaien op transcript van ${detail.transcript_elevenlabs?.length ?? 0} chars`,
      );
      continue;
    }

    const result = await runSpeakerMappingStep({
      meetingId: meeting.id,
      elevenLabsTranscript: detail.transcript_elevenlabs,
      firefliesTranscript: detail.transcript,
    });

    if (result.error) {
      log(`  ✗ ${result.error}`);
      stats.errors += 1;
      continue;
    }
    if (result.speaker_count === 0) {
      log(`  - geen speakers herkend`);
      stats.no_speakers += 1;
      continue;
    }
    if (result.mapped_count === result.speaker_count) {
      log(`  ✓ alle ${result.speaker_count} speakers gemapped`);
      stats.mapped_full += 1;
    } else {
      log(
        `  ◐ ${result.mapped_count}/${result.speaker_count} speakers gemapped (rest blijft anoniem)`,
      );
      stats.mapped_partial += 1;
    }
  }

  log("---");
  log(`Stats: ${JSON.stringify(stats, null, 2)}`);
}

main().catch((err) => {
  console.error("Backfill crashed:", err);
  process.exit(1);
});
