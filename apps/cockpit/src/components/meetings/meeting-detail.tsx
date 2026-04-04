import { VerificationBadge } from "@/components/shared/verification-badge";
import { MeetingTranscriptPanel } from "@/components/shared/meeting-transcript-panel";
import { EditableTitle } from "@/components/meetings/editable-title";
import { ExtractionTabsPanel } from "@/components/meetings/extraction-tabs-panel";
import { MeetingTypeSelector } from "@/components/meetings/meeting-type-selector";
import { PeopleSelector } from "@/components/meetings/people-selector";
import { ProjectLinker } from "@/components/meetings/project-linker";
import { CopyMeetingButton } from "@/components/meetings/copy-meeting-button";
import type { MeetingDetail } from "@repo/database/queries/meetings";
import type { PersonWithOrg, PersonForAssignment } from "@repo/database/queries/people";

interface MeetingDetailViewProps {
  meeting: MeetingDetail;
  allPeople: PersonWithOrg[];
  organizations: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  promotedExtractionIds?: string[];
  peopleForAssignment?: PersonForAssignment[];
}

export function MeetingDetailView({
  meeting,
  allPeople,
  organizations,
  projects,
  promotedExtractionIds,
  peopleForAssignment,
}: MeetingDetailViewProps) {
  const linkedProjects = meeting.meeting_projects.map((mp) => mp.project);
  const linkedPeople = meeting.meeting_participants.map((mp) => mp.person);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem-7rem)] flex-col lg:flex-row">
      <MeetingTranscriptPanel
        meeting={meeting}
        actionsSlot={<CopyMeetingButton meeting={meeting} />}
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

      {/* Right panel: Extractions with tabs (45%) */}
      <div className="flex-1 overflow-y-auto lg:w-[45%] lg:flex-none">
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
