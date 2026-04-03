export const dynamic = "force-dynamic";

import { createClient } from "@repo/database/supabase/server";
import { listVerifiedMeetings } from "@repo/database/queries/meetings";
import { MeetingsList } from "@/components/meetings/meetings-list";
import { Calendar } from "lucide-react";

export default async function MeetingsPage() {
  const supabase = await createClient();
  const meetings = await listVerifiedMeetings(supabase);

  if (meetings.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h2 className="mt-4 font-heading text-xl font-semibold">No meetings yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Verified meetings will appear here once they pass review.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1>Meetings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {meetings.length} verified meeting{meetings.length !== 1 ? "s" : ""}
        </p>
      </div>

      <MeetingsList meetings={meetings} />
    </div>
  );
}
