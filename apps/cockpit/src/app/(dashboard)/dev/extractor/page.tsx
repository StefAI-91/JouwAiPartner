export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import { DevExtractorClient } from "./client";

interface MeetingOption {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
}

export default async function DevExtractorPage() {
  const supabase = await createClient();

  // Recent 40 meetings met transcript — gatekeeper-pipeline heeft al gedraaid,
  // er zit content in de extractor-tafel om mee te vergelijken.
  const { data } = await supabase
    .from("meetings")
    .select("id, title, date, meeting_type, transcript, transcript_elevenlabs")
    .order("date", { ascending: false, nullsFirst: false })
    .limit(40);

  const meetings: MeetingOption[] = (data ?? [])
    .filter((m) => m.transcript || m.transcript_elevenlabs)
    .map((m) => ({
      id: m.id,
      title: m.title,
      date: m.date,
      meeting_type: m.meeting_type,
    }));

  return (
    <div className="px-4 py-8 lg:px-10">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Dev · admin-only
        </p>
        <h1 className="font-heading text-2xl font-bold">MeetingStructurer harness</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Draai de merged agent one-off op een bestaande meeting en vergelijk de uitvoer per type
          met wat er nu in de database staat. Deze flow schrijft <strong>niets</strong> naar de
          database — puur voor prompt-tuning.
        </p>
      </div>

      <DevExtractorClient meetings={meetings} />
    </div>
  );
}
