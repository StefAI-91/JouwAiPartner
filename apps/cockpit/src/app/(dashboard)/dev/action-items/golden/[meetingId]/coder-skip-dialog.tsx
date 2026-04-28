"use client";

interface Props {
  open: boolean;
  reason: string;
  setReason: (s: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function CoderSkipDialog({ open, reason, setReason, onClose, onSubmit, isPending }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-card p-5 shadow-lg">
        <h3 className="text-sm font-semibold">Meeting skippen</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Reden waarom deze meeting niet codeerbaar is (Engelse meeting, corrupt transcript, niet
          representatief, etc.).
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="mt-3 w-full rounded-md border border-border/60 bg-background p-2 text-[12px]"
          placeholder="Korte uitleg…"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-[12px] hover:bg-muted disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
