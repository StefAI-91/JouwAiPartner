import { config } from "dotenv";
config({ path: ".env.local" });

import { register } from "tsconfig-paths";
import { resolve } from "path";

// Register path aliases so @/* works outside Next.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tsconfig = require(resolve(__dirname, "../tsconfig.json"));
register({
  baseUrl: resolve(__dirname, ".."),
  paths: tsconfig.compilerOptions.paths,
});

import { listFirefliesTranscripts, fetchFirefliesTranscript } from "@/lib/fireflies";
import { processMeeting } from "@/lib/services/gatekeeper-pipeline";

async function main() {
  console.log("Ophalen recente transcripts van Fireflies...\n");

  const transcripts = await listFirefliesTranscripts(5);

  if (transcripts.length === 0) {
    console.log("Geen transcripts gevonden.");
    return;
  }

  console.log("Recente transcripts:");
  transcripts.forEach((t, i) => {
    const date = new Date(Number(t.date)).toLocaleDateString("nl-NL");
    console.log(`  ${i + 1}. ${t.title} (${date}) — ${t.participants.length} deelnemers`);
  });

  // Pak de meest recente
  const latest = transcripts[0];
  console.log(`\nOphalen volledige transcript: "${latest.title}"...\n`);

  const full = await fetchFirefliesTranscript(latest.id);
  if (!full) {
    console.log("Kon transcript niet ophalen.");
    return;
  }

  console.log(`Titel: ${full.title}`);
  console.log(`Datum: ${new Date(Number(full.date)).toLocaleDateString("nl-NL")}`);
  console.log(`Deelnemers: ${full.participants.join(", ")}`);
  console.log(`Zinnen in transcript: ${full.sentences.length}`);

  // Build notes from summary
  const notes = [full.summary.overview, full.summary.notes, full.summary.action_items]
    .filter(Boolean)
    .join("\n\n");

  // Build full transcript text from sentences
  const transcriptText = full.sentences.map((s) => `${s.speaker_name}: ${s.text}`).join("\n");

  console.log(`\nVolledige pipeline draait (Gatekeeper + DB opslag)...\n`);
  const startTime = Date.now();

  const pipelineResult = await processMeeting({
    fireflies_id: full.id,
    title: full.title,
    date: full.date,
    participants: full.participants,
    summary: notes,
    topics: full.summary.topics_discussed || [],
    transcript: transcriptText,
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`Klaar in ${duration}s\n`);
  console.log("=== RESULTAAT ===\n");
  console.log(`Score: ${pipelineResult.gatekeeper.relevance_score}`);
  console.log(`Meeting type: ${pipelineResult.gatekeeper.meeting_type}`);
  console.log(`Party type: ${pipelineResult.gatekeeper.party_type}`);
  console.log(`Organisatie: ${pipelineResult.gatekeeper.organization_name ?? "(intern)"}`);
  console.log(`Reden: ${pipelineResult.gatekeeper.reason}`);
  console.log(`Extracties: ${pipelineResult.extractions_saved}`);
  console.log(`Embedded: ${pipelineResult.embedded}`);

  if (pipelineResult.meetingId) {
    console.log(`\nMeeting opgeslagen in database met ID: ${pipelineResult.meetingId}`);
  } else {
    console.log(`\nMeeting NIET opgeslagen (insert error)`);
  }
}

main().catch(console.error);
