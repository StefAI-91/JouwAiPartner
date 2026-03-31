"use client";

import { useState } from "react";

interface ReviewActionBarProps {
  extractionCount: number;
  editCount: number;
  onApprove: () => void;
  onReject: (reason: string) => void;
  loading: "approve" | "reject" | null;
  error: string | null;
}

export function ReviewActionBar({
  extractionCount,
  editCount,
  onApprove,
  onReject,
  loading,
  error,
}: ReviewActionBarProps) {
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  function handleReject() {
    if (!rejectReason.trim()) return;
    onReject(rejectReason);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-white/90 px-6 py-4 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl">
        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Approving 1 meeting + {extractionCount} extraction
            {extractionCount !== 1 ? "s" : ""}
            {editCount > 0 && (
              <span className="ml-1 font-medium text-primary">({editCount} edited)</span>
            )}
          </span>

          <div className="flex items-center gap-3">
            {showReject ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleReject();
                    if (e.key === "Escape") setShowReject(false);
                  }}
                  autoFocus
                  aria-label="Rejection reason"
                  className="w-64 rounded-full border-2 border-red-200 px-4 py-2 text-sm outline-none focus:border-red-400"
                />
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || loading === "reject"}
                  className="rounded-full border-2 border-red-200 px-5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  {loading === "reject" ? "Rejecting..." : "Confirm"}
                </button>
                <button
                  onClick={() => setShowReject(false)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowReject(true)}
                className="rounded-full border-2 border-red-200 px-5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Reject
              </button>
            )}

            <button
              onClick={onApprove}
              disabled={loading === "approve"}
              className="rounded-full bg-gradient-to-b from-brand to-brand-dark px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {loading === "approve" ? "Approving..." : "Approve All"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
