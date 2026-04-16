"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAdminClient } from "@repo/database/supabase/admin";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";
import { SLACK_NOTIFY_EVENTS } from "@repo/database/integrations/slack";

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

  const db = getAdminClient();

  if (parsed.data.webhookUrl) {
    // Upsert: insert or update config
    const { error } = await db.from("project_slack_config").upsert(
      {
        project_id: parsed.data.projectId,
        webhook_url: parsed.data.webhookUrl,
        notify_events: parsed.data.notifyEvents,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" },
    );

    if (error) {
      console.error("[updateSlackConfigAction]", error.message);
      return { error: "Opslaan mislukt" };
    }
  } else {
    // Empty URL = disable notifications, delete the config row
    const { error } = await db
      .from("project_slack_config")
      .delete()
      .eq("project_id", parsed.data.projectId);

    if (error) {
      console.error("[updateSlackConfigAction]", error.message);
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
