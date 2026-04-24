"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createIssueAction } from "../actions/issues";
import { Button } from "@repo/ui/button";
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
import { FormSelect } from "./sidebar-fields";
import { LabelInput } from "./label-input";

const INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20";

export function IssueForm({
  projectId,
  people,
}: {
  projectId: string | null;
  people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("bug");
  const [priority, setPriority] = useState("medium");
  const [component, setComponent] = useState("");
  const [severity, setSeverity] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [labels, setLabels] = useState<string[]>([]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return setError("Selecteer eerst een project");
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
      if ("error" in result) setError(result.error);
      else router.push(`/issues/${result.id}?project=${projectId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 p-6">
      <h1>Nieuw issue</h1>
      {error && (
        <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}
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
          className={INPUT_CLASS}
        />
      </div>
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
          className={`${INPUT_CLASS} resize-y`}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          id="type"
          label="Type"
          value={type}
          onChange={setType}
          options={ISSUE_TYPES.map((t) => ({ value: t, label: ISSUE_TYPE_LABELS[t] }))}
        />
        <FormSelect
          id="priority"
          label="Prioriteit"
          value={priority}
          onChange={setPriority}
          options={ISSUE_PRIORITIES.map((p) => ({ value: p, label: ISSUE_PRIORITY_LABELS[p] }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          id="component"
          label="Component"
          value={component}
          onChange={setComponent}
          options={ISSUE_COMPONENTS.map((c) => ({ value: c, label: ISSUE_COMPONENT_LABELS[c] }))}
          placeholder="-- Geen --"
        />
        <FormSelect
          id="severity"
          label="Ernst"
          value={severity}
          onChange={setSeverity}
          options={ISSUE_SEVERITIES.map((s) => ({ value: s, label: ISSUE_SEVERITY_LABELS[s] }))}
          placeholder="-- Geen --"
        />
      </div>
      <FormSelect
        id="assigned_to"
        label="Toewijzen aan"
        value={assignedTo}
        onChange={setAssignedTo}
        options={people.map((p) => ({ value: p.id, label: p.name }))}
        placeholder="-- Niet toegewezen --"
      />
      <LabelInput
        labels={labels}
        onAdd={(label) => setLabels((prev) => [...prev, label])}
        onRemove={(label) => setLabels((prev) => prev.filter((l) => l !== label))}
      />
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
