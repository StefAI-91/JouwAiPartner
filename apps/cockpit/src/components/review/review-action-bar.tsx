"use client";

import { useState } from "react";
import { Check, AlertTriangle, Trash2, ShieldCheck } from "lucide-react";

interface ReviewActionBarProps {
  totalExtractions: number;
  deletedCount: number;
  editCount: number;
  onApprove: () => void;
  onReject: (reason: string) => void;
  loading: "approve" | "reject" | null;
  error: string | null;
}

export function ReviewActionBar({
  totalExtractions,
  deletedCount,
  editCount,
  onApprove,
  onReject,
  loading,
  error,
}: ReviewActionBarProps) {
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const approveCount = totalExtractions - deletedCount;

  function handleReject() {
    if (!rejectReason.trim()) return;
    onReject(rejectReason);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-white/90 px-6 py-4 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl">
        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            <AlertTriangle className="size-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          {/* Status summary */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-primary" />
              <span className="font-medium text-foreground">{approveCount}</span>
              {approveCount === 1 ? " extractie" : " extracties"} goedkeuren
            </span>
            {deletedCount > 0 && (
              <span className="flex items-center gap-1.5 text-red-500">
                <span className="text-muted-foreground">·</span>
                <Trash2 className="size-3.5" />
                <span className="font-medium">{deletedCount}</span> verwijderd
              </span>
            )}
            {editCount > 0 && (
              <span className="text-primary">
                <span className="text-muted-foreground">·</span>{" "}
                <span className="font-medium">{editCount}</span> bewerkt
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {showReject ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Reden voor afwijzing..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleReject();
                    if (e.key === "Escape") setShowReject(false);
                  }}
                  autoFocus
                  aria-label="Reden voor afwijzing"
                  className="w-64 rounded-lg border-2 border-red-200 px-3 py-2 text-sm outline-none focus:border-red-400"
                />
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || loading === "reject"}
                  className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                >
                  {loading === "reject" ? "Bezig..." : "Bevestigen"}
                </button>
                <button
                  onClick={() => {
                    setShowReject(false);
                    setRejectReason("");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Annuleer
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowReject(true)}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                title="Verwerpt de hele meeting inclusief alle extracties"
              >
                <AlertTriangle className="size-3.5" />
                Verwerp hele meeting
              </button>
            )}

            <button
              onClick={onApprove}
              disabled={loading === "approve" || approveCount === 0}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-b from-brand to-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
            >
              <Check className="size-4" />
              {loading === "approve" ? "Bezig met verifiëren..." : "Verifieer meeting"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
