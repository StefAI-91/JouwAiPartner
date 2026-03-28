import { getPendingMatches } from "@/lib/queries/pending-matches";

/**
 * Format pending matches into a Slack message.
 */
function formatSlackMessage(pendingMatches: Awaited<ReturnType<typeof getPendingMatches>>): string {
  const grouped = new Map<string, typeof pendingMatches>();
  for (const match of pendingMatches) {
    const existing = grouped.get(match.extracted_name) || [];
    existing.push(match);
    grouped.set(match.extracted_name, existing);
  }

  const lines: string[] = [
    `:mag: *Dagelijks overzicht: ongematchte entiteiten*`,
    `Er staan *${pendingMatches.length} items* zonder projectkoppeling.`,
    "",
  ];

  for (const [name, matches] of grouped) {
    const count = matches.length;
    const tables = [...new Set(matches.map((m) => m.content_table))].join(", ");
    lines.push(`• *"${name}"* — ${count}x gevonden in: ${tables}`);

    const withSuggestion = matches.find((m) => m.suggested_match_id);
    if (withSuggestion && withSuggestion.similarity_score) {
      lines.push(`  └ Mogelijke match (similarity: ${withSuggestion.similarity_score.toFixed(2)})`);
    }
  }

  return lines.join("\n");
}

/**
 * Generate and send a daily digest of pending matches to Slack.
 */
export async function sendPendingMatchesDigest(): Promise<void> {
  const pendingMatches = await getPendingMatches();

  if (pendingMatches.length === 0) {
    console.log("No pending matches to report.");
    return;
  }

  const message = formatSlackMessage(pendingMatches);

  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    console.error("SLACK_WEBHOOK_URL not set — cannot send digest");
    return;
  }

  await fetch(slackWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });

  console.log(`Sent digest with ${pendingMatches.length} pending matches to Slack.`);
}
