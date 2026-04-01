"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ExtractionCard } from "./extraction-card";
import { ReviewActionBar } from "./review-action-bar";
import { MeetingTranscriptPanel } from "@/components/shared/meeting-transcript-panel";
import { EXTRACTION_TYPE_ORDER, EXTRACTION_TYPE_LABELS } from "@/components/shared/extraction-constants";
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

export function ReviewDetail({ meeting }: ReviewDetailProps) {
  const router = useRouter();
  const [edits, setEdits] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = useCallback((id: string, content: string) => {
    setEdits((prev) => new Map(prev).set(id, content));
  }, []);

  async function handleApprove() {
    setLoading("approve");
    setError(null);
    const extractionEdits = Array.from(edits.entries()).map(([extractionId, content]) => ({
      extractionId,
      content,
    }));

    const result = await approveMeetingWithEditsAction({
      meetingId: meeting.id,
      extractionEdits: extractionEdits.length > 0 ? extractionEdits : undefined,
    });

    if ("error" in result) {
      setError(result.error);
      setLoading(null);
      return;
    }
    router.push("/review");
  }

  async function handleReject(reason: string) {
    setLoading("reject");
    setError(null);

    const result = await rejectMeetingAction({
      meetingId: meeting.id,
      reason,
    });

    if ("error" in result) {
      setError(result.error);
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

  return (
    <div className="flex min-h-[calc(100vh-3.5rem-7rem)] flex-col lg:flex-row">
      <MeetingTranscriptPanel meeting={meeting} />

      {/* Right panel: Extractions (45%) */}
      <div className="flex-1 overflow-y-auto p-6 lg:w-[45%] lg:flex-none">
        <h2 className="mb-4">Extractions</h2>
        <div className="space-y-6">
          {EXTRACTION_TYPE_ORDER.map((type) => {
            const items = grouped.get(type);
            if (!items || items.length === 0) return null;
            return (
              <div key={type}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {EXTRACTION_TYPE_LABELS[type]} ({items.length})
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

      <ReviewActionBar
        extractionCount={meeting.extractions.length}
        editCount={edits.size}
        onApprove={handleApprove}
        onReject={handleReject}
        loading={loading}
        error={error}
      />
    </div>
  );
}
