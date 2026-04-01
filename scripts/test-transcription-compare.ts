/**
 * Test script: Compare Fireflies transcript vs OpenAI gpt-4o-transcribe
 *
 * Usage:
 *   npx tsx scripts/test-transcription-compare.ts [fireflies_meeting_id]
 *
 * Required env vars:
 *   FIREFLIES_API_KEY  — Fireflies API key
 *   OPENAI_API_KEY     — OpenAI API key
 *
 * Without a meeting ID, it lists the 5 most recent transcripts to choose from.
 */

import { listFirefliesTranscripts, fetchFirefliesTranscript } from "../packages/ai/src/fireflies";
import { transcribeAudioUrl } from "../packages/ai/src/transcribe";

// ── Helpers ────────────────────────────────────────────────────────

function wordTokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\sáàâäéèêëíìîïóòôöúùûüñç]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function computeWER(reference: string[], hypothesis: string[]): number {
  const n = reference.length;
  const m = hypothesis.length;
  const d: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = reference[i - 1] === hypothesis[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }

  return n === 0 ? 0 : d[n][m] / n;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  const meetingId = process.argv[2];

  if (!process.env.FIREFLIES_API_KEY) {
    console.error("❌ FIREFLIES_API_KEY is not set");
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY is not set");
    process.exit(1);
  }

  // List recent transcripts if no ID given
  if (!meetingId) {
    console.log("Geen meeting ID opgegeven. Recente transcripts:\n");
    const recent = await listFirefliesTranscripts(5);
    for (const t of recent) {
      const date = new Date(Number(t.date)).toLocaleDateString("nl-NL");
      console.log(`  ${t.id}  ${date}  ${t.title}`);
    }
    console.log("\nGebruik: npx tsx scripts/test-transcription-compare.ts <meeting_id>");
    return;
  }

  // 1. Fetch Fireflies transcript
  console.log(`\n🔥 Ophalen Fireflies transcript: ${meetingId}...`);
  const ff = await fetchFirefliesTranscript(meetingId);
  if (!ff) {
    console.error("❌ Kon transcript niet ophalen van Fireflies");
    process.exit(1);
  }

  console.log(`   Titel: ${ff.title}`);
  console.log(`   Datum: ${new Date(Number(ff.date)).toLocaleDateString("nl-NL")}`);
  console.log(`   Deelnemers: ${ff.participants.join(", ")}`);
  console.log(`   Zinnen: ${ff.sentences.length}`);

  // 2. Check audio URL
  if (!ff.audio_url) {
    console.error("❌ Geen audio_url beschikbaar voor dit transcript.");
    console.log("   Mogelijk is audio opslag niet ingeschakeld in Fireflies settings.");
    console.log("   Ga naar app.fireflies.ai → Settings → Audio Storage");
    process.exit(1);
  }

  console.log(`   Audio URL: ${ff.audio_url.substring(0, 80)}...`);

  // 3. Build Fireflies full text (reference)
  const ffText = ff.sentences.map((s) => s.text).join(" ");
  const ffWords = wordTokenize(ffText);
  console.log(`   Fireflies woorden: ${ffWords.length}`);

  // 4. Transcribe with OpenAI
  console.log(`\n🤖 Transcriberen met OpenAI gpt-4o-transcribe (taal: nl)...`);
  const startTime = Date.now();

  const openaiResult = await transcribeAudioUrl(ff.audio_url, {
    language: "nl",
    prompt: `Meeting transcript. Deelnemers: ${ff.participants.join(", ")}`,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const openaiWords = wordTokenize(openaiResult.text);

  console.log(`   Klaar in ${elapsed}s`);
  console.log(`   Audio duur: ${formatDuration(openaiResult.duration)}`);
  console.log(`   Taal gedetecteerd: ${openaiResult.language}`);
  console.log(`   OpenAI woorden: ${openaiWords.length}`);
  console.log(`   Segmenten: ${openaiResult.segments.length}`);

  // 5. Compare
  console.log("\n📊 Vergelijking\n");
  console.log("─".repeat(60));

  const wer = computeWER(ffWords, openaiWords);
  console.log(`   Word Error Rate (OpenAI vs Fireflies): ${(wer * 100).toFixed(1)}%`);
  console.log(`   Woorden Fireflies: ${ffWords.length}`);
  console.log(`   Woorden OpenAI:    ${openaiWords.length}`);
  console.log(`   Verschil:          ${Math.abs(openaiWords.length - ffWords.length)} woorden`);

  // 6. Show sample comparison (first ~200 words)
  const sampleLen = 200;
  console.log("\n─".repeat(60));
  console.log("\n📝 Sample Fireflies (eerste ~200 woorden):\n");
  console.log(ffWords.slice(0, sampleLen).join(" "));
  console.log("\n📝 Sample OpenAI (eerste ~200 woorden):\n");
  console.log(openaiWords.slice(0, sampleLen).join(" "));

  // 7. Summary
  console.log("\n" + "─".repeat(60));
  console.log("\n✅ Samenvatting:");
  console.log(`   Fireflies: ${ffWords.length} woorden`);
  console.log(`   OpenAI:    ${openaiWords.length} woorden`);
  console.log(`   WER:       ${(wer * 100).toFixed(1)}%`);
  if (wer < 0.1) {
    console.log("   → Zeer goede overeenkomst (<10% WER)");
  } else if (wer < 0.2) {
    console.log("   → Redelijke overeenkomst (10-20% WER)");
  } else {
    console.log("   → Significant verschil (>20% WER) — OpenAI transcriptie wijkt sterk af");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
