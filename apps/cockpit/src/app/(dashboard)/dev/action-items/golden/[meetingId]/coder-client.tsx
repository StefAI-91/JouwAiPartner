"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GoldenItemRow, GoldenMeetingState } from "@repo/database/queries/golden";
import {
  insertGoldenItemAction,
  updateGoldenItemAction,
  deleteGoldenItemAction,
  upsertGoldenMeetingAction,
  resetGoldenForMeetingAction,
} from "@/actions/golden-action-items";

type Lane = "A" | "B" | "none";
type TypeWerk = "A" | "B" | "C" | "D" | "E";
type Category = "wachten_op_extern" | "wachten_op_beslissing" | null;

interface FormDraft {
  content: string;
  follow_up_contact: string;
  assignee: string;
  source_quote: string;
  category: Category;
  deadline: string;
  lane: Lane;
  type_werk: TypeWerk;
  project_context: string;
  coder_notes: string;
}

const EMPTY_DRAFT: FormDraft = {
  content: "",
  follow_up_contact: "",
  assignee: "",
  source_quote: "",
  category: null,
  deadline: "",
  lane: "A",
  type_werk: "C",
  project_context: "",
  coder_notes: "",
};

const TYPE_WERK_LABELS: Record<TypeWerk, string> = {
  A: "A · Intern JAIP-werk",
  B: "B · JAIP levert aan externe",
  C: "C · Externe levert aan JAIP",
  D: "D · Beslissing afwachten",
  E: "E · Partner-levering",
};

const LANE_LABELS: Record<Lane, string> = {
  A: "Lane A · mens beslist",
  B: "Lane B · AI mag pingen",
  none: "Lane none · niet opvolgen",
};

interface Props {
  meetingId: string;
  participants: { id: string; name: string }[];
  summary: string | null;
  transcript: string | null;
  initialState: GoldenMeetingState | null;
  initialItems: GoldenItemRow[];
}

