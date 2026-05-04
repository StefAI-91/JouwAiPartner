"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TOPIC_TYPES, type TopicType } from "@repo/database/constants/topics";
import { createTopicAction, updateTopicAction } from "../actions/topics";

const PRIORITIES = ["", "P0", "P1", "P2", "P3"] as const;

const INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20";

export interface TopicFormInitial {
  id?: string;
  title?: string;
  type?: TopicType;
  priority?: string | null;
  target_sprint_id?: string | null;
  client_title?: string | null;
  description?: string | null;
  client_description?: string | null;
}

export interface SprintOption {
  id: string;
  name: string;
  delivery_week: string;
}

interface TopicFormProps {
  projectId: string;
  initial?: TopicFormInitial;
  sprintOptions: SprintOption[];
}

/**
 * Form voor zowel nieuw topic als bewerken. Bewust GEEN status-veld —
 * status muteren gaat via `<TopicStatusSelect />` op de detail-pagina,
 * zodat `closed_at` consistent blijft.
 */
export function TopicForm({ projectId, initial, sprintOptions }: TopicFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<TopicType>(initial?.type ?? "bug");
  const [priority, setPriority] = useState(initial?.priority ?? "");
  const [targetSprint, setTargetSprint] = useState(initial?.target_sprint_id ?? "");
  const [clientTitle, setClientTitle] = useState(initial?.client_title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [clientDescription, setClientDescription] = useState(initial?.client_description ?? "");

  const isEdit = Boolean(initial?.id);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = {
        title: title.trim(),
        client_title: clientTitle.trim() || null,
        description: description.trim() || null,
        client_description: clientDescription.trim() || null,
        priority: (priority || null) as "P0" | "P1" | "P2" | "P3" | null,
        target_sprint_id: targetSprint.trim() || null,
      };

      let targetId: string | undefined;
      if (isEdit) {
        const result = await updateTopicAction({ id: initial!.id, ...payload });
        if ("error" in result) {
          setError(result.error);
          return;
        }
        targetId = initial!.id;
      } else {
        const result = await createTopicAction({ ...payload, project_id: projectId, type });
        if ("error" in result) {
          setError(result.error);
          return;
        }
        targetId = result.data.id;
      }

      router.push(`/topics/${targetId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Titel</span>
        <input
          required
          minLength={3}
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={INPUT_CLASS}
          placeholder="Korte interne titel — wat zit er onder dit topic?"
        />
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Type</span>
        <div className="flex gap-2">
          {TOPIC_TYPES.map((t) => (
            <label
              key={t}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                type === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                className="sr-only"
                disabled={isEdit}
              />
              {t}
            </label>
          ))}
        </div>
        {isEdit ? (
          <p className="text-xs text-muted-foreground">
            Type van een bestaand topic blijft vast — splits/merge volgt later.
          </p>
        ) : null}
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Priority</span>
        <select
          value={priority ?? ""}
          onChange={(e) => setPriority(e.target.value)}
          className={INPUT_CLASS}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p === "" ? "— geen —" : p}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Target sprint</span>
        <select
          value={targetSprint ?? ""}
          onChange={(e) => setTargetSprint(e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="">— geen —</option>
          {sprintOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} (week van {s.delivery_week})
            </option>
          ))}
        </select>
        {sprintOptions.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            Nog geen sprints voor dit project — voeg er één toe vanuit het project in de cockpit.
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Interne beschrijving</span>
        <textarea
          rows={4}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          className={INPUT_CLASS}
          maxLength={5000}
          placeholder="Voor team-gebruik. Niet zichtbaar voor de klant."
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Klant-titel (optioneel)</span>
        <input
          value={clientTitle ?? ""}
          onChange={(e) => setClientTitle(e.target.value)}
          className={INPUT_CLASS}
          maxLength={200}
          placeholder="Wat de klant in de Portal ziet — leeg = interne titel"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Klant-beschrijving (optioneel)</span>
        <textarea
          rows={4}
          value={clientDescription ?? ""}
          onChange={(e) => setClientDescription(e.target.value)}
          className={INPUT_CLASS}
          maxLength={5000}
          placeholder="Markdown ondersteund. Verschijnt op de Portal-roadmap."
        />
      </label>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Opslaan…" : isEdit ? "Topic bijwerken" : "Topic aanmaken"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
