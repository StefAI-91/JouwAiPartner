import { FlaskConical } from "lucide-react";
import { NavigatiePlayground } from "./navigatie-playground";

export const metadata = {
  title: "Navigatie-test — AI-gecureerde focus",
};

export default function NavigatieTestPage() {
  return (
    <div className="relative mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
      {/* Header */}
      <div className="mb-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
            <FlaskConical className="h-3 w-3" />
            Brainstorm · Mockup
          </div>
          <h1 className="font-heading mt-5 text-[40px] font-bold leading-[1.05] tracking-tight text-foreground lg:text-[52px]">
            De nav is geen menu.
            <br />
            <span className="text-primary">Het is een werkoppervlak.</span>
          </h1>
          <p className="mt-5 max-w-[620px] text-[15px] leading-[1.6] text-muted-foreground">
            In een AI-native cockpit zijn projecten geen lijst, maar een gerankte focus. AI
            organiseert, mens stuurt. Hieronder drie varianten met dezelfde achterliggende scoring —
            gebruik de scenario-toggle om te zien hoe de focus door de week schuift.
          </p>
        </div>

        <div className="hidden items-center gap-6 rounded-xl border border-dashed border-border/60 px-5 py-4 lg:flex">
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Status
            </div>
            <div className="font-heading mt-1 text-[13px] font-semibold text-foreground">
              Niet geïmplementeerd
            </div>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Route
            </div>
            <div className="mt-1 font-mono text-[12px] text-primary">/navigatie-test</div>
          </div>
        </div>
      </div>

      <NavigatiePlayground />

      {/* Footer nota */}
      <div className="mt-16 border-t border-border/40 pt-6">
        <p className="text-[12px] leading-relaxed text-muted-foreground/80">
          Alle data op deze pagina is <span className="font-semibold">mock</span>. De scoring,
          reden-teksten en gezondheidskleuren simuleren wat{" "}
          <code className="font-mono text-[11px]">getFocusProjects()</code> in productie zou ophalen
          uit de Weekly Summarizer, extractions en email-signals.
        </p>
      </div>
    </div>
  );
}
