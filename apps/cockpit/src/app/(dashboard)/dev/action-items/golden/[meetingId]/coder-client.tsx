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
import { CoderItemCard } from "./coder-item-card";
import { CoderItemForm } from "./coder-item-form";
import { CoderSkipDialog } from "./coder-skip-dialog";
import { CoderStatusPanel } from "./coder-status-panel";
import { CoderTranscriptPane } from "./coder-transcript-pane";
import { EMPTY_DRAFT, type FormDraft, type Participant } from "./coder-types";

interface Props {
  meetingId: string;
  participants: Participant[];
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

  const itemToDraft = (item: GoldenItemRow): FormDraft => ({
    content: item.content,
    follow_up_contact: item.follow_up_contact,
    assignee: item.assignee ?? "",
    source_quote: item.source_quote ?? "",
    category: item.category as FormDraft["category"],
    deadline: item.deadline ?? "",
    lane: item.lane as FormDraft["lane"],
    type_werk: item.type_werk as FormDraft["type_werk"],
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
    setDraft({ ...EMPTY_DRAFT, source_quote: selectedQuote });
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

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
      <aside className="space-y-4">
        <CoderStatusPanel
          state={initialState}
          itemCount={initialItems.length}
          isPending={isPending}
          onConfirmZero={handleConfirmZero}
          onOpenSkip={() => setSkipDialogOpen(true)}
          onReset={handleReset}
        />

        {summary && (
          <section className="rounded-xl border border-border/60 bg-card p-4">
            <h2 className="text-sm font-semibold">Summary</h2>
            <pre className="mt-2 max-h-[260px] overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-[11.5px] leading-relaxed">
              {summary}
            </pre>
          </section>
        )}

        <CoderTranscriptPane
          ref={transcriptRef}
          localTranscript={localTranscript}
          setLocalTranscript={setLocalTranscript}
          originalTranscript={transcript}
          selectedQuote={selectedQuote}
          onCaptureSelection={handleSelectionCapture}
        />
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
                  <CoderItemForm
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
                  <CoderItemCard
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
              <CoderItemForm
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

      <CoderSkipDialog
        open={skipDialogOpen}
        reason={skipReason}
        setReason={setSkipReason}
        onClose={() => setSkipDialogOpen(false)}
        onSubmit={handleSkip}
        isPending={isPending}
      />
    </div>
  );
}
