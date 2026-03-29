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

  const { result, meetingId } = await processMeeting({
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
  console.log(`Score: ${result.relevance_score}`);
  console.log(`Actie: ${result.action}`);
  console.log(`Reden: ${result.reason}`);

  if (meetingId) {
    console.log(`\nMeeting opgeslagen in database met ID: ${meetingId}`);
    console.log(`Besluiten opgeslagen: ${result.decisions.length}`);
    console.log(`Actiepunten opgeslagen: ${result.action_items.length}`);
  } else {
    console.log(`\nMeeting NIET opgeslagen (actie: ${result.action})`);
  }
}

main().catch(console.error);
