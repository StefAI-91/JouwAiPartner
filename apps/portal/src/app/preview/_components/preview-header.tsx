import { CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@repo/ui/card";

export function PreviewTopBar() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border/50 bg-white/70 px-8 backdrop-blur-md lg:px-12">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Connect-CRM</span>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">Briefing</span>
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[12px]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          <span className="text-muted-foreground">Live · ververst </span>
          <span className="font-mono text-[11px] text-foreground">14:32</span>
        </span>
        <button className="rounded-full border border-border bg-card px-3 py-1 text-[12px] text-muted-foreground hover:bg-muted/40">
          Week 18 · 2026
        </button>
      </div>
    </header>
  );
}

export function PreviewHero() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="size-5 text-primary/70" />
          <span className="text-sm font-medium text-muted-foreground">
            Goedemorgen, Stefan — maandag 27 april
          </span>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Hier is jullie week.</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Drie issues gesloten, één feature wacht op jou, geen actieve incidenten. Alles wat hier
          staat is herleidbaar naar een ticket of meeting — klik door of laat een commentaar achter.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/40">
          Wekelijkse PDF
        </button>
        <button className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Nieuw ticket
        </button>
      </div>
    </div>
  );
}

export function PreviewStatusBanner() {
  return (
    <Card className="ring-success/30 bg-gradient-to-br from-success/5 via-transparent to-transparent">
      <CardContent className="flex flex-wrap items-center gap-4 px-5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-full bg-success/15">
            <CheckCircle2 className="size-4 text-success" />
          </span>
          <div>
            <div className="font-heading text-[15px] font-semibold">Geen actieve incidenten.</div>
            <div className="text-[12.5px] text-muted-foreground">
              Laatste deploy gisteren 16:42 · 1.402 requests in het laatste uur · 0 errors boven p1.
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-6 text-sm">
          <Stat label="Verzonden" value="3" />
          <span className="h-8 w-px bg-border" />
          <Stat label="Open" value="12" />
          <span className="h-8 w-px bg-border" />
          <Stat label="Vertraagd" value="1" tone="warning" />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <span
        className={`font-mono text-[20px] font-semibold leading-none ${tone === "warning" ? "text-amber-600" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}
