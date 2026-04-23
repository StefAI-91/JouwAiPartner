import type { Metadata } from "next";
import { requireAdmin } from "@repo/auth/access";
import { listVerifiedMeetings } from "@repo/database/queries/meetings";
import { DevTaggerClient } from "./client";

export const metadata: Metadata = {
  title: "Dev · ThemeTagger harness",
};

/**
 * TH-010 (UI-320, SEC-220) — admin-only `/dev/tagger`. `requireAdmin`
 * redirect naar `/login` voor non-admins; de client-side component doet
 * zelf geen auth-logic. De action `runDevTaggerAction` herhaalt de guard
 * (defense-in-depth).
 *
 * Wanneer de bredere `/dev/extractor` route land, verhuist deze view als
 * tweede tab/pane in die route — zie sprint TH-010 §Doel.
 */
export default async function DevTaggerPage() {
  await requireAdmin();

  const { data: meetings } = await listVerifiedMeetings(undefined, { limit: 100 });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">ThemeTagger harness</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dry-run: roep de Tagger aan op een verified meeting en vergelijk de output met de huidige
          DB-state. Schrijft niets. Voor prompt-tuning zonder redeploy-bleed.
        </p>
      </header>
      <DevTaggerClient
        meetings={meetings.map((m) => ({
          id: m.id,
          title: m.title ?? "(geen titel)",
          date: m.date,
        }))}
      />
    </div>
  );
}
