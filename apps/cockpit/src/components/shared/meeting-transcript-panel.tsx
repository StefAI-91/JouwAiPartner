import { MeetingTypeBadge } from "@/components/shared/meeting-type-badge";
import { MarkdownSummary } from "@/components/shared/markdown-summary";
import {
  StructuredTranscript,
  type TranscriptSentence,
} from "@/components/shared/structured-transcript";
import { formatDateLong } from "@/lib/format";

interface MeetingTranscriptPanelProps {
  meeting: {
    title: string | null;
    date: string | null;
    meeting_type: string | null;
    party_type: string | null;
    transcript: string | null;
    transcript_elevenlabs?: string | null;
    summary: string | null;
    raw_fireflies?: { sentences?: TranscriptSentence[] } | null;
    organization: { name: string } | null;
    meeting_participants: { person: { id: string; name: string } }[];
    extractions: { transcript_ref: string | null }[];
  };
  titleSlot?: React.ReactNode;
  meetingTypeSlot?: React.ReactNode;
  participantsSlot?: React.ReactNode;
  headerExtra?: React.ReactNode;
  activeTranscriptRef?: string | null;
  onSummaryEdit?: (content: string) => void;
}

export function MeetingTranscriptPanel({
  meeting,
  titleSlot,
  meetingTypeSlot,
  participantsSlot,
  headerExtra,
  activeTranscriptRef,
  onSummaryEdit,
}: MeetingTranscriptPanelProps) {
  const participants = meeting.meeting_participants.map((mp) => mp.person.name);

  const transcriptRefs = new Set(
    meeting.extractions
      .map((e) => e.transcript_ref)
      .filter((ref): ref is string => ref !== null && ref.length > 0),
  );

  return (
    <div className="flex-1 overflow-y-auto border-r border-border/50 p-6 lg:w-[55%] lg:flex-none">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {meetingTypeSlot ?? <MeetingTypeBadge type={meeting.meeting_type} />}
          {meeting.party_type && <span>{meeting.party_type}</span>}
        </div>
        <div className="mt-2">
          {titleSlot ?? <h1>{meeting.title ?? "Untitled meeting"}</h1>}
        </div>
        {meeting.date && (
          <p className="mt-1 text-sm text-muted-foreground">{formatDateLong(meeting.date)}</p>
        )}
        {headerExtra}
      </div>

      {participantsSlot ? (
        <div className="mb-6">{participantsSlot}</div>
      ) : participants.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {participants.map((name) => (
            <span key={name} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
              {name}
            </span>
          ))}
        </div>
      ) : null}

      {meeting.summary && (
        <div className="mb-6">
          <MarkdownSummary
            content={meeting.summary}
            editable={!!onSummaryEdit}
            onEdit={onSummaryEdit}
          />
        </div>
      )}

      {(meeting.transcript_elevenlabs || meeting.transcript) ? (
        <StructuredTranscript
          transcript={meeting.transcript_elevenlabs ?? meeting.transcript!}
          sentences={meeting.transcript_elevenlabs ? undefined : meeting.raw_fireflies?.sentences}
          transcriptRefs={transcriptRefs}
          activeRef={activeTranscriptRef}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No transcript available</p>
      )}
    </div>
  );
}
