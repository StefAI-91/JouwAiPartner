import { runGatekeeper } from "@/lib/agents/gatekeeper";
import { GatekeeperOutput } from "@/lib/validations/gatekeeper";
import { embedText } from "@/lib/embeddings";
import { searchAllContent } from "@/lib/queries/content";
import { insertMeeting } from "@/lib/actions/meetings";
import { insertContentReview } from "@/lib/actions/content-reviews";
import { saveExtractions } from "@/lib/services/save-extractions";
import { getMeetingExtractions } from "@/lib/queries/meetings";
import { updateRowEmbedding } from "@/lib/actions/embeddings";

interface MeetingInput {
  fireflies_id: string;
  title: string;
  date: string;
  participants: string[];
  summary: string;
  topics: string[];
  transcript: string;
}

/**
 * Check if content is too similar to existing entries.
 * Returns true if content is novel (should proceed), false if duplicate.
 */
async function isNovel(
  text: string,
  threshold: number = 0.92,
): Promise<{ novel: boolean; similarId?: string; similarity?: number }> {
  const embedding = await embedText(text);
  const data = await searchAllContent(embedding, threshold, 1);

  if (data.length === 0) {
    return { novel: true };
  }

  return {
    novel: false,
    similarId: data[0].id,
    similarity: data[0].similarity,
  };
}

/**
 * Log every Gatekeeper decision for transparency and tuning.
 */
async function logGatekeeperDecision(
  contentId: string | null,
  result: GatekeeperOutput,
): Promise<void> {
  await insertContentReview({
    content_id: contentId || "00000000-0000-0000-0000-000000000000",
    content_table: "meetings",
    agent_role: "gatekeeper",
    action: result.action === "pass" ? "admitted" : "rejected",
    reason: result.reason,
    metadata: {
      relevance_score: result.relevance_score,
      category: result.category,
      entities: result.entities,
      decisions_count: result.decisions.length,
      action_items_count: result.action_items.length,
    },
  });
}

/**
 * Generate and store embedding for a meeting, enriched with its extractions.
 */
async function embedMeeting(meetingId: string, input: MeetingInput): Promise<void> {
  const extractions = await getMeetingExtractions(meetingId);

  const parts: string[] = [];
  if (input.title) parts.push(`Meeting: ${input.title}`);
  if (input.participants.length) parts.push(`Deelnemers: ${input.participants.join(", ")}`);
  if (input.summary) parts.push(`Samenvatting: ${input.summary}`);

  if (extractions.length > 0) {
    parts.push("Extracties:\n" + extractions.map((e) => `- [${e.type}] ${e.content}`).join("\n"));
  }

  const embedding = await embedText(parts.join("\n\n"));
  await updateRowEmbedding("meetings", meetingId, embedding);
}

/**
 * Run a meeting through the Gatekeeper pipeline.
 * Returns the Gatekeeper result and the inserted meeting ID (or null if rejected).
 */
export async function processMeeting(
  input: MeetingInput,
): Promise<{ result: GatekeeperOutput; meetingId: string | null }> {
  const result = await runGatekeeper(input.summary, {
    title: input.title,
    participants: input.participants,
    date: input.date,
    topics: input.topics,
  });

  let meetingId: string | null = null;

  if (result.action === "pass") {
    // Novelty check — reject duplicates
    const noveltyCheck = await isNovel(input.summary);

    if (!noveltyCheck.novel) {
      await logGatekeeperDecision(null, {
        ...result,
        action: "reject",
        reason: `Duplicate detected. Similar to existing entry ${noveltyCheck.similarId} (similarity: ${noveltyCheck.similarity?.toFixed(3)})`,
      });
      return { result: { ...result, action: "reject" }, meetingId: null };
    }

    // Score >= 0.6 -> insert the meeting
    const insertResult = await insertMeeting({
      fireflies_id: input.fireflies_id,
      title: input.title,
      date: new Date(Number(input.date)).toISOString(),
      participants: input.participants,
      summary: input.summary,
      action_items: result.action_items,
      transcript: input.transcript,
      relevance_score: result.relevance_score,
      status: "active",
      category: result.category,
      embedding_stale: true,
    });

    if ("error" in insertResult) {
      console.error("Meeting insert error:", insertResult.error);
    } else {
      meetingId = insertResult.data.id;
    }
  }

  // Log the decision to content_reviews (always, for audit trail)
  await logGatekeeperDecision(meetingId, result);

  // Save extracted data (decisions, action_items) with entity resolution
  if (result.action === "pass" && meetingId) {
    await saveExtractions(result, meetingId);

    // Generate embedding for the meeting (enriched with extractions)
    await embedMeeting(meetingId, input);
  }

  return { result, meetingId };
}
