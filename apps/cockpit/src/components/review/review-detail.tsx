"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ExtractionCard } from "@/components/shared/extraction-card";
import { ReviewActionBar } from "./review-action-bar";
import { MeetingTranscriptPanel } from "@/components/shared/meeting-transcript-panel";
import { EditableTitle } from "@/components/meetings/editable-title";
import { MeetingTypeSelector } from "@/components/meetings/meeting-type-selector";
import { PeopleSelector } from "@/components/meetings/people-selector";
import { ProjectLinker } from "@/components/meetings/project-linker";
import { CopyMeetingButton } from "@/components/meetings/copy-meeting-button";
import { approveMeetingWithEditsAction, rejectMeetingAction } from "@/actions/review";
import { regenerateMeetingAction, updateMeetingSummaryAction } from "@/actions/meetings";
import { ListChecks, RefreshCw } from "lucide-react";
import type { PersonForAssignment } from "@repo/database/queries/people";

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
    transcript_elevenlabs?: string | null;
    summary: string | null;
    raw_fireflies: Record<string, unknown> | null;
    organization_id: string | null;
    organization: { name: string } | null;
    meeting_participants: { person: { id: string; name: string } }[];
    meeting_projects: { project: { id: string; name: string } }[];
    extractions: Extraction[];
  };
  allPeople: { id: string; name: string; role: string | null; organization: { name: string } | null }[];
  organizations: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  promotedExtractionIds?: string[];
  peopleForAssignment?: PersonForAssignment[];
}

export function ReviewDetail({ meeting, allPeople, organizations, projects, promotedExtractionIds, peopleForAssignment }: ReviewDetailProps) {
  const router = useRouter();
  const [edits, setEdits] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState<"approve" | "reject" | "regenerate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTranscriptRef, setActiveTranscriptRef] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [summaryEdit, setSummaryEdit] = useState<string | null>(null);

  const handleSummaryEdit = useCallback(async (content: string) => {
    setSummaryEdit(content);
    const result = await updateMeetingSummaryAction({ meetingId: meeting.id, summary: content });
    if ("error" in result) {
      console.error("[handleSummaryEdit] Save failed:", result.error);
    }
  }, [meeting.id]);

  const handleEdit = useCallback((id: string, content: string) => {
    setEdits((prev) => new Map(prev).set(id, content));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeletedIds((prev) => new Set(prev).add(id));
  }, []);

  const handleRefClick = useCallback((ref: string) => {
    setActiveTranscriptRef(ref);
    setTimeout(() => setActiveTranscriptRef(null), 3000);
  }, []);

  async function handleRegenerate() {
    setLoading("regenerate");
    setError(null);

    const result = await regenerateMeetingAction({ meetingId: meeting.id });

    if ("error" in result) {
      setError(result.error);
      setLoading(null);
      return;
    }
    router.refresh();
    setLoading(null);
    setEdits(new Map());
    setDeletedIds(new Set());
    setSummaryEdit(null);
  }

  async function handleApprove() {
    setLoading("approve");
    setError(null);
    const extractionEdits = Array.from(edits.entries()).map(([extractionId, content]) => ({
      extractionId,
      content,
    }));

    const rejectedExtractionIds = Array.from(deletedIds);

    const result = await approveMeetingWithEditsAction({
      meetingId: meeting.id,
      extractionEdits: extractionEdits.length > 0 ? extractionEdits : undefined,
      rejectedExtractionIds: rejectedExtractionIds.length > 0 ? rejectedExtractionIds : undefined,
      summaryEdit: summaryEdit ?? undefined,
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

  const actionItems = meeting.extractions.filter(
    (e) => e.type === "action_item" && !deletedIds.has(e.id),
  );
  const activeExtractions = meeting.extractions.filter((e) => !deletedIds.has(e.id));

  const linkedPeople = meeting.meeting_participants.map((mp) => mp.person);
  const linkedProjects = meeting.meeting_projects.map((mp) => mp.project);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem-7rem)] flex-col lg:flex-row">
      <MeetingTranscriptPanel
        meeting={meeting}
        titleSlot={
          <EditableTitle meetingId={meeting.id} initialTitle={meeting.title} />
        }
        meetingTypeSlot={
          <MeetingTypeSelector meetingId={meeting.id} currentType={meeting.meeting_type} />
        }
        participantsSlot={
          <PeopleSelector
            meetingId={meeting.id}
            linkedPeople={linkedPeople}
            allPeople={allPeople}
            organizations={organizations}
          />
        }
        headerExtra={
          <div className="mt-3">
            <ProjectLinker
              meetingId={meeting.id}
              linkedProjects={linkedProjects}
              allProjects={projects}
              organizations={organizations}
            />
          </div>
        }
        summaryAction={<CopyMeetingButton meeting={meeting} />}
        activeTranscriptRef={activeTranscriptRef}
        onSummaryEdit={handleSummaryEdit}
      />

      {/* Right panel: Action Items (45%) */}
      <div className="flex-1 overflow-y-auto lg:w-[45%] lg:flex-none">
        <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 backdrop-blur-sm px-6 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListChecks className="size-4 text-green-600" />
              <h2 className="text-base font-semibold">Actiepunten</h2>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {actionItems.length}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={loading === "regenerate"}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${loading === "regenerate" ? "animate-spin" : ""}`} />
              {loading === "regenerate" ? "Bezig..." : "Regenereer"}
            </button>
          </div>
        </div>

        <div className="space-y-3 p-6 pb-24">
          {actionItems.map((ext) => (
            <ExtractionCard
              key={ext.id}
              extraction={ext}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRefClick={handleRefClick}
              showPromote
              isPromoted={promotedExtractionIds?.includes(ext.id)}
              people={peopleForAssignment}
            />
          ))}
          {actionItems.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Geen actiepunten gevonden
            </p>
          )}
        </div>
      </div>

      <ReviewActionBar
        totalExtractions={meeting.extractions.length}
        deletedCount={deletedIds.size}
        editCount={edits.size + (summaryEdit !== null ? 1 : 0)}
        onApprove={handleApprove}
        onReject={handleReject}
        loading={loading === "approve" ? "approve" : loading === "reject" ? "reject" : null}
        error={error}
      />
    </div>
  );
}
