"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ExtractionCard } from "./extraction-card";
import { MeetingTypeBadge } from "@/components/shared/meeting-type-badge";
import { approveMeetingWithEditsAction, rejectMeetingAction } from "@/actions/review";

interface Extraction {
  id: string;
  type: string;
  content: string;
  confidence: number | null;
  transcript_ref: string | null;
  metadata: Record<string, unknown>;
}

interface ReviewDetailProps {
  meeting: {
    id: string;
    title: string | null;
    date: string | null;
    meeting_type: string | null;
    party_type: string | null;
    transcript: string | null;
    summary: string | null;
    organization: { name: string } | null;
    meeting_participants: { person: { id: string; name: string } }[];
    extractions: Extraction[];
  };
}

const TYPE_ORDER = ["decision", "action_item", "need", "insight"];
const TYPE_LABELS: Record<string, string> = {
  decision: "Decisions",
  action_item: "Action Items",
  need: "Needs",
  insight: "Insights",
};

export function ReviewDetail({ meeting }: ReviewDetailProps) {
  const router = useRouter();
  const [edits, setEdits] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const handleEdit = useCallback((id: string, content: string) => {
    setEdits((prev) => new Map(prev).set(id, content));
  }, []);

  async function handleApprove() {
    setLoading("approve");
    const extractionEdits = Array.from(edits.entries()).map(([extractionId, content]) => ({
      extractionId,
      content,
    }));

    const result = await approveMeetingWithEditsAction({
      meetingId: meeting.id,
      extractionEdits: extractionEdits.length > 0 ? extractionEdits : undefined,
    });

    if ("error" in result) {
      setLoading(null);
      return;
    }
    router.push("/review");
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setLoading("reject");

    const result = await rejectMeetingAction({
      meetingId: meeting.id,
      reason: rejectReason,
    });

    if ("error" in result) {
      setLoading(null);
      return;
    }
    router.push("/review");
  }

  // Group extractions by type
  const grouped = new Map<string, Extraction[]>();
  for (const ext of meeting.extractions) {
    const list = grouped.get(ext.type) ?? [];
    list.push(ext);
    grouped.set(ext.type, list);
  }

  // Highlight transcript refs in transcript
  const transcriptRefs = new Set(
    meeting.extractions
      .map((e) => e.transcript_ref)
      .filter((ref): ref is string => ref !== null && ref.length > 0),
  );

  function highlightTranscript(text: string): React.ReactNode[] {
    if (transcriptRefs.size === 0) return [text];

    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    for (const ref of transcriptRefs) {
      const idx = remaining.indexOf(ref);
      if (idx !== -1) {
        if (idx > 0) parts.push(remaining.slice(0, idx));
        parts.push(
          <mark key={key++} className="rounded bg-yellow-100/50 px-0.5">
            {ref}
          </mark>,
        );
        remaining = remaining.slice(idx + ref.length);
      }
    }
    if (remaining) parts.push(remaining);
    return parts;
  }

  const participants = meeting.meeting_participants.map((mp) => mp.person.name);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem-7rem)] flex-col lg:flex-row">
      {/* Left panel: Transcript (55%) */}
      <div className="flex-1 overflow-y-auto border-r border-border/50 p-6 lg:w-[55%] lg:flex-none">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {meeting.organization && (
              <span className="font-medium text-foreground/70">{meeting.organization.name}</span>
            )}
            <MeetingTypeBadge type={meeting.meeting_type} />
            {meeting.party_type && <span>{meeting.party_type}</span>}
          </div>
          <h1 className="mt-2">{meeting.title ?? "Untitled meeting"}</h1>
          {meeting.date && (
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(meeting.date).toLocaleDateString("en-GB", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>

        {/* Participants */}
        {participants.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {participants.map((name) => (
              <span key={name} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {name}
              </span>
            ))}
          </div>
        )}

        {/* Summary */}
        {meeting.summary && (
          <div className="mb-6 rounded-xl bg-muted/50 p-4">
            <h3 className="mb-2 text-sm font-semibold">Summary</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{meeting.summary}</p>
          </div>
        )}

        {/* Transcript */}
        {meeting.transcript ? (
          <div className="prose prose-sm max-w-none">
            <h3 className="mb-3 text-sm font-semibold">Transcript</h3>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
              {highlightTranscript(meeting.transcript)}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No transcript available</p>
        )}
      </div>

      {/* Right panel: Extractions (45%) */}
      <div className="flex-1 overflow-y-auto p-6 lg:w-[45%] lg:flex-none">
        <h2 className="mb-4">Extractions</h2>

        <div className="space-y-6">
          {TYPE_ORDER.map((type) => {
            const items = grouped.get(type);
            if (!items || items.length === 0) return null;
            return (
              <div key={type}>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {TYPE_LABELS[type]} ({items.length})
                </h3>
                <div className="space-y-3">
                  {items.map((ext) => (
                    <ExtractionCard key={ext.id} extraction={ext} onEdit={handleEdit} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-white/90 px-6 py-4 backdrop-blur-xl lg:bottom-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Approving 1 meeting + {meeting.extractions.length} extraction
            {meeting.extractions.length !== 1 ? "s" : ""}
            {edits.size > 0 && (
              <span className="ml-1 text-[#006B3F] font-medium">({edits.size} edited)</span>
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
              onClick={handleApprove}
              disabled={loading === "approve"}
              className="rounded-full bg-gradient-to-b from-[#006B3F] to-[#005A35] px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {loading === "approve" ? "Approving..." : "Approve All"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
