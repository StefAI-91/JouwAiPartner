"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";
import { SLACK_NOTIFY_EVENTS } from "@repo/database/integrations/slack";
import { upsertSlackConfig, deleteSlackConfig } from "@repo/database/mutations/slack-config";

const updateSlackConfigSchema = z.object({
  projectId: z.string().uuid(),
  webhookUrl: z
    .string()
    .url()
    .startsWith("https://hooks.slack.com/", "Moet een Slack webhook URL zijn")
    .or(z.literal("")),
  notifyEvents: z.array(z.enum(SLACK_NOTIFY_EVENTS)),
});

export async function updateSlackConfigAction(
  input: z.input<typeof updateSlackConfigSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  if (!(await isAdmin(user.id))) {
    return { error: "Alleen admins kunnen Slack instellingen wijzigen" };
  }

  const parsed = updateSlackConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  if (parsed.data.webhookUrl) {
    // Upsert: insert or update config
    const result = await upsertSlackConfig({
      projectId: parsed.data.projectId,
      webhookUrl: parsed.data.webhookUrl,
      notifyEvents: parsed.data.notifyEvents,
    });
    if ("error" in result) {
      console.error("[updateSlackConfigAction]", result.error);
      return { error: "Opslaan mislukt" };
    }
  } else {
    // Empty URL = disable notifications, delete the config row
    const result = await deleteSlackConfig(parsed.data.projectId);
    if ("error" in result) {
      console.error("[updateSlackConfigAction]", result.error);
      return { error: "Opslaan mislukt" };
    }
  }

  revalidatePath("/settings/slack");
  return { success: true };
}

export async function testSlackWebhookAction(input: {
  projectId: string;
  webhookUrl: string;
}): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  if (!(await isAdmin(user.id))) {
    return { error: "Alleen admins" };
  }

  if (!input.webhookUrl.startsWith("https://hooks.slack.com/")) {
    return { error: "Ongeldige webhook URL" };
  }

  try {
    const response = await fetch(input.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: ":white_check_mark: *DevHub Slack-koppeling werkt!*\nDit is een testbericht van de DevHub Slack-integratie.",
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      return { error: `Slack gaf status ${response.status}` };
    }

    return { success: true };
  } catch {
    return { error: "Kon geen verbinding maken met Slack" };
  }
}
