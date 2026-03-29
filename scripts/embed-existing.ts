import { config } from "dotenv";
config({ path: ".env.local" });

import { register } from "tsconfig-paths";
import { resolve } from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tsconfig = require(resolve(__dirname, "../tsconfig.json"));
register({ baseUrl: resolve(__dirname, ".."), paths: tsconfig.compilerOptions.paths });

import { getAdminClient } from "@/lib/supabase/admin";
import { getMeetingExtractions } from "@/lib/queries/meetings";
import { embedText } from "@/lib/embeddings";
import { updateRowEmbedding } from "@/lib/actions/embeddings";

const MEETING_ID = "f43219a7-850f-4c8c-9ed4-6d4f09ee04b0";

async function main() {
  const supabase = getAdminClient();

  // Fetch the meeting
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, title, participants, summary, transcript, embedding_stale")
    .eq("id", MEETING_ID)
    .single();

  if (!meeting) {
    console.log("Meeting niet gevonden.");
    return;
  }

  console.log(`Meeting: ${meeting.title}`);
  console.log(`Embedding stale: ${meeting.embedding_stale}`);

  // Get extractions
  const { decisions, actionItems } = await getMeetingExtractions(MEETING_ID);
  console.log(`Decisions: ${decisions.length}, Action items: ${actionItems.length}`);

  // Build enriched text
  const parts: string[] = [];
  if (meeting.title) parts.push(`Meeting: ${meeting.title}`);
  if (meeting.participants?.length) parts.push(`Deelnemers: ${meeting.participants.join(", ")}`);
  if (meeting.summary) parts.push(`Samenvatting: ${meeting.summary}`);
  if (decisions.length > 0) {
    parts.push(
      "Besluiten:\n" + decisions.map((d) => `- ${d.decision} (door ${d.made_by})`).join("\n"),
    );
  }
  if (actionItems.length > 0) {
    parts.push(
      "Actiepunten:\n" +
        actionItems
          .map((a) => `- ${a.description}${a.assignee ? ` (${a.assignee})` : ""}`)
          .join("\n"),
    );
  }

  const embedText_ = parts.join("\n\n");
  console.log(`\nEmbed tekst lengte: ${embedText_.length} chars`);

  // Generate embedding
  console.log("\nEmbedding genereren (OpenAI text-embedding-3-small)...");
  const startTime = Date.now();
  const embedding = await embedText(embedText_);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`Embedding gegenereerd in ${duration}s (${embedding.length} dimensies)`);

  // Store embedding
  await updateRowEmbedding("meetings", MEETING_ID, embedding);
  console.log("Embedding opgeslagen, embedding_stale = false");

  // Verify
  const { data: updated } = await supabase
    .from("meetings")
    .select("embedding_stale")
    .eq("id", MEETING_ID)
    .single();

  console.log(`\nVerificatie — embedding_stale: ${updated?.embedding_stale}`);
}

main().catch(console.error);
