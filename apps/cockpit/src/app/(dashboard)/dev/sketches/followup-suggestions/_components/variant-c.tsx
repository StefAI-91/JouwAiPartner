import { Clock, ChevronRight } from "lucide-react";
import { DeviceMobile, DeviceDesktop, DeviceRow } from "./device";
import { TabHeader, MobileSubHeader } from "./tab-header";
import { MOCK_ACTIVE, MOCK_SNOOZED, type MockSuggestion } from "./mock-data";

/**
 * Variant C — compacte checklist. Checkbox-icoon links als primaire
 * snooze-actie ("vink af = niet meer herinneren"). Geen card-frames,
 * alleen dividers. Maximale dichtheid, minimum chrome.
 */
export function VariantC() {
  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold">Variant C — Compacte checklist</h2>
          <span className="text-xs text-muted-foreground">
            Checkbox = snooze · maximale dichtheid
          </span>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Geen cards, alleen dividers. De cirkel links is de primaire actie: aanvinken = item
          verbergen uit actieve lijst (= snooze). Tooltip maakt expliciet dat het niet hard
          verwijderd wordt. Voelt als een klassieke todo-lijst, maar de mental model is &quot;niet
          meer herinneren&quot; in plaats van &quot;klaar&quot;.
        </p>
      </header>

      <DeviceRow>
        <DeviceMobile>
          <TabHeader variant="mobile" followupCount={2} riskCount={4} />
          <MobileSubHeader />
          <ul className="divide-y divide-border bg-card">
            {MOCK_ACTIVE.map((s) => (
              <ChecklistRow key={s.id} suggestion={s} compact />
            ))}
          </ul>
          <button className="flex w-full items-center gap-2 border-t border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground hover:bg-muted">
            <ChevronRight className="size-3.5" />
            Gesnoozed ({MOCK_SNOOZED.length})
          </button>
        </DeviceMobile>

        <DeviceDesktop>
          <TabHeader variant="desktop" followupCount={2} riskCount={4} />
          <ul className="divide-y divide-border bg-card">
            {MOCK_ACTIVE.map((s) => (
              <ChecklistRow key={s.id} suggestion={s} />
            ))}
          </ul>
          <SnoozedSection />
        </DeviceDesktop>
      </DeviceRow>
    </section>
  );
}

function ChecklistRow({ suggestion, compact }: { suggestion: MockSuggestion; compact?: boolean }) {
  const padding = compact ? "px-3 py-3" : "px-6 py-4";
  const textSize = compact ? "text-[13px]" : "text-sm";
  const metaSize = compact ? "text-[10px]" : "text-[11px]";
  const actorName = compact ? suggestion.actorNameShort : suggestion.actorName;

  return (
    <li className={`group flex items-start gap-3 ${padding} hover:bg-muted/40`}>
      <SnoozeCheckbox />
      <div className="min-w-0 flex-1">
        <p className={`${textSize} leading-snug text-foreground`}>{suggestion.text}</p>
        <div className={`mt-1 flex flex-wrap items-center gap-2 ${metaSize} text-muted-foreground`}>
          <span className="font-medium text-foreground/70">{actorName}</span>
          <span>·</span>
          <DeadlineChip deadline={suggestion.deadline} />
          <span>·</span>
          <span>{suggestion.source}</span>
        </div>
      </div>
    </li>
  );
}

/**
 * Checkbox die geen "klaar" maar "snooze" betekent. Visueel een checkbox
 * omdat dat een vertrouwd patroon is, met een tooltip die de echte
 * semantiek uitlegt.
 */
function SnoozeCheckbox() {
  return (
    <button
      type="button"
      className="group/cb relative mt-0.5 flex size-4 flex-shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 transition-all hover:border-primary hover:bg-primary/10"
      title="Niet meer herinneren — verdwijnt uit lijst, blijft bewaard voor totaalbeeld"
    >
      <span className="hidden size-2 rounded-full bg-primary group-hover/cb:block" />
    </button>
  );
}

function DeadlineChip({ deadline }: { deadline: MockSuggestion["deadline"] }) {
  if (deadline.tone === "neutral") {
    return <span className="italic text-muted-foreground/70">{deadline.label}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
      <Clock className="size-2.5" />
      {deadline.label}
    </span>
  );
}

function SnoozedSection() {
  return (
    <details className="border-t border-border bg-muted/40">
      <summary className="flex cursor-pointer items-center gap-2 px-6 py-3 text-xs text-muted-foreground hover:text-foreground">
        <ChevronRight className="size-3.5" />
        Gesnoozed ({MOCK_SNOOZED.length}) — blijven in totaalbeeld voor AI
      </summary>
      <ul className="divide-y divide-border/50">
        {MOCK_SNOOZED.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between px-6 py-2 text-xs italic text-muted-foreground"
          >
            <span>
              {s.actor} · {s.text}
            </span>
            <button className="text-[11px] not-italic text-primary hover:underline">
              Activeer opnieuw
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
