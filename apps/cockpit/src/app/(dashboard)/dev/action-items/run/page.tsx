import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@repo/auth/access";
import { listMeetingsWithGoldenStatus } from "@repo/database/queries/golden";
import { RunActionItemHarnessClient } from "./client";

export const metadata: Metadata = {
  title: "Dev · Action Item Specialist harness",
};

/**
 * Harness voor de Action Item Specialist v1. Picker toont alleen meetings die
 * in de golden dataset zijn gecodeerd — voor anderen kunnen we niet evalueren.
 * Run-knop roept de agent aan, vergelijkt met golden, toont precision/recall +
 * per-item diff. Geen DB-writes voor extractions; agent_runs wordt wél gelogd
 * voor audit.
 */
export default async function ActionItemRunHarnessPage() {
  await requireAdmin();

  const meetings = await listMeetingsWithGoldenStatus(undefined, { limit: 200 });
  const codedMeetings = meetings
    .filter((m) => m.golden_status === "coded")
    .map((m) => ({
      id: m.meeting_id,
      title: m.title,
      date: m.date,
      meeting_type: m.meeting_type,
      golden_item_count: m.golden_item_count,
    }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dev/action-items/golden"
            className="text-[11.5px] text-muted-foreground hover:underline"
          >
            ← Naar golden picker
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Action Item Specialist · Run-harness
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kies een gecodeerde meeting → run de v1-agent → zie precision/recall vs golden +
            per-item diff. Echte Anthropic-call (kost tokens), géén DB-writes voor extracties.
          </p>
        </div>
      </header>

      {codedMeetings.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Geen gecodeerde meetings gevonden. Code er minstens één op{" "}
          <Link href="/dev/action-items/golden" className="font-semibold underline">
            /dev/action-items/golden
          </Link>{" "}
          voordat de harness iets kan vergelijken.
        </div>
      ) : (
        <RunActionItemHarnessClient meetings={codedMeetings} />
      )}
    </div>
  );
}
