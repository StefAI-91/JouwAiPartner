import { getAdminClient } from "../supabase/admin";

/**
 * Slack notification event types that can trigger alerts.
 */
export const SLACK_NOTIFY_EVENTS = ["critical_issue", "high_bug", "priority_urgent"] as const;

export type SlackNotifyEvent = (typeof SLACK_NOTIFY_EVENTS)[number];

export interface SlackProjectConfig {
  webhook_url: string;
  notify_events: string[];
}

/**
 * Fetch Slack config for a project from the dedicated project_slack_config table.
 * Uses admin client because this table has admin-only RLS.
 * Returns null if no config exists for this project.
 */
export async function getSlackConfig(projectId: string): Promise<SlackProjectConfig | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from("project_slack_config")
    .select("webhook_url, notify_events")
    .eq("project_id", projectId)
    .single();

  if (error || !data) return null;
  return data as SlackProjectConfig;
}

/**
 * Determine which Slack event (if any) an issue triggers based on its classification.
 */
export function resolveSlackEvent(issue: {
  type: string;
  severity: string | null;
  priority: string;
}): SlackNotifyEvent | null {
  if (issue.type === "bug" && issue.severity === "critical") {
    return "critical_issue";
  }
  if (issue.type === "bug" && issue.severity === "high") {
    return "high_bug";
  }
  if (issue.priority === "urgent") {
    return "priority_urgent";
  }
  return null;
}

export interface SlackIssuePayload {
  issueId: string;
  issueNumber: number;
  title: string;
  projectName: string;
  severity: string | null;
  priority: string;
  type: string;
  component: string | null;
  trigger: "classification" | "priority_change" | "severity_change";
  url?: string;
}

/**
 * Build a Slack Block Kit message for an urgent issue alert.
 */
function buildSlackBlocks(payload: SlackIssuePayload) {
  const emoji =
    payload.severity === "critical"
      ? ":rotating_light:"
      : payload.severity === "high"
        ? ":warning:"
        : ":bell:";

  const severityLabel = payload.severity ?? "onbekend";
  const triggerLabel =
    payload.trigger === "classification"
      ? "Nieuw geclassificeerd"
      : payload.trigger === "severity_change"
        ? `Severity gewijzigd naar ${severityLabel}`
        : "Priority geëscaleerd naar urgent";

  const issueUrl =
    payload.url ??
    `${process.env.NEXT_PUBLIC_DEVHUB_URL ?? "http://localhost:3001"}/issues/${payload.issueId}`;

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} *#${payload.issueNumber} ${payload.title}*`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Trigger:*\n${triggerLabel}`,
          },
          {
            type: "mrkdwn",
            text: `*Severity:*\n${severityLabel}`,
          },
          {
            type: "mrkdwn",
            text: `*Project:*\n${payload.projectName}`,
          },
          {
            type: "mrkdwn",
            text: `*Component:*\n${payload.component ?? "onbekend"}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Bekijk issue →",
            },
            url: issueUrl,
          },
        ],
      },
    ],
  };
}

/**
 * Send a Slack notification for an urgent issue.
 * Fire-and-forget: logs errors but never throws.
 */
export async function sendSlackNotification(
  webhookUrl: string,
  payload: SlackIssuePayload,
): Promise<boolean> {
  try {
    const body = buildSlackBlocks(payload);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(
        `[sendSlackNotification] Slack responded ${response.status}: ${await response.text()}`,
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("[sendSlackNotification] Failed to send:", err);
    return false;
  }
}

/**
 * Check if a project has Slack notifications enabled for a given event,
 * and send the notification if so. Fire-and-forget.
 */
export async function notifySlackIfUrgent(
  projectId: string,
  event: SlackNotifyEvent,
  payload: SlackIssuePayload,
): Promise<boolean> {
  const config = await getSlackConfig(projectId);

  if (!config?.webhook_url) return false;
  if (!config.notify_events.includes(event)) return false;

  return sendSlackNotification(config.webhook_url, payload);
}
