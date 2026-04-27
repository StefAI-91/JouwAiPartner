"use client";

import {
  TYPE_WERK_LABELS,
  type Category,
  type FormDraft,
  type Lane,
  type Participant,
  type TypeWerk,
} from "./coder-types";

interface Props {
  draft: FormDraft;
  setDraft: (d: FormDraft) => void;
  participants: Participant[];
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}

export function CoderItemForm({
  draft,
  setDraft,
  participants,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: Props) {
  const update = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) =>
    setDraft({ ...draft, [key]: value });

  return (
    <div className="space-y-3 rounded-md border border-primary/30 bg-muted/20 p-4">
      <Field label="Content (NL, naam-eerst)">
        <textarea
          value={draft.content}
          onChange={(e) => update("content", e.target.value)}
          rows={2}
          className="w-full rounded-md border border-border/60 bg-background p-2 text-[12px]"
          placeholder="Jan navragen of vragenlijst voor Booktalk V2 retour is gekomen"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Follow-up contact (verplicht)">
          <input
            list="participants-list"
            value={draft.follow_up_contact}
            onChange={(e) => update("follow_up_contact", e.target.value)}
            className="w-full rounded-md border border-border/60 bg-background p-2 text-[12px]"
            placeholder="Jan"
          />
        </Field>
        <Field label="Assignee (mag leeg = zelfde als contact)">
          <input
            list="participants-list"
            value={draft.assignee}
            onChange={(e) => update("assignee", e.target.value)}
            className="w-full rounded-md border border-border/60 bg-background p-2 text-[12px]"
          />
        </Field>
      </div>

      <datalist id="participants-list">
        {participants.map((p) => (
          <option key={p.id ?? p.name} value={p.name} />
        ))}
      </datalist>

      <Field label="Source quote (letterlijk uit transcript, max 400 chars)">
        <textarea
          value={draft.source_quote}
          onChange={(e) => update("source_quote", e.target.value)}
          rows={2}
          maxLength={400}
          className="w-full rounded-md border border-border/60 bg-background p-2 text-[11.5px] font-mono"
          placeholder='"ik zorg dat ik de vragenlijst deze week terugkrijg"'
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Lane">
          <div className="flex gap-1">
            {(["A", "B", "none"] as Lane[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => update("lane", l)}
                className={
                  draft.lane === l
                    ? "rounded-md bg-primary px-2.5 py-1.5 text-[11.5px] font-medium text-primary-foreground"
                    : "rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-[11.5px] hover:bg-muted"
                }
              >
                {l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Type werk">
          <select
            value={draft.type_werk}
            onChange={(e) => update("type_werk", e.target.value as TypeWerk)}
            className="w-full rounded-md border border-border/60 bg-background p-2 text-[12px]"
          >
            {(Object.keys(TYPE_WERK_LABELS) as TypeWerk[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_WERK_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select
            value={draft.category ?? ""}
            onChange={(e) => update("category", (e.target.value || null) as Category)}
            className="w-full rounded-md border border-border/60 bg-background p-2 text-[12px]"
          >
            <option value="">— geen —</option>
            <option value="wachten_op_extern">wachten op extern</option>
            <option value="wachten_op_beslissing">wachten op beslissing</option>
          </select>
        </Field>
        <Field label="Deadline (optioneel — leeg = onbekend)">
          <input
            type="date"
            value={draft.deadline}
            onChange={(e) => update("deadline", e.target.value)}
            className="w-full rounded-md border border-border/60 bg-background p-2 text-[12px]"
          />
        </Field>
      </div>

      <Field label="Project context (vrij tekst voor v1)">
        <input
          value={draft.project_context}
          onChange={(e) => update("project_context", e.target.value)}
          className="w-full rounded-md border border-border/60 bg-background p-2 text-[12px]"
          placeholder="Booktalk V2"
        />
      </Field>

      <Field label="Coder notes (waarom is dit het juiste antwoord?)">
        <textarea
          value={draft.coder_notes}
          onChange={(e) => update("coder_notes", e.target.value)}
          rows={2}
          className="w-full rounded-md border border-border/60 bg-background p-2 text-[12px]"
          placeholder="Lane A omdat communicatie via WhatsApp gaat, niet email"
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-[12px] hover:bg-muted disabled:opacity-50"
        >
          Annuleren
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isPending || !draft.content.trim() || !draft.follow_up_contact.trim()}
          className="rounded-md bg-primary px-4 py-1.5 text-[12px] font-medium text-primary-foreground disabled:opacity-50"
        >
          {isPending ? "Bezig…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
