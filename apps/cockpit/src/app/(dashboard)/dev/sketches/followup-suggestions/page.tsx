import { AlertTriangle, Mail, Clock, Moon, Pencil, ChevronRight } from "lucide-react";

/**
 * Sketch — opvolgsuggesties redesign · variant A (card-stijl).
 * Opt-out flow: AI volgt automatisch op, gebruiker kan snoozen.
 * Snooze ≠ delete — data blijft voor totaalbeeld.
 *
 * URL: /dev/sketches/followup-suggestions
 */
export default function FollowUpSuggestionsSketchPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-12 px-6 py-10">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          🎨 MOCKUP — ter validatie · opt-out flow
        </div>
        <h1 className="text-2xl font-semibold">Opvolgsuggesties — design varianten</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          AI volgt automatisch op. Gebruiker kan items <em>snoozen</em> (niet verwijderen — data
          blijft voor het totaalbeeld). Onder &quot;Gesnoozed (n)&quot; blijven ze vindbaar en
          activeerbaar.
        </p>
      </header>

      <VariantA />

      <section className="rounded-xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Variant B (Inbox per persoon) en C (Compacte checklist) volgen na feedback op A.
      </section>
    </div>
  );
}

function VariantA() {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-xl font-semibold">Variant A — Card-stijl</h2>
        <span className="text-xs text-muted-foreground">
          Containment + deadline-chip + actor-chip + subtiele snooze
        </span>
      </div>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Elk item is een eigen card met linker accent-balkje. Actor (Wouter) als chip linksboven —
        niet meer als prefix in de zin. Deadline-chip rechts. Snooze-knop alleen zichtbaar bij hover
        (desktop) of altijd klein (mobiel). Action-text neemt de typografische hoofdrol.
      </p>

      <div className="flex flex-wrap items-start gap-8">
        <DeviceMobile>
          <CardListMobile />
        </DeviceMobile>
        <DeviceDesktop>
          <CardListDesktop />
        </DeviceDesktop>
      </div>
    </section>
  );
}

/* ---------- Device frames ---------- */

function DeviceMobile({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-[28px] bg-white"
      style={{ width: 360, border: "8px solid #1f2937" }}
    >
      {children}
    </div>
  );
}

function DeviceDesktop({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-white shadow-md"
      style={{ width: 720 }}
    >
      {children}
    </div>
  );
}

/* ---------- Mobile layout ---------- */

function CardListMobile() {
  return (
    <>
      <TabHeaderMobile />
      <SubHeaderMobile />
      <div className="space-y-2 bg-muted/40 p-3">
        <SuggestionCard
          actorInitial="W"
          actorName="Wouter"
          deadline={{ label: "deze week", tone: "amber" }}
          text="Checken of Stef een exportlijst kan genereren vanuit DevHub met opgeloste en openstaande tickets op bug- en feature-niveau, conform het besproken format."
          source="uit transcript · 12:47"
          compact
        />
        <SuggestionCard
          actorInitial="W"
          actorName="Wouter"
          deadline={{ label: "geen deadline", tone: "neutral" }}
          text="Lijst aanleveren met feedbackpunten die hij tijdens de review tegenkomt, zodat Stef die kan verwerken in het AI-model."
          source="uit transcript · 23:11"
          compact
        />
        <SnoozedToggleMobile count={1} />
      </div>
    </>
  );
}

function TabHeaderMobile() {
  return (
    <div className="flex items-center gap-1 border-b border-border px-4 pt-3 pb-2">
      <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted">
        <AlertTriangle className="size-4 text-red-500" />
        Risico&apos;s
        <span className="rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-700">
          4
        </span>
      </button>
      <button className="flex items-center gap-1.5 rounded-md border-b-2 border-primary bg-primary/10 px-2.5 py-1.5 text-sm font-medium text-primary">
        <Mail className="size-4 text-amber-500" />
        Opvolgen
        <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">
          2
        </span>
      </button>
    </div>
  );
}

function SubHeaderMobile() {
  return (
    <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
      <p className="flex items-center gap-1 text-[11px] leading-tight text-muted-foreground">
        <Clock className="size-3 text-primary" />
        AI volgt deze automatisch op
      </p>
      <button className="text-[11px] text-muted-foreground/70 hover:text-foreground">
        Hoe werkt dit?
      </button>
    </div>
  );
}

