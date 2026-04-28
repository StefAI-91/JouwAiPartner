import { Clock, Moon, Pencil, ChevronRight } from "lucide-react";
import { DeviceMobile, DeviceDesktop, DeviceRow } from "./device";
import { TabHeader, MobileSubHeader } from "./tab-header";
import { MOCK_ACTIVE, MOCK_SNOOZED, type MockSuggestion } from "./mock-data";

/**
 * Variant A — card-stijl met linker accent-balk, actor-chip en
 * deadline-chip. Action-text is typografisch dominant.
 */
export function VariantA() {
  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold">Variant A — Card-stijl</h2>
          <span className="text-xs text-muted-foreground">Containment + accent-balk + chips</span>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Elk item is een eigen card met linker accent-balkje (primary = actief). Actor als chip
          linksboven — niet meer als prefix in de zin. Snooze bij hover op desktop, altijd subtiel
          zichtbaar op mobiel.
        </p>
      </header>

      <DeviceRow>
        <DeviceMobile>
          <TabHeader variant="mobile" followupCount={2} riskCount={4} />
          <MobileSubHeader />
          <div className="space-y-2 bg-muted/40 p-3">
            {MOCK_ACTIVE.map((s) => (
              <CardCompact key={s.id} suggestion={s} />
            ))}
            <button className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-muted-foreground hover:bg-muted">
              <ChevronRight className="size-3.5" />
              Gesnoozed ({MOCK_SNOOZED.length})
            </button>
          </div>
        </DeviceMobile>

        <DeviceDesktop>
          <TabHeader variant="desktop" followupCount={2} riskCount={4} />
          <div className="space-y-2 bg-muted/40 p-6">
            {MOCK_ACTIVE.map((s) => (
              <CardWide key={s.id} suggestion={s} />
            ))}
            <SnoozedDetails />
          </div>
        </DeviceDesktop>
      </DeviceRow>
    </section>
  );
}

function CardCompact({ suggestion }: { suggestion: MockSuggestion }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-l-[3px] border-primary p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Avatar initial={suggestion.actorInitial} small />
            <span className="text-[11px] font-medium text-foreground">
              {suggestion.actorNameShort}
            </span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <DeadlineChip deadline={suggestion.deadline} />
          </div>
          <button
            className="-mr-1 p-1 text-muted-foreground/40 hover:text-foreground"
            title="Snooze — AI vraagt later opnieuw"
          >
            <Moon className="size-3.5" />
          </button>
        </div>
        <p className="text-[13px] leading-snug text-foreground">{suggestion.text}</p>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{suggestion.source}</span>
        </div>
      </div>
    </div>
  );
}

function CardWide({ suggestion }: { suggestion: MockSuggestion }) {
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4 border-l-[3px] border-primary p-4">
        <Avatar initial={suggestion.actorInitial} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">{suggestion.actorName}</span>
            <DeadlineChip deadline={suggestion.deadline} />
            <span className="text-[10px] text-muted-foreground">· {suggestion.source}</span>
          </div>
          <p className="text-sm leading-snug text-foreground">{suggestion.text}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            title="Niet meer in actieve lijst — data blijft bewaard"
          >
            <Moon className="size-3.5" />
            Snooze
          </button>
          <button
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            title="Bewerken"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Avatar({ initial, small }: { initial: string; small?: boolean }) {
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary ${
        small ? "size-5 text-[10px]" : "size-8 text-xs"
      }`}
    >
      {initial}
    </div>
  );
}

function DeadlineChip({ deadline }: { deadline: MockSuggestion["deadline"] }) {
  const cls =
    deadline.tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cls}`}
    >
      {deadline.tone === "amber" && <Clock className="size-2.5" />}
      {deadline.label}
    </span>
  );
}

function SnoozedDetails() {
  return (
    <details className="mt-3">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
        <ChevronRight className="size-3.5" />
        Gesnoozed ({MOCK_SNOOZED.length}) — blijven in totaalbeeld voor AI
      </summary>
      <div className="mt-2 ml-2 space-y-1 border-l border-border pl-4">
        {MOCK_SNOOZED.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between py-1.5 text-xs italic text-muted-foreground"
          >
            <span>
              {s.actor} · {s.text}
            </span>
            <button className="text-[11px] not-italic text-primary hover:underline">
              Activeer opnieuw
            </button>
          </div>
        ))}
      </div>
    </details>
  );
}
