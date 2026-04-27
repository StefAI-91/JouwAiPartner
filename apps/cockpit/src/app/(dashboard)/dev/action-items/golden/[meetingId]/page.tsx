import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@repo/auth/access";
import { getMeetingForGoldenCoder, getGoldenForMeeting } from "@repo/database/queries/golden";
import { GoldenCoderClient } from "./coder-client";

export const metadata: Metadata = {
  title: "Dev · Action Item golden coder",
};

interface PageProps {
  params: Promise<{ meetingId: string }>;
}

/**
 * Per-meeting coder voor de Action Item golden-dataset. Toont meeting-context
 * (summary + transcript) naast een formulier waar Stef/Wouter items invoeren.
 * Items worden direct gepersisteerd via server actions (geen draft-state).
 *
 * Niet in features/ omdat dit dev-tooling is, geen productie-feature.
 */
export default async function GoldenCoderPage({ params }: PageProps) {
  await requireAdmin();
  const { meetingId } = await params;

  const meeting = await getMeetingForGoldenCoder(meetingId);
  if (!meeting) notFound();

  const golden = await getGoldenForMeeting(meetingId);

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/dev/action-items/golden"
            className="text-[11.5px] text-muted-foreground hover:underline"
          >
            ← Terug naar picker
          </Link>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{meeting.title}</h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {meeting.date && new Date(meeting.date).toLocaleDateString("nl-NL")}
            {meeting.meeting_type && ` · ${meeting.meeting_type}`}
            {meeting.party_type && ` · ${meeting.party_type}`}
            {` · ${meeting.participants.length} deelnemers`}
          </p>
        </div>
      </header>

      <GoldenCoderClient
        meetingId={meetingId}
        participants={meeting.participants}
        summary={meeting.summary}
        transcript={meeting.transcript}
        initialState={golden.state}
        initialItems={golden.items}
      />
    </div>
  );
}
