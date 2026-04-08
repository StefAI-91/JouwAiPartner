"use client";

import { useCallback } from "react";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { MeetingTranscriptPanel } from "@/components/shared/meeting-transcript-panel";
import { EditableTitle } from "@/components/meetings/editable-title";
import { ExtractionTabsPanel } from "@/components/meetings/extraction-tabs-panel";
import { MeetingTypeSelector } from "@/components/meetings/meeting-type-selector";
import { PartyTypeSelector } from "@/components/meetings/party-type-selector";
import { PeopleSelector } from "@/components/meetings/people-selector";
import { ProjectLinker } from "@/components/meetings/project-linker";
import { CopyMeetingButton } from "@/components/meetings/copy-meeting-button";
import { updateMeetingSummaryAction } from "@/actions/meetings";
import type { MeetingDetail } from "@repo/database/queries/meetings";
import type { PersonWithOrg, PersonForAssignment } from "@repo/database/queries/people";
import type { MeetingSegment } from "@repo/database/queries/meeting-project-summaries";
import { SegmentList } from "@/components/shared/segment-list";

interface MeetingDetailViewProps {
  meeting: MeetingDetail;
  allPeople: PersonWithOrg[];
  organizations: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  promotedExtractionIds?: string[];
  peopleForAssignment?: PersonForAssignment[];
  segments?: MeetingSegment[];
}

export function MeetingDetailView({
  meeting,
  allPeople,
  organizations,
  projects,
  promotedExtractionIds,
  peopleForAssignment,
  segments,
}: MeetingDetailViewProps) {
  const linkedProjects = meeting.meeting_projects.map((mp) => mp.project);
  const linkedPeople = meeting.meeting_participants.map((mp) => mp.person);

  const handleSummaryEdit = useCallback(
    async (content: string) => {
      const result = await updateMeetingSummaryAction({ meetingId: meeting.id, summary: content });
      if ("error" in result) {
        console.error("[handleSummaryEdit] Save failed:", result.error);
      }
    },
    [meeting.id],
  );

  return (
    <div className="flex min-h-[calc(100vh-3.5rem-7rem)] flex-col lg:flex-row">
      <MeetingTranscriptPanel
        meeting={meeting}
        titleSlot={<EditableTitle meetingId={meeting.id} initialTitle={meeting.title} />}
        meetingTypeSlot={
          <div className="flex items-center gap-1.5">
            <MeetingTypeSelector meetingId={meeting.id} currentType={meeting.meeting_type} />
            <PartyTypeSelector meetingId={meeting.id} currentType={meeting.party_type} />
          </div>
        }
        participantsSlot={
          <PeopleSelector
            meetingId={meeting.id}
            linkedPeople={linkedPeople}
            allPeople={allPeople}
            organizations={organizations}
          />
        }
        summaryAction={<CopyMeetingButton meeting={meeting} />}
        onSummaryEdit={handleSummaryEdit}
        headerExtra={
          <div className="mt-3 space-y-3">
            <VerificationBadge
              verifierName={meeting.verifier?.full_name ?? null}
              verifiedAt={meeting.verified_at}
            />
            <ProjectLinker
              meetingId={meeting.id}
              linkedProjects={linkedProjects}
              allProjects={projects}
              organizations={organizations}
            />
          </div>
        }
      />

      {/* Right panel: Segments + Extractions (45%) */}
      <div className="flex-1 overflow-y-auto lg:w-[45%] lg:flex-none">
        {segments && segments.length > 0 && (
          <div className="border-b border-border/50 p-6">
            <SegmentList segments={segments} projects={projects} meetingId={meeting.id} />
          </div>
        )}
        <ExtractionTabsPanel
          extractions={meeting.extractions}
          promotedExtractionIds={promotedExtractionIds}
          peopleForAssignment={peopleForAssignment}
          meetingId={meeting.id}
          editable
        />
      </div>
    </div>
  );
}
