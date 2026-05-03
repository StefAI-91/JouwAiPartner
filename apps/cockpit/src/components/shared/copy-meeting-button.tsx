"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

interface CopyMeetingButtonProps {
  meeting: {
    title: string | null;
    date: string | null;
    meeting_type: string | null;
    party_type: string | null;
    summary: string | null;
    organization: { name: string } | null;
    meeting_participants: { person: { id: string; name: string } }[];
    meeting_projects?: { project: { id: string; name: string } }[];
    extractions: {
      type: string;
      content: string;
      confidence: number | null;
    }[];
  };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const TYPE_LABELS: Record<string, string> = {
  decision: "Beslissingen",
  action_item: "Actiepunten",
  insight: "Inzichten",
  need: "Behoeften",
};

function buildMeetingMarkdown(meeting: CopyMeetingButtonProps["meeting"]): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${meeting.title ?? "Untitled meeting"}`);
  lines.push("");

  // Metadata
  if (meeting.date) lines.push(`**Datum:** ${formatDate(meeting.date)}`);
  if (meeting.meeting_type) lines.push(`**Type:** ${meeting.meeting_type.replace(/_/g, " ")}`);
  if (meeting.organization) lines.push(`**Organisatie:** ${meeting.organization.name}`);

  const participants = meeting.meeting_participants.map((mp) => mp.person.name);
  if (participants.length > 0) lines.push(`**Deelnemers:** ${participants.join(", ")}`);

  const projects = meeting.meeting_projects?.map((mp) => mp.project.name) ?? [];
  if (projects.length > 0) lines.push(`**Projecten:** ${projects.join(", ")}`);

  lines.push("");

  // Summary
  if (meeting.summary) {
    lines.push("## Samenvatting");
    lines.push("");
    lines.push(meeting.summary);
    lines.push("");
  }

  // Extractions grouped by type
  const grouped = new Map<string, string[]>();
  for (const ext of meeting.extractions) {
    const list = grouped.get(ext.type) ?? [];
    list.push(ext.content);
    grouped.set(ext.type, list);
  }

  for (const [type, items] of grouped) {
    const label = TYPE_LABELS[type] ?? type.replace(/_/g, " ");
    lines.push(`## ${label}`);
    lines.push("");
    for (const item of items) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function CopyMeetingButton({ meeting }: CopyMeetingButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const markdown = buildMeetingMarkdown(meeting);
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [meeting]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title="Kopieer meeting als markdown"
    >
      {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
    </button>
  );
}
