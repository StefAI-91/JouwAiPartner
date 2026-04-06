/**
 * Batch migration script: add project-segmenten to existing verified meetings.
 *
 * Usage:
 *   npx tsx packages/ai/src/scripts/batch-segment-migration.ts
 *   npx tsx packages/ai/src/scripts/batch-segment-migration.ts --dry-run
 *   npx tsx packages/ai/src/scripts/batch-segment-migration.ts --limit 10
 *
 * RULE-019: Only processes meetings WITHOUT existing segments.
 * RULE-020: Does NOT modify meeting.summary or meeting.ai_briefing.
 */

import { getVerifiedMeetingsWithoutSegments } from "@repo/database/queries/meetings";
import { getIgnoredEntityNames } from "@repo/database/queries/ignored-entities";
import { insertMeetingProjectSummaries } from "@repo/database/mutations/meeting-project-summaries";
import { updateSegmentEmbedding } from "@repo/database/mutations/meeting-project-summaries";
import { linkAllMeetingProjects } from "@repo/database/mutations/meetings";
import { buildEntityContext } from "../pipeline/context-injection";
import { runGatekeeper } from "../agents/gatekeeper";
import { runTagger } from "../pipeline/tagger";
import { buildSegments } from "../pipeline/segment-builder";
import { embedBatch } from "../embeddings";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 2000;

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse structured kernpunten and vervolgstappen from a rich summary.
 * The summary format uses ## Kernpunten and ## Vervolgstappen sections.
 */
function parseSummaryContent(summary: string): {
  kernpunten: string[];
  vervolgstappen: string[];
} {
  const kernpunten: string[] = [];
  const vervolgstappen: string[] = [];

  const lines = summary.split("\n");
  let section: "none" | "kernpunten" | "vervolgstappen" = "none";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## Kernpunten")) {
      section = "kernpunten";
      continue;
    }
    if (trimmed.startsWith("## Vervolgstappen")) {
      section = "vervolgstappen";
      continue;
    }
    if (trimmed.startsWith("## ")) {
      section = "none";
      continue;
    }

    if (section === "kernpunten" && trimmed.startsWith("- ")) {
      kernpunten.push(trimmed.slice(2));
    }
    if (section === "vervolgstappen" && trimmed.startsWith("- ")) {
      // Strip checkbox prefix if present
      const content = trimmed.slice(2).replace(/^\[ \] /, "");
      vervolgstappen.push(content);
    }
  }

  return { kernpunten, vervolgstappen };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitArg = args.find((a) => a.startsWith("--limit"));
  const limitIdx = args.indexOf("--limit");
  const maxMeetings = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

  log(`Batch migratie gestart${dryRun ? " (DRY RUN)" : ""}`);

  const meetings = await getVerifiedMeetingsWithoutSegments();
  const toProcess = meetings.slice(0, maxMeetings);

  log(
    `Gevonden: ${meetings.length} meetings zonder segmenten${maxMeetings < Infinity ? `, verwerkt max ${maxMeetings}` : ""}`,
  );

  if (toProcess.length === 0) {
    log("Geen meetings om te verwerken. Klaar.");
    return;
  }

  // Pre-fetch entity context once (shared across all meetings)
  const entityContext = await buildEntityContext();
  log(`Entity context geladen: ${entityContext.projects.length} projecten`);

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const meeting = toProcess[i];

    try {
      // Validate: need summary with kernpunten
      if (!meeting.summary) {
        log(`[${i + 1}/${toProcess.length}] "${meeting.title}" -- SKIP: geen summary`);
        continue;
      }

      const { kernpunten, vervolgstappen } = parseSummaryContent(meeting.summary);
      if (kernpunten.length === 0 && vervolgstappen.length === 0) {
        log(
          `[${i + 1}/${toProcess.length}] "${meeting.title}" -- SKIP: geen kernpunten/vervolgstappen in summary`,
        );
        continue;
      }

      // Use summary as notes for Gatekeeper (not full transcript to save tokens)
      const notesForGatekeeper = meeting.summary.slice(0, 3000);

      // Run Gatekeeper for project identification
      const gatekeeperResult = await runGatekeeper(notesForGatekeeper, {
        title: meeting.title,
        date: meeting.date ?? undefined,
        entityContext: entityContext.contextString,
      });

      const identifiedProjects = gatekeeperResult.identified_projects;

      // Fetch ignored entities for this org
      const ignoredNames = meeting.organization_id
        ? await getIgnoredEntityNames(meeting.organization_id, "project")
        : new Set<string>();

      // Run Tagger
      const taggerOutput = runTagger({
        kernpunten,
        vervolgstappen,
        identified_projects: identifiedProjects,
        ignoredNames,
      });

      // Build segments
      const segments = buildSegments(taggerOutput);

      if (dryRun) {
        log(
          `[DRY RUN] [${i + 1}/${toProcess.length}] "${meeting.title}" -- zou ${segments.length} segment(en) aanmaken:`,
        );
        for (const seg of segments) {
          const name = seg.project_name_raw ?? "Algemeen";
          log(
            `  - ${name} (${seg.kernpunten.length} kernpunten, ${seg.vervolgstappen.length} vervolgstappen)`,
          );
        }
        processed++;
        continue;
      }

      if (segments.length === 0) {
        log(`[${i + 1}/${toProcess.length}] "${meeting.title}" -- 0 segmenten (leeg)`);
        processed++;
        continue;
      }

      // Insert segments
      const segmentRows = segments.map((s) => ({
        meeting_id: meeting.id,
        project_id: s.project_id,
        project_name_raw: s.project_name_raw,
        kernpunten: s.kernpunten,
        vervolgstappen: s.vervolgstappen,
        summary_text: s.summary_text,
      }));

      const insertResult = await insertMeetingProjectSummaries(segmentRows);
      if ("error" in insertResult) {
        log(
          `[${i + 1}/${toProcess.length}] "${meeting.title}" -- ERROR insert: ${insertResult.error}`,
        );
        errors++;
        continue;
      }

      // Embed segments
      try {
        const texts = segments.map((s) => s.summary_text);
        const embeddings = await embedBatch(texts);
        await Promise.all(
          insertResult.ids.map((id, idx) => updateSegmentEmbedding(id, embeddings[idx])),
        );
      } catch (embedErr) {
        const msg = embedErr instanceof Error ? embedErr.message : String(embedErr);
        log(
          `[${i + 1}/${toProcess.length}] "${meeting.title}" -- WARN: embedding failed (${msg}), embedding_stale=true`,
        );
      }

      // Link Gatekeeper projects to meeting
      await linkAllMeetingProjects(meeting.id, identifiedProjects);

      log(
        `[${i + 1}/${toProcess.length}] "${meeting.title}" -- ${segments.length} segment(en) aangemaakt`,
      );
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`[${i + 1}/${toProcess.length}] "${meeting.title}" -- ERROR: ${msg} (skipped)`);
      errors++;
    }

    // Rate limiting: pause between batches
    if ((i + 1) % BATCH_SIZE === 0 && i + 1 < toProcess.length) {
      log(`Pauze ${BATCH_DELAY_MS}ms na batch van ${BATCH_SIZE}...`);
      await sleep(BATCH_DELAY_MS);
    }
  }

  log(`Batch migratie voltooid: ${processed}/${toProcess.length} verwerkt, ${errors} errors`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
