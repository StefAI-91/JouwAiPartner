import { Wrench } from "lucide-react";
import { NavigatiePlayground } from "./navigatie-playground";

export const metadata = {
  title: "Navigatie-test — Focus MVP",
};

export default function NavigatieTestPage() {
  return (
    <div className="relative mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
      {/* Header */}
      <div className="mb-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
            <Wrench className="h-3 w-3" />
            MVP · Nu bouwbaar
          </div>
          <h1 className="font-heading mt-5 text-[40px] font-bold leading-[1.05] tracking-tight text-foreground lg:text-[52px]">
            Actieve projecten in de nav.
            <br />
            <span className="text-primary">Geen AI. Geen nieuwe metrics.</span>
          </h1>
          <p className="mt-5 max-w-[640px] text-[15px] leading-[1.6] text-muted-foreground">
            Wat kunnen we vandaag al leveren? Drie density-varianten die strikt werken met kolommen
            die al in de database staan. Sortering op{" "}
            <code className="font-mono text-[13px]">updated_at</code>, gefilterd op delivery-fases.
            Geen scoring-formule, geen verzonnen reden — alleen zichtbaar maken wat er is.
          </p>
        </div>

        <div className="hidden items-center gap-6 rounded-xl border border-dashed border-border/60 px-5 py-4 lg:flex">
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Scope
            </div>
            <div className="font-heading mt-1 text-[13px] font-semibold text-foreground">
              ± halve dag werk
            </div>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Migraties
            </div>
            <div className="font-heading mt-1 text-[13px] font-semibold text-foreground">Geen</div>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              AI-aanroepen
            </div>
            <div className="font-heading mt-1 text-[13px] font-semibold text-foreground">Geen</div>
          </div>
        </div>
      </div>

      <NavigatiePlayground />

      {/* Footer nota */}
      <div className="mt-16 border-t border-border/40 pt-6">
        <p className="text-[12px] leading-relaxed text-muted-foreground/80">
          De data in deze mockup is <span className="font-semibold">representatief</span> — vijf
          projecten met wisselende data-volledigheid. Sommige hebben een weekly-summary, andere nog
          niet. Sommige hebben een meeting deze week, andere niet. De UI gaat daar netjes mee om:
          geen lege placeholders, geen verzonnen invulling.
        </p>
      </div>
    </div>
  );
}
