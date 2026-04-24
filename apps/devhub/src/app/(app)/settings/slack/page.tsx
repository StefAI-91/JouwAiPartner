import { createPageClient } from "@repo/auth/helpers";
import { listAccessibleProjects } from "@repo/database/queries/projects/access";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";
import { getAdminClient } from "@repo/database/supabase/admin";
import { redirect } from "next/navigation";
import { SlackConfigCard } from "./slack-config-card";

export default async function SlackSettingsPage() {
  const [user, supabase] = await Promise.all([getAuthenticatedUser(), createPageClient()]);
  if (!user) return null;

  if (!(await isAdmin(user.id))) {
    redirect("/settings");
  }

  const projects = await listAccessibleProjects(user.id, supabase);

  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-lg font-semibold">Slack notificaties</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Geen projecten gevonden. Je hebt toegang tot minstens één project nodig.
        </p>
      </div>
    );
  }

  // Fetch Slack config from dedicated table (admin-only RLS, accessed via admin client)
  const db = getAdminClient();
  const { data: slackConfigs } = await db
    .from("project_slack_config")
    .select("project_id, webhook_url, notify_events")
    .in(
      "project_id",
      projects.map((p) => p.id),
    );

  const configMap = new Map(
    (slackConfigs ?? []).map((c) => [
      c.project_id as string,
      {
        webhookUrl: c.webhook_url as string | null,
        events: (c.notify_events as string[]) ?? [],
      },
    ]),
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-lg font-semibold">Slack notificaties</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ontvang meldingen in Slack bij urgente bugs. Configureer per project een Incoming Webhook.
      </p>

      <div className="mt-6 space-y-4">
        {projects.map((project) => {
          const config = configMap.get(project.id);
          return (
            <SlackConfigCard
              key={project.id}
              projectId={project.id}
              projectName={project.name}
              currentWebhookUrl={config?.webhookUrl ?? null}
              currentEvents={config?.events ?? ["critical_issue", "high_bug", "priority_urgent"]}
            />
          );
        })}
      </div>
    </div>
  );
}
