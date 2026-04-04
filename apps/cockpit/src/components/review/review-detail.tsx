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
import {
  EXTRACTION_TYPE_ORDER,
  EXTRACTION_TYPE_LABELS,
  EXTRACTION_TYPE_ICONS,
  EXTRACTION_TYPE_COLORS,
} from "@/components/shared/extraction-constants";
import { approveMeetingWithEditsAction, rejectMeetingAction } from "@/actions/review";
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
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(() => {
    for (const type of EXTRACTION_TYPE_ORDER) {
      if (meeting.extractions.some((e) => e.type === type)) return type;
    }
    return EXTRACTION_TYPE_ORDER[0];
  });
  const [activeTranscriptRef, setActiveTranscriptRef] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [typeChanges, setTypeChanges] = useState<Map<string, string>>(new Map());
  const [summaryEdit, setSummaryEdit] = useState<string | null>(null);

  const handleEdit = useCallback((id: string, content: string) => {
    setEdits((prev) => new Map(prev).set(id, content));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeletedIds((prev) => new Set(prev).add(id));
  }, []);

  const handleTypeChange = useCallback((id: string, type: string) => {
    setTypeChanges((prev) => new Map(prev).set(id, type));
  }, []);

  const handleRefClick = useCallback((ref: string) => {
    setActiveTranscriptRef(ref);
    setTimeout(() => setActiveTranscriptRef(null), 3000);
  }, []);

  async function handleApprove() {
    setLoading("approve");
    setError(null);
    const extractionEdits = Array.from(edits.entries()).map(([extractionId, content]) => ({
      extractionId,
      content,
    }));

    const rejectedExtractionIds = Array.from(deletedIds);

    const extractionTypeChanges = Array.from(typeChanges.entries())
      .filter(([id]) => !deletedIds.has(id))
      .map(([extractionId, type]) => ({
        extractionId,
        type: type as "decision" | "action_item" | "need" | "insight",
      }));

    const result = await approveMeetingWithEditsAction({
      meetingId: meeting.id,
      extractionEdits: extractionEdits.length > 0 ? extractionEdits : undefined,
      rejectedExtractionIds: rejectedExtractionIds.length > 0 ? rejectedExtractionIds : undefined,
      typeChanges: extractionTypeChanges.length > 0 ? extractionTypeChanges : undefined,
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

  const activeExtractions = meeting.extractions.filter((e) => !deletedIds.has(e.id));
  const grouped = new Map<string, Extraction[]>();
  for (const ext of activeExtractions) {
    const list = grouped.get(ext.type) ?? [];
    list.push(ext);
    grouped.set(ext.type, list);
  }

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
        activeTranscriptRef={activeTranscriptRef}
        onSummaryEdit={setSummaryEdit}
      />

      {/* Right panel: Extractions with tabs (45%) */}
      <div className="flex-1 overflow-y-auto lg:w-[45%] lg:flex-none">
        <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 backdrop-blur-sm px-6 pt-4">
          <h2 className="mb-3 text-base font-semibold">Extracties</h2>
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
                      ? "bg-card text-foreground shadow-sm"
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

        <div className="space-y-3 p-6">
          {activeItems.map((ext) => (
            <ExtractionCard
              key={ext.id}
              extraction={ext}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTypeChange={handleTypeChange}
              onRefClick={handleRefClick}
              showPromote
              isPromoted={promotedExtractionIds?.includes(ext.id)}
              people={peopleForAssignment}
            />
          ))}
          {activeItems.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Geen {EXTRACTION_TYPE_LABELS[activeTab]?.toLowerCase()} gevonden
            </p>
          )}
        </div>
      </div>

      <ReviewActionBar
        extractionCount={activeExtractions.length}
        editCount={edits.size + deletedIds.size + typeChanges.size + (summaryEdit !== null ? 1 : 0)}
        onApprove={handleApprove}
        onReject={handleReject}
        loading={loading}
        error={error}
      />
    </div>
  );
}
