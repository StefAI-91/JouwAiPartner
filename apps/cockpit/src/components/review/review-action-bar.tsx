"use client";

import { useState } from "react";
import { Check, AlertTriangle, ShieldCheck } from "lucide-react";

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
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
      <div className="mx-auto max-w-5xl">
        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            <AlertTriangle className="size-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          {/* Status summary */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <ShieldCheck className="size-3.5 shrink-0 text-primary" />
            <span>
              <span className="font-medium text-foreground">{approveCount}</span>
              {approveCount === 1 ? " extractie" : " extracties"}
            </span>
            {deletedCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <span className="text-muted-foreground">·</span>
                <span className="font-medium">{deletedCount}</span> verwijderd
              </span>
            )}
            {editCount > 0 && (
              <span className="text-primary">
                · <span className="font-medium">{editCount}</span> bewerkt
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            {showReject ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Reden..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleReject();
                    if (e.key === "Escape") setShowReject(false);
                  }}
                  autoFocus
                  aria-label="Reden voor afwijzing"
                  className="w-32 rounded-md border border-red-200 px-2 py-1.5 text-xs outline-none focus:border-red-400 sm:w-48 sm:text-sm"
                />
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || loading === "reject"}
                  className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 sm:px-3 sm:text-sm"
                >
                  {loading === "reject" ? "..." : "Bevestig"}
                </button>
                <button
                  onClick={() => {
                    setShowReject(false);
                    setRejectReason("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Annuleer
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowReject(true)}
                className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 sm:px-3 sm:text-sm"
                title="Verwerpt de hele meeting inclusief alle extracties"
              >
                <AlertTriangle className="size-3" />
                <span className="hidden sm:inline">Verwerp hele meeting</span>
                <span className="sm:hidden">Verwerp</span>
              </button>
            )}

            <button
              onClick={onApprove}
              disabled={loading === "approve"}
              className="flex items-center gap-1.5 rounded-md bg-gradient-to-b from-brand to-brand-dark px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm"
            >
              <Check className="size-3.5" />
              {loading === "approve" ? "Bezig..." : "Verifieer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