export function GoldenCoderClient({
  meetingId,
  participants,
  summary,
  transcript,
  initialState,
  initialItems,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [draft, setDraft] = useState<FormDraft>(EMPTY_DRAFT);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<string>("");
  const [localTranscript, setLocalTranscript] = useState<string>(transcript ?? "");
  const transcriptRef = useRef<HTMLTextAreaElement>(null);
  const transcriptIsModified = localTranscript !== (transcript ?? "");

  const itemToDraft = (item: GoldenItemRow): FormDraft => ({
    content: item.content,
    follow_up_contact: item.follow_up_contact,
    assignee: item.assignee ?? "",
    source_quote: item.source_quote ?? "",
    category: item.category as Category,
    deadline: item.deadline ?? "",
    lane: item.lane as Lane,
    type_werk: item.type_werk as TypeWerk,
    project_context: item.project_context ?? "",
    coder_notes: item.coder_notes ?? "",
  });

  const draftToPayload = (d: FormDraft) => ({
    content: d.content.trim(),
    follow_up_contact: d.follow_up_contact.trim(),
    assignee: d.assignee.trim() || null,
    source_quote: d.source_quote.trim() || null,
    category: d.category,
    deadline: d.deadline || null,
    lane: d.lane,
    type_werk: d.type_werk,
    project_context: d.project_context.trim() || null,
    coder_notes: d.coder_notes.trim() || null,
  });

  const handleSelectionCapture = () => {
    // Eerst proberen vanuit het transcript-textarea (selectionStart/End werkt
    // niet met window.getSelection in textarea's). Fallback naar window-selectie
    // zodat ook tekst uit de summary of andere panels gevangen kan worden.
    const ta = transcriptRef.current;
    if (ta && ta.selectionStart !== ta.selectionEnd) {
      const sel = ta.value.substring(ta.selectionStart, ta.selectionEnd).trim();
      if (sel) {
        setSelectedQuote(sel.slice(0, 400));
        return;
      }
    }
    const winSel = window.getSelection()?.toString().trim();
    if (winSel) setSelectedQuote(winSel.slice(0, 400));
  };

  const startNew = () => {
    setEditingId(null);
    setDraft({
      ...EMPTY_DRAFT,
      source_quote: selectedQuote,
    });
    setShowNewForm(true);
  };

  const startEdit = (item: GoldenItemRow) => {
    setShowNewForm(false);
    setEditingId(item.id);
    setDraft(itemToDraft(item));
  };

  const cancelForm = () => {
    setShowNewForm(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError(null);
  };

  const submitInsert = () => {
    setError(null);
    startTransition(async () => {
      const res = await insertGoldenItemAction({ meetingId, ...draftToPayload(draft) });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setShowNewForm(false);
      setDraft(EMPTY_DRAFT);
      router.refresh();
    });
  };

  const submitUpdate = () => {
    if (!editingId) return;
    setError(null);
    startTransition(async () => {
      const res = await updateGoldenItemAction({ itemId: editingId, ...draftToPayload(draft) });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Item verwijderen?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteGoldenItemAction({ itemId: id });
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  };

  const handleConfirmZero = () => {
    if (!confirm("Markeer deze meeting als 'coded' met 0 action items?")) return;
    setError(null);
    startTransition(async () => {
      const res = await upsertGoldenMeetingAction({ meetingId, status: "coded", notes: null });
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  };

  const handleSkip = () => {
    setError(null);
    startTransition(async () => {
      const res = await upsertGoldenMeetingAction({
        meetingId,
        status: "skipped",
        notes: skipReason.trim() || null,
      });
      if ("error" in res) setError(res.error);
      else {
        setSkipDialogOpen(false);
        setSkipReason("");
        router.refresh();
      }
    });
  };

  const handleReset = () => {
    if (!confirm("Reset alle golden-data voor deze meeting? Niet terug te draaien.")) return;
    setError(null);
    startTransition(async () => {
      const res = await resetGoldenForMeetingAction({ meetingId });
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  };

  const isCoded = initialState?.status === "coded";
  const isSkipped = initialState?.status === "skipped";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
      <aside className="space-y-4">
        <section className="rounded-xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-semibold">Status</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
            {isCoded && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-900">
                coded · {initialItems.length} items
              </span>
            )}
            {isSkipped && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                skipped
              </span>
            )}
            {!initialState && (
              <span className="rounded-full border border-border/60 bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                ungecodeerd
              </span>
            )}
          </div>
          {isSkipped && initialState?.notes && (
            <p className="mt-2 text-[11.5px] italic text-muted-foreground">
              Skip-reden: {initialState.notes}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {!isCoded && initialItems.length === 0 && (
              <button
                type="button"
                onClick={handleConfirmZero}
                disabled={isPending}
                className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-[11.5px] hover:bg-muted disabled:opacity-50"
              >
                Bevestig: 0 items
              </button>
            )}
            <button
              type="button"
              onClick={() => setSkipDialogOpen(true)}
              disabled={isPending}
              className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-[11.5px] hover:bg-muted disabled:opacity-50"
            >
              Skip met reden
            </button>
            {initialState && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isPending}
                className="rounded-md border border-destructive/40 bg-background px-3 py-1.5 text-[11.5px] text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                Reset
              </button>
            )}
          </div>
        </section>

        {summary && (
          <section className="rounded-xl border border-border/60 bg-card p-4">
            <h2 className="text-sm font-semibold">Summary</h2>
            <pre className="mt-2 max-h-[260px] overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-[11.5px] leading-relaxed">
              {summary}
            </pre>
          </section>
        )}

        <section className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Transcript</h2>
            {selectedQuote && (
              <span className="text-[10.5px] text-muted-foreground">
                {selectedQuote.length} chars geselecteerd
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Bewerkbaar — plak een eigen transcript of werk in het bestaande. Selecteer tekst → klik
            &ldquo;Vang selectie&rdquo; → wordt voor-ingevuld bij het volgende nieuwe item.
            Wijzigingen blijven lokaal in deze sessie en worden niet opgeslagen.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSelectionCapture}
              className="rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] hover:bg-muted"
            >
              Vang selectie
            </button>
            {transcriptIsModified && (
              <>
                <button
                  type="button"
                  onClick={() => setLocalTranscript(transcript ?? "")}
                  className="rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] hover:bg-muted"
                >
                  Reset naar origineel
                </button>
                <span className="text-[10.5px] italic text-amber-700">
                  lokaal aangepast (niet opgeslagen)
                </span>
              </>
            )}
            {!transcript && !localTranscript && (
              <span className="text-[10.5px] italic text-muted-foreground">
                Geen transcript in DB — plak er een in het veld hieronder.
              </span>
            )}
          </div>
          <textarea
            ref={transcriptRef}
            value={localTranscript}
            onChange={(e) => setLocalTranscript(e.target.value)}
            spellCheck={false}
            className="mt-3 max-h-[480px] min-h-[260px] w-full overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/40 p-3 font-mono text-[11.5px] leading-relaxed"
            placeholder="Plak hier een transcript…"
          />
          <p className="mt-1 text-[10.5px] text-muted-foreground">
            {localTranscript.length.toLocaleString("nl-NL")} tekens
            {localTranscript.trim().length > 0 &&
              ` · ${localTranscript.trim().split(/\s+/).length.toLocaleString("nl-NL")} woorden`}
          </p>
        </section>
      </aside>

      <main className="space-y-4">
        <section className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Golden items ({initialItems.length})</h2>
            {!showNewForm && !editingId && (
              <button
                type="button"
                onClick={startNew}
                disabled={isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground disabled:opacity-50"
              >
                + Item toevoegen
              </button>
            )}
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-[12px] text-destructive">
              {error}
            </div>
          )}

          <ul className="mt-4 space-y-3">
            {initialItems.map((item) =>
              editingId === item.id ? (
                <li key={item.id}>
                  <ItemForm
                    draft={draft}
                    setDraft={setDraft}
                    participants={participants}
                    onSubmit={submitUpdate}
                    onCancel={cancelForm}
                    isPending={isPending}
                    submitLabel="Opslaan"
                  />
                </li>
              ) : (
                <li key={item.id} className="rounded-md border border-border/40 bg-background p-3">
                  <ItemCard
                    item={item}
                    onEdit={() => startEdit(item)}
                    onDelete={() => handleDelete(item.id)}
                    isPending={isPending}
                  />
                </li>
              ),
            )}
          </ul>

          {showNewForm && (
            <div className="mt-4">
              <ItemForm
                draft={draft}
                setDraft={setDraft}
                participants={participants}
                onSubmit={submitInsert}
                onCancel={cancelForm}
                isPending={isPending}
                submitLabel="Toevoegen"
              />
            </div>
          )}

          {initialItems.length === 0 && !showNewForm && (
            <p className="mt-4 text-[12px] italic text-muted-foreground">
              Nog geen items. Klik &ldquo;+ Item toevoegen&rdquo; of bevestig &ldquo;0 items&rdquo;
              als deze meeting geen action items bevat.
            </p>
          )}
        </section>
      </main>

      {skipDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border/60 bg-card p-5 shadow-lg">
            <h3 className="text-sm font-semibold">Meeting skippen</h3>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Reden waarom deze meeting niet codeerbaar is (Engelse meeting, corrupt transcript,
              niet representatief, etc.).
            </p>
            <textarea
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-md border border-border/60 bg-background p-2 text-[12px]"
              placeholder="Korte uitleg…"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSkipDialogOpen(false)}
                disabled={isPending}
                className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-[12px] hover:bg-muted disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleSkip}
                disabled={isPending}
                className="rounded-md bg-amber-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCard({
  item,
  onEdit,
  onDelete,
  isPending,
}: {
  item: GoldenItemRow;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-medium leading-snug">{item.content}</p>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            disabled={isPending}
            className="rounded-md border border-border/60 bg-background px-2 py-0.5 text-[11px] hover:bg-muted disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="rounded-md border border-destructive/40 bg-background px-2 py-0.5 text-[11px] text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            Del
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10.5px]">
        <Chip>contact: {item.follow_up_contact}</Chip>
        {item.assignee && item.assignee !== item.follow_up_contact && (
          <Chip>assignee: {item.assignee}</Chip>
        )}
        <Chip variant={item.lane === "B" ? "primary" : "default"}>
          {LANE_LABELS[item.lane as Lane]}
        </Chip>
        <Chip>{TYPE_WERK_LABELS[item.type_werk as TypeWerk]}</Chip>
        {item.deadline && <Chip>deadline: {item.deadline}</Chip>}
        {item.category && <Chip>{item.category}</Chip>}
        {item.project_context && <Chip>project: {item.project_context}</Chip>}
      </div>
      {item.source_quote && (
        <blockquote className="mt-2 border-l-2 border-primary/30 pl-3 text-[11.5px] italic text-muted-foreground">
          &ldquo;{item.source_quote}&rdquo;
        </blockquote>
      )}
      {item.coder_notes && (
        <p className="mt-2 rounded-md bg-muted/40 p-2 text-[11.5px] text-muted-foreground">
          <strong className="font-medium">Notes:</strong> {item.coder_notes}
        </p>
      )}
    </div>
  );
}

function Chip({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "primary";
}) {
  return (
    <span
      className={
        variant === "primary"
          ? "rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary"
          : "rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
      }
    >
      {children}
    </span>
  );
}

function ItemForm({
  draft,
  setDraft,
  participants,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  draft: FormDraft;
  setDraft: (d: FormDraft) => void;
  participants: { id: string; name: string }[];
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
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
          <option key={p.id} value={p.name} />
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
