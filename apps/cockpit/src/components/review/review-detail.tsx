"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ExtractionCard } from "./extraction-card";
import { ReviewActionBar } from "./review-action-bar";
import { MeetingTranscriptPanel } from "@/components/shared/meeting-transcript-panel";
import {
  EXTRACTION_TYPE_ORDER,
  EXTRACTION_TYPE_LABELS,
  EXTRACTION_TYPE_ICONS,
  EXTRACTION_TYPE_COLORS,
} from "@/components/shared/extraction-constants";
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
    raw_fireflies: Record<string, unknown> | null;
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
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Default to first type that has items
    for (const type of EXTRACTION_TYPE_ORDER) {
      if (meeting.extractions.some((e) => e.type === type)) return type;
    }
    return EXTRACTION_TYPE_ORDER[0];
  });
  const [activeTranscriptRef, setActiveTranscriptRef] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [summaryEdit, setSummaryEdit] = useState<string | null>(null);

  const handleEdit = useCallback((id: string, content: string) => {
    setEdits((prev) => new Map(prev).set(id, content));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeletedIds((prev) => new Set(prev).add(id));
  }, []);

  const handleRefClick = useCallback((ref: string) => {
    setActiveTranscriptRef(ref);
    // Clear after animation
    setTimeout(() => setActiveTranscriptRef(null), 3000);
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

  // Group extractions by type (excluding deleted)
  const activeExtractions = meeting.extractions.filter((e) => !deletedIds.has(e.id));
  const grouped = new Map<string, Extraction[]>();
  for (const ext of activeExtractions) {
    const list = grouped.get(ext.type) ?? [];
    list.push(ext);
    grouped.set(ext.type, list);
  }

  // Tabs with counts
  const tabs = EXTRACTION_TYPE_ORDER.filter(
    (type) => grouped.has(type) && grouped.get(type)!.length > 0,
  ).map((type) => ({
    type,
    label: EXTRACTION_TYPE_LABELS[type],
    count: grouped.get(type)!.length,
    Icon: EXTRACTION_TYPE_ICONS[type],
    color: EXTRACTION_TYPE_COLORS[type]?.color ?? "#6B7280",
  }));

  const activeItems = grouped.get(activeTab) ?? [];

  return (
    <div className="flex min-h-[calc(100vh-3.5rem-7rem)] flex-col lg:flex-row">
      <MeetingTranscriptPanel
        meeting={meeting}
        activeTranscriptRef={activeTranscriptRef}
        onSummaryEdit={setSummaryEdit}
      />

      {/* Right panel: Extractions with tabs (45%) */}
      <div className="flex-1 overflow-y-auto lg:w-[45%] lg:flex-none">
        {/* Tab bar */}
        <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 backdrop-blur-sm px-6 pt-4">
          <h2 className="mb-3 text-base font-semibold">Extractions</h2>
          <div className="flex gap-1 overflow-x-auto pb-0">
            {tabs.map(({ type, label, count, Icon, color }) => {
              const isActive = type === activeTab;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveTab(type)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {Icon && (
                    <Icon className="size-3.5" style={{ color: isActive ? color : undefined }} />
                  )}
                  {label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active tab content */}
        <div className="space-y-3 p-6">
          {activeItems.map((ext) => (
            <ExtractionCard
              key={ext.id}
              extraction={ext}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRefClick={handleRefClick}
            />
          ))}
          {activeItems.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No {EXTRACTION_TYPE_LABELS[activeTab]?.toLowerCase()} found
            </p>
          )}
        </div>
      </div>

      <ReviewActionBar
        extractionCount={activeExtractions.length}
        editCount={edits.size + deletedIds.size + (summaryEdit !== null ? 1 : 0)}
        onApprove={handleApprove}
        onReject={handleReject}
        loading={loading}
        error={error}
      />
    </div>
  );
}
