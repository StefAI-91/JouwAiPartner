import { Clock, Moon, ChevronRight } from "lucide-react";
import { DeviceMobile, DeviceDesktop, DeviceRow } from "./device";
import { TabHeader, MobileSubHeader } from "./tab-header";
import { MOCK_ACTIVE, MOCK_SNOOZED, type MockSuggestion } from "./mock-data";

/**
 * Variant B — inbox per persoon. Acties gegroepeerd per actor zodat
 * naam-prefix niet 2x herhaald wordt. Werkt het sterkst wanneer één
 * persoon meerdere acties heeft (zoals Wouter hier).
 */
export function VariantB() {
  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold">Variant B — Inbox per persoon</h2>
          <span className="text-xs text-muted-foreground">
            Avatar groot + acties als rows eronder
          </span>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Eén blok per actor. Naam wordt niet herhaald als één persoon meerdere acties heeft. Voelt
          aan als &quot;email-inbox van opvolgingen per persoon&quot;. Visueel rustiger bij veel
          items van weinig mensen.
        </p>
      </header>

      <DeviceRow>
        <DeviceMobile>
          <TabHeader variant="mobile" followupCount={2} riskCount={4} />
          <MobileSubHeader />
          <div className="space-y-3 bg-muted/40 p-3">
            <PersonGroupCompact actor="Wouter" suggestions={MOCK_ACTIVE} />
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-muted-foreground hover:bg-muted">
              <ChevronRight className="size-3.5" />
              Gesnoozed ({MOCK_SNOOZED.length})
            </button>
          </div>
        </DeviceMobile>

        <DeviceDesktop>
          <TabHeader variant="desktop" followupCount={2} riskCount={4} />
          <div className="space-y-3 bg-muted/40 p-6">
            <PersonGroupWide actor="Wouter van den Heuvel" suggestions={MOCK_ACTIVE} />
            <SnoozedDetails />
          </div>
        </DeviceDesktop>
      </DeviceRow>
    </section>
  );
}

/* ---------- Mobile ---------- */

function PersonGroupCompact({
  actor,
  suggestions,
}: {
  actor: string;
  suggestions: MockSuggestion[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
        <Avatar initial={suggestions[0].actorInitial} />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-foreground">{actor}</div>
          <div className="text-[10px] text-muted-foreground">
            {suggestions.length} {suggestions.length === 1 ? "actie" : "acties"} · AI volgt op
          </div>
        </div>
      </div>
      <ul className="divide-y divide-border/50">
        {suggestions.map((s) => (
          <li key={s.id} className="px-3 py-2.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <DeadlineChip deadline={s.deadline} />
              <button className="p-1 text-muted-foreground/40 hover:text-foreground" title="Snooze">
                <Moon className="size-3.5" />
              </button>
            </div>
            <p className="text-[13px] leading-snug text-foreground">{s.text}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{s.source}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Desktop ---------- */

function PersonGroupWide({ actor, suggestions }: { actor: string; suggestions: MockSuggestion[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-4 p-4">
        <AvatarLarge initial={suggestions[0].actorInitial} />
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{actor}</h3>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {suggestions.length} acties
            </span>
            <span className="text-[10px] text-muted-foreground">· AI volgt automatisch op</span>
          </div>
          <ul className="space-y-2">
            {suggestions.map((s) => (
              <li key={s.id} className="group/row flex items-start gap-3">
                <div className="mt-1.5 size-1.5 flex-shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <DeadlineChip deadline={s.deadline} />
                    <span className="text-[10px] text-muted-foreground">· {s.source}</span>
                  </div>
                  <p className="text-sm leading-snug text-foreground">{s.text}</p>
                </div>
                <button
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover/row:opacity-100"
                  title="Snooze"
                >
                  <Moon className="size-3.5" />
                  Snooze
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------- Shared bits ---------- */

function Avatar({ initial }: { initial: string }) {
  return (
    <div className="flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
      {initial}
    </div>
  );
}

function AvatarLarge({ initial }: { initial: string }) {
  return (
    <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
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