function SnoozedToggleMobile({ count }: { count: number }) {
  return (
    <button className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-muted-foreground hover:bg-muted">
      <ChevronRight className="size-3.5" />
      Gesnoozed ({count})
    </button>
  );
}

/* ---------- Desktop layout ---------- */

function CardListDesktop() {
  return (
    <>
      <TabHeaderDesktop />
      <div className="space-y-2 bg-muted/40 p-6">
        <SuggestionCard
          actorInitial="W"
          actorName="Wouter van den Heuvel"
          deadline={{ label: "deze week", tone: "amber" }}
          text="Checken of Stef een exportlijst kan genereren vanuit DevHub met opgeloste en openstaande tickets op bug- en feature-niveau, conform het besproken format."
          source="uit transcript 12:47"
        />
        <SuggestionCard
          actorInitial="W"
          actorName="Wouter van den Heuvel"
          deadline={{ label: "geen deadline", tone: "neutral" }}
          text="Lijst aanleveren met feedbackpunten die hij tijdens de review tegenkomt, zodat Stef die kan verwerken in het AI-model."
          source="uit transcript 23:11"
        />
        <SnoozedDetailsDesktop />
      </div>
    </>
  );
}

function TabHeaderDesktop() {
  return (
    <div className="flex items-center justify-between border-b border-border px-6 pt-4 pb-3">
      <div className="flex items-center gap-1">
        <button className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
          <AlertTriangle className="size-4 text-red-500" />
          Risico&apos;s
          <span className="rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-700">
            4
          </span>
        </button>
        <button className="flex items-center gap-1.5 rounded-md border-b-2 border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
          <Mail className="size-4 text-amber-500" />
          Opvolgsuggesties
          <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">
            2
          </span>
        </button>
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Clock className="size-3 text-primary" />
        AI volgt automatisch op — snooze wat niet hoeft
      </p>
    </div>
  );
}

function SnoozedDetailsDesktop() {
  return (
    <details className="mt-3">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
        <ChevronRight className="size-3.5" />
        Gesnoozed (1) — blijven in totaalbeeld voor AI
      </summary>
      <div className="mt-2 ml-2 space-y-1 border-l border-border pl-4">
        <div className="flex items-center justify-between py-1.5 text-xs italic text-muted-foreground">
          <span>Stef · Knop voor markdown-uploadlimiet onderzoeken</span>
          <button className="text-[11px] text-primary hover:underline not-italic">
            Activeer opnieuw
          </button>
        </div>
      </div>
    </details>
  );
}

/* ---------- Suggestion card ---------- */

interface SuggestionCardProps {
  actorInitial: string;
  actorName: string;
  deadline: { label: string; tone: "amber" | "neutral" };
  text: string;
  source: string;
  compact?: boolean;
}

function SuggestionCard({
  actorInitial,
  actorName,
  deadline,
  text,
  source,
  compact,
}: SuggestionCardProps) {
  const deadlineClass =
    deadline.tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground";

  if (compact) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-l-[3px] border-primary p-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Avatar initial={actorInitial} small />
              <span className="text-[11px] font-medium text-foreground">{actorName}</span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <DeadlineChip label={deadline.label} className={deadlineClass} small />
            </div>
            <SnoozeButton small />
          </div>
          <p className="text-[13px] leading-snug text-foreground">{text}</p>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>{source}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4 border-l-[3px] border-primary p-4">
        <Avatar initial={actorInitial} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">{actorName}</span>
            <DeadlineChip label={deadline.label} className={deadlineClass} />
            <span className="text-[10px] text-muted-foreground">· {source}</span>
          </div>
          <p className="text-sm leading-snug text-foreground">{text}</p>
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

function DeadlineChip({
  label,
  className,
  small,
}: {
  label: string;
  className: string;
  small?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ${
        small ? "text-[10px]" : "text-[10px]"
      } font-medium ${className}`}
    >
      {label === "deze week" && <Clock className="size-2.5" />}
      {label}
    </span>
  );
}

function SnoozeButton({ small }: { small?: boolean }) {
  return (
    <button
      className={`-mr-1 p-1 text-muted-foreground/40 hover:text-foreground ${small ? "" : ""}`}
      title="Snooze — AI vraagt later opnieuw"
    >
      <Moon className="size-3.5" />
    </button>
  );
}
