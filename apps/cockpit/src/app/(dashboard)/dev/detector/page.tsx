import type { Metadata } from "next";
import { requireAdmin } from "@repo/auth/access";
import { listVerifiedMeetings } from "@repo/database/queries/meetings";
import { DevDetectorClient } from "./client";

export const metadata: Metadata = {
  title: "Dev · Theme-Detector harness",
};

/**
 * TH-011 (FUNC-279, SEC-230) — admin-only `/dev/detector`. Vervangt de
 * TH-010 `/dev/tagger` harness met het Theme-Detector contract.
 * `requireAdmin` redirect naar `/login` voor non-admins; `runDevDetectorAction`
 * herhaalt de guard (defense-in-depth).
 */
export default async function DevDetectorPage() {
  await requireAdmin();

  const { data: meetings } = await listVerifiedMeetings(undefined, { limit: 100 });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Theme-Detector harness</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Roept de Detector aan op een verified meeting en vergelijkt de output met de huidige
          DB-state. <strong>Geen meeting_themes/extraction_themes writes</strong>, maar wél een
          échte Anthropic-call (token-kosten) + een <code>agent_runs</code>-rij met{" "}
          <code>dry_run: true</code> voor audit. Voor prompt-tuning zonder redeploy-bleed.
        </p>
      </header>
      <DevDetectorClient
        meetings={meetings.map((m) => ({
          id: m.id,
          title: m.title ?? "(geen titel)",
          date: m.date,
        }))}
      />
    </div>
  );
}
