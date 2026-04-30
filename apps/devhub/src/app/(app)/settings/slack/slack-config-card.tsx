"use client";

import { useState } from "react";
import { Save, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@repo/ui/button";
import { updateSlackConfigAction, testSlackWebhookAction } from "@/actions/slack-settings";
import type { SlackNotifyEvent } from "@repo/database/integrations/slack";

const EVENT_LABELS: Record<SlackNotifyEvent, { label: string; description: string }> = {
  critical_issue: {
    label: "Critical bugs",
    description: "Bug met severity critical (app onbruikbaar, data verlies)",
  },
  high_bug: {
    label: "High severity bugs",
    description: "Bug met severity high (belangrijke functie stuk)",
  },
  priority_urgent: {
    label: "Priority escalatie",
    description: "Issue handmatig naar P1 (heeft nu prio) gezet",
  },
};

interface SlackConfigCardProps {
  projectId: string;
  projectName: string;
  currentWebhookUrl: string | null;
  currentEvents: string[];
}

export function SlackConfigCard({
  projectId,
  projectName,
  currentWebhookUrl,
  currentEvents,
}: SlackConfigCardProps) {
  const [webhookUrl, setWebhookUrl] = useState(currentWebhookUrl ?? "");
  const [events, setEvents] = useState<SlackNotifyEvent[]>(
    currentEvents.filter((e): e is SlackNotifyEvent =>
      ["critical_issue", "high_bug", "priority_urgent"].includes(e),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function toggleEvent(event: SlackNotifyEvent) {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const result = await updateSlackConfigAction({
      projectId,
      webhookUrl,
      notifyEvents: events,
    });
    setSaving(false);

    if ("error" in result) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Slack instellingen opgeslagen" });
    }
  }

  async function handleTest() {
    if (!webhookUrl) return;
    setTesting(true);
    setMessage(null);
    const result = await testSlackWebhookAction({ projectId, webhookUrl });
    setTesting(false);

    if ("error" in result) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Testbericht verzonden naar Slack!" });
    }
  }

  const isEnabled = webhookUrl.startsWith("https://hooks.slack.com/");

  return (
    <div className="rounded-lg border p-5">
      <h3 className="text-sm font-semibold">{projectName}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {isEnabled ? "Slack notificaties actief" : "Geen webhook ingesteld"}
      </p>

      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor={`webhook-${projectId}`} className="text-xs font-medium">
            Webhook URL
          </label>
          <input
            id={`webhook-${projectId}`}
            type="url"
            placeholder="https://hooks.slack.com/services/..."
            value={webhookUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebhookUrl(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium">Stuur een melding bij:</legend>
          {(Object.keys(EVENT_LABELS) as SlackNotifyEvent[]).map((event) => (
            <label key={event} className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={events.includes(event)}
                onChange={() => toggleEvent(event)}
                className="mt-0.5 rounded border-input"
              />
              <span className="space-y-0.5">
                <span className="text-sm font-medium">{EVENT_LABELS[event].label}</span>
                <span className="block text-xs text-muted-foreground">
                  {EVENT_LABELS[event].description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        {message && (
          <div
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1.5 size-3.5" />
            {saving ? "Opslaan..." : "Opslaan"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleTest} disabled={!isEnabled || testing}>
            <Send className="mr-1.5 size-3.5" />
            {testing ? "Versturen..." : "Test versturen"}
          </Button>
        </div>
      </div>
    </div>
  );
}
