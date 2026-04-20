import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";
import type { SlackNotifyEvent } from "../integrations/slack";

export interface UpsertSlackConfigInput {
  projectId: string;
  webhookUrl: string;
  notifyEvents: SlackNotifyEvent[];
}

/**
 * Upsert the Slack configuration row for a project. Stamps `updated_at` so
 * consumers can distinguish fresh configs from stale ones.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function upsertSlackConfig(
  input: UpsertSlackConfigInput,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("project_slack_config").upsert(
    {
      project_id: input.projectId,
      webhook_url: input.webhookUrl,
      notify_events: input.notifyEvents,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" },
  );
  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Delete the Slack configuration for a project — used when the admin clears
 * the webhook URL in the settings UI, effectively disabling notifications.
 *
 * @param client See `packages/database/README.md` for client-scope policy.
 */
export async function deleteSlackConfig(
  projectId: string,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("project_slack_config").delete().eq("project_id", projectId);
  if (error) return { error: error.message };
  return { success: true };
}
