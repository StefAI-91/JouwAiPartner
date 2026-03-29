import { embedText } from "@/lib/embeddings";
import { getAdminClient } from "@/lib/supabase/admin";
import { matchDecisions, matchMeetings, getMeetingTitle } from "@/lib/queries/decisions";

interface Conflict {
  target_id: string;
  target_table: string;
  target_content: string;
  similarity: number;
}

interface ConflictResult {
  has_conflict: boolean;
  conflicts: Conflict[];
}

/**
 * Check a new decision against existing content for potential conflicts.
 * Similarity > 0.8 triggers conflict detection.
 */
async function checkForConflicts(
  decisionText: string,
  sourceId: string,
  threshold: number = 0.8,
): Promise<ConflictResult> {
  const embedding = await embedText(decisionText, "search_query");
  const conflicts: Conflict[] = [];

  // Search existing decisions
  const similarDecisions = await matchDecisions(embedding, threshold, 5);
  for (const match of similarDecisions) {
    if (match.source_id === sourceId) continue;
    conflicts.push({
      target_id: match.id,
      target_table: "decisions",
      target_content: match.decision,
      similarity: match.similarity,
    });
  }

  // Search existing meetings
  const similarMeetings = await matchMeetings(embedding, threshold, 5);
  for (const match of similarMeetings) {
    if (match.id === sourceId) continue;
    conflicts.push({
      target_id: match.id,
      target_table: "meetings",
      target_content: match.summary || match.title,
      similarity: match.similarity,
    });
  }

  return { has_conflict: conflicts.length > 0, conflicts };
}

/**
 * Create update suggestions for detected conflicts.
 * The system NEVER auto-modifies — only creates suggestions for human review.
 */
async function createUpdateSuggestions(
  newDecisionText: string,
  triggerSourceId: string,
  triggerSourceType: string,
  conflicts: Conflict[],
): Promise<number> {
  let created = 0;

  for (const conflict of conflicts) {
    const typeLabel = conflict.target_table === "decisions" ? "beslissing" : "meeting-inhoud";

    await getAdminClient()
      .from("update_suggestions")
      .insert({
        target_content_id: conflict.target_id,
        target_table: conflict.target_table,
        trigger_source_id: triggerSourceId,
        trigger_source_type: triggerSourceType,
        current_content: conflict.target_content,
        new_content: newDecisionText,
        reason: `Nieuw besluit conflicteert mogelijk met bestaande ${typeLabel} (similarity: ${conflict.similarity.toFixed(3)}).`,
        status: "pending",
      });
    created++;
  }

  return created;
}

/**
 * Send conflict notification to Slack.
 */
async function notifyConflictToSlack(
  newDecisionText: string,
  meetingId: string,
  conflicts: Conflict[],
): Promise<void> {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    console.error("SLACK_WEBHOOK_URL not set — cannot send conflict notification");
    return;
  }

  const meeting = await getMeetingTitle(meetingId);
  const meetingTitle = meeting?.title || "Onbekende meeting";
  const meetingDate = meeting?.date
    ? new Date(meeting.date).toLocaleDateString("nl-NL")
    : "onbekende datum";

  const conflictLines = conflicts.map((c) => {
    const typeLabel = c.target_table === "decisions" ? "beslissing" : "meeting";
    const preview =
      c.target_content.length > 100 ? c.target_content.slice(0, 100) + "..." : c.target_content;
    return `  • ${typeLabel}: "${preview}" (similarity: ${c.similarity.toFixed(2)})`;
  });

  const message = [
    `:warning: *Conflict gedetecteerd*`,
    "",
    `*Nieuw besluit* uit meeting "${meetingTitle}" (${meetingDate}):`,
    `> ${newDecisionText}`,
    "",
    `*Conflicteert mogelijk met:*`,
    ...conflictLines,
    "",
    `_Review nodig. Bekijk via MCP of in de database._`,
  ].join("\n");

  await fetch(slackWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });
}

/**
 * Full impact check pipeline for a single decision.
 * Called after saving a decision in save-extractions.
 */
export async function runImpactCheck(
  decisionText: string,
  meetingId: string,
): Promise<{ conflicts_found: number; suggestions_created: number }> {
  const conflictResult = await checkForConflicts(decisionText, meetingId);

  if (!conflictResult.has_conflict) {
    return { conflicts_found: 0, suggestions_created: 0 };
  }

  const suggestionsCreated = await createUpdateSuggestions(
    decisionText,
    meetingId,
    "meeting",
    conflictResult.conflicts,
  );

  await notifyConflictToSlack(decisionText, meetingId, conflictResult.conflicts);

  return {
    conflicts_found: conflictResult.conflicts.length,
    suggestions_created: suggestionsCreated,
  };
}
