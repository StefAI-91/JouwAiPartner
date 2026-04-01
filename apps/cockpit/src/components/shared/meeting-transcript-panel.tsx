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
    summary: string | null;
    raw_fireflies?: { sentences?: TranscriptSentence[] } | null;
    organization: { name: string } | null;
    meeting_participants: { person: { id: string; name: string } }[];
    extractions: { transcript_ref: string | null }[];
  };
  headerExtra?: React.ReactNode;
  activeTranscriptRef?: string | null;
  onSummaryEdit?: (content: string) => void;
}

export function MeetingTranscriptPanel({
  meeting,
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
          {meeting.organization && (
            <span className="font-medium text-foreground/70">{meeting.organization.name}</span>
          )}
          <MeetingTypeBadge type={meeting.meeting_type} />
          {meeting.party_type && <span>{meeting.party_type}</span>}
        </div>
        <h1 className="mt-2">{meeting.title ?? "Untitled meeting"}</h1>
        {meeting.date && (
          <p className="mt-1 text-sm text-muted-foreground">{formatDateLong(meeting.date)}</p>
        )}
        {headerExtra}
      </div>

      {participants.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {participants.map((name) => (
            <span key={name} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
              {name}
            </span>
          ))}
        </div>
      )}

      {meeting.summary && (
        <div className="mb-6">
          <MarkdownSummary
            content={meeting.summary}
            editable={!!onSummaryEdit}
            onEdit={onSummaryEdit}
          />
        </div>
      )}

      {meeting.transcript ? (
        <StructuredTranscript
          transcript={meeting.transcript}
          sentences={meeting.raw_fireflies?.sentences}
          transcriptRefs={transcriptRefs}
          activeRef={activeTranscriptRef}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No transcript available</p>
      )}
    </div>
  );
}
