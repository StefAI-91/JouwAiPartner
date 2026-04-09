"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createIssueAction } from "@/actions/issues";
import { Button } from "@repo/ui/button";
import { useProjectId } from "@/hooks/use-project";
import {
  ISSUE_TYPES,
  ISSUE_TYPE_LABELS,
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
  ISSUE_COMPONENTS,
  ISSUE_COMPONENT_LABELS,
  ISSUE_SEVERITIES,
  ISSUE_SEVERITY_LABELS,
} from "@repo/database/constants/issues";

interface Person {
  id: string;
  name: string;
}

export function IssueForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const projectId = useProjectId();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("bug");
  const [priority, setPriority] = useState("medium");
  const [component, setComponent] = useState("");
  const [severity, setSeverity] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [labels, setLabels] = useState<string[]>([]);

  function addLabel() {
    const trimmed = labelInput.trim();
    if (trimmed && !labels.includes(trimmed)) {
      setLabels((prev) => [...prev, trimmed]);
    }
    setLabelInput("");
  }

  function removeLabel(label: string) {
    setLabels((prev) => prev.filter((l) => l !== label));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) {
      setError("Selecteer eerst een project");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createIssueAction({
        project_id: projectId,
        title,
        description: description || null,
        type: type as "bug",
        priority: priority as "medium",
        component: (component || null) as "frontend" | null,
        severity: (severity || null) as "critical" | null,
        assigned_to: assignedTo || null,
        labels,
      });

      if ("error" in result) {
        setError(result.error);
      } else {
        router.push(`/issues/${result.id}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 p-6">
      <h1>Nieuw issue</h1>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Titel <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Korte beschrijving van het issue"
          required
          maxLength={500}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Beschrijving
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Gedetailleerde beschrijving, stappen om te reproduceren, verwacht gedrag..."
          rows={6}
          maxLength={10000}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 resize-y"
        />
      </div>

      {/* Type + Priority row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="type" className="text-sm font-medium">
            Type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            {ISSUE_TYPES.map((t) => (
              <option key={t} value={t}>
                {ISSUE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="priority" className="text-sm font-medium">
            Prioriteit
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            {ISSUE_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {ISSUE_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Component + Severity row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="component" className="text-sm font-medium">
            Component
          </label>
          <select
            id="component"
            value={component}
            onChange={(e) => setComponent(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            <option value="">-- Geen --</option>
            {ISSUE_COMPONENTS.map((c) => (
              <option key={c} value={c}>
                {ISSUE_COMPONENT_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="severity" className="text-sm font-medium">
            Severity
          </label>
          <select
            id="severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            <option value="">-- Geen --</option>
            {ISSUE_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {ISSUE_SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assigned to */}
      <div className="space-y-1.5">
        <label htmlFor="assigned_to" className="text-sm font-medium">
          Toewijzen aan
        </label>
        <select
          id="assigned_to"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        >
          <option value="">-- Niet toegewezen --</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Labels */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Labels</label>
        <div className="flex gap-2">
          <input
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLabel();
              }
            }}
            placeholder="Voeg label toe en druk Enter"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
          <Button type="button" variant="outline" size="sm" onClick={addLabel}>
            Toevoegen
          </Button>
        </div>
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {labels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {label}
                <button
                  type="button"
                  onClick={() => removeLabel(label)}
                  className="ml-0.5 text-muted-foreground/60 hover:text-foreground"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending || !projectId}>
          {isPending ? "Aanmaken..." : "Issue aanmaken"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Annuleren
        </Button>
      </div>
    </form>
  );
}
