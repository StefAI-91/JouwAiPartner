import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@repo/auth/access";
import { formatDate } from "@repo/ui/format";
import { listMeetingsWithGoldenStatus } from "@repo/database/queries/golden";
import type { MeetingWithGoldenStatus } from "@repo/database/queries/golden";

export const metadata: Metadata = {
  title: "Dev · Action Item golden picker",
};

const TYPE_LABELS: Record<string, string> = {
  project_kickoff: "Project kickoffs",
  status_update: "Status updates",
  one_on_one: "1-op-1's",
  sales: "Sales / discovery",
  team_sync: "Team syncs",
  board: "Board / strategy",
  crisis: "Crisis-management",
  other: "Overig",
};

const TYPE_ORDER = [
  "project_kickoff",
  "status_update",
  "sales",
  "one_on_one",
  "team_sync",
  "board",
  "crisis",
  "other",
];

function groupByType(meetings: MeetingWithGoldenStatus[]) {
  const grouped = new Map<string, MeetingWithGoldenStatus[]>();
  for (const m of meetings) {
    const key = m.meeting_type ?? "other";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }
  const result: { type: string; label: string; meetings: MeetingWithGoldenStatus[] }[] = [];
  for (const type of TYPE_ORDER) {
    if (grouped.has(type)) {
      result.push({
        type,
        label: TYPE_LABELS[type] ?? type,
        meetings: grouped.get(type)!,
      });
      grouped.delete(type);
    }
  }
  for (const [type, list] of grouped) {
    result.push({ type, label: TYPE_LABELS[type] ?? type, meetings: list });
  }
  return result;
}

function StatusBadge({ meeting }: { meeting: MeetingWithGoldenStatus }) {
  if (meeting.golden_status === "uncoded") {
    return (
      <span className="rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        ungecodeerd
      </span>
    );
  }
  if (meeting.golden_status === "skipped") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
        skipped
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900">
      coded · {meeting.golden_item_count} {meeting.golden_item_count === 1 ? "item" : "items"}
    </span>
  );
}

/**
 * Picker voor de Action Item golden-coding flow. Toont alle verified meetings
 * gegroepeerd op meeting_type met coding-status per regel. Doel: variatie
 * sturen — zorg dat je over minstens 3 meeting_types codeert, niet 5x kickoff.
 */
export default async function GoldenPickerPage() {
  await requireAdmin();

  const meetings = await listMeetingsWithGoldenStatus(undefined, { limit: 200 });
  const grouped = groupByType(meetings);

  const totals = {
    coded: meetings.filter((m) => m.golden_status === "coded").length,
    skipped: meetings.filter((m) => m.golden_status === "skipped").length,
    uncoded: meetings.filter((m) => m.golden_status === "uncoded").length,
    items: meetings.reduce((sum, m) => sum + m.golden_item_count, 0),
  };
  const typesWithCoded = new Set(
    meetings.filter((m) => m.golden_status === "coded").map((m) => m.meeting_type ?? "other"),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Action Item · Golden picker</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecteer meetings om handmatig te coderen als ground truth voor de Action Item
          Specialist. Doel: minimaal 5 meetings, gespreid over minstens 3 meeting_types. Klik een
          meeting om te coderen.
        </p>
      </header>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="text-sm font-semibold">Voortgang</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[12.5px] md:grid-cols-4">
          <Stat label="Verified meetings" value={meetings.length} />
          <Stat label="Coded" value={totals.coded} />
          <Stat label="Skipped" value={totals.skipped} />
          <Stat label="Ungecodeerd" value={totals.uncoded} />
          <Stat label="Totaal items" value={totals.items} />
          <Stat
            label="Types met ≥1 coded"
            value={`${typesWithCoded.size} / ${TYPE_ORDER.length}`}
          />
        </dl>
        {totals.coded < 5 && (
          <p className="mt-3 text-[11.5px] text-amber-700">
            Nog {5 - totals.coded} meetings te coderen tot je het minimum voor evaluatie haalt.
          </p>
        )}
      </section>

      {grouped.map((group) => (
        <section key={group.type} className="rounded-xl border border-border/60 bg-card">
          <header className="flex items-center justify-between border-b border-border/40 px-4 py-3">
            <h2 className="text-sm font-semibold">{group.label}</h2>
            <span className="text-[11.5px] text-muted-foreground">
              {group.meetings.length} {group.meetings.length === 1 ? "meeting" : "meetings"}
            </span>
          </header>
          <ul className="divide-y divide-border/40">
            {group.meetings.map((m) => (
              <li key={m.meeting_id}>
                <Link
                  href={`/dev/action-items/golden/${m.meeting_id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{m.title}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {formatDate(m.date)}
                      {m.organization_name && ` · ${m.organization_name}`}
                      {` · ${m.participant_count} ${m.participant_count === 1 ? "deelnemer" : "deelnemers"}`}
                    </p>
                  </div>
                  <StatusBadge meeting={m} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {meetings.length === 0 && (
        <div className="rounded-xl border border-border/60 bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          Geen verified meetings gevonden.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm">{value}</dd>
    </div>
  );
}
