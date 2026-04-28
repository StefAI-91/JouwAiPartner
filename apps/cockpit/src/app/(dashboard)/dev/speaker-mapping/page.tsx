import type { Metadata } from "next";
import { requireAdmin } from "@repo/auth/access";
import {
  getSpeakerMappingBackfillStatus,
  listSpeakerMappingMeetings,
} from "@/actions/dev-speaker-mapping";
import { SpeakerMappingClient } from "./client";

export const metadata: Metadata = {
  title: "Dev · Speaker mapping test",
};

/**
 * Test-pagina voor de speaker-identifier (Haiku). Doel: voor één meeting zien of
 * de agent anonieme `speaker_X`-labels uit het ElevenLabs-transcript correct mapt
 * aan de DB-deelnemers. Pure dry-run: geen DB-writes, geen pipeline-impact —
 * we valideren de aanpak voordat we 'm in `runTranscribeStep` bakken.
 */
export default async function SpeakerMappingPage() {
  await requireAdmin();

  const meetings = await listSpeakerMappingMeetings();
  const initialBackfillStatus = await getSpeakerMappingBackfillStatus();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Speaker mapping · Haiku-test</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kies een meeting met een ElevenLabs-transcript → Haiku probeert per
          <code className="mx-1 rounded bg-muted px-1 py-0.5 text-[11px]">speaker_X</code>
          de juiste deelnemer te identificeren op basis van content. Dry-run.
        </p>
      </header>

      {meetings.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Geen meetings met transcript gevonden.
        </div>
      ) : (
        <SpeakerMappingClient
          meetings={meetings}
          initialBackfillStatus={"error" in initialBackfillStatus ? null : initialBackfillStatus}
        />
      )}
    </div>
  );
}
