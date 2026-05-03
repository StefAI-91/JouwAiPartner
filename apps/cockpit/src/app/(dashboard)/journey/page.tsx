import { phases } from "@/app/(dashboard)/journey/_data/phases";
import { JourneyIntro } from "@/components/journey/journey-intro";
import { PhaseStrip } from "@/components/journey/phase-strip";
import { PhaseCard } from "@/components/journey/phase-card";
import { DataFlowDiagram } from "@/components/journey/data-flow-diagram";
import { WhatsNew } from "@/components/journey/whats-new";
import { ScopeAuditFlow } from "@/components/journey/scope-audit-flow";
import { LivingDocumentMockup } from "@/components/journey/living-document-mockup";
import { MockupGeneratorConcept } from "@/components/journey/mockup-generator-concept";

export const metadata = {
  title: "Klantreis — Cockpit",
};

export default function JourneyPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1>De klantreis als cockpit-model</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Negen fases, van eerste lead tot renewal. Per fase: wat doet de cockpit, en welke
          deliverable rolt eruit.
        </p>
      </div>

      <JourneyIntro />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">De negen fases in één oogopslag</h2>
        <PhaseStrip />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Per fase uitgewerkt</h2>
        <div className="space-y-4">
          {phases.map((phase) => (
            <PhaseCard key={phase.id} phase={phase} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Zoom-in op de Discovery → Sales overgang</h2>
        <p className="text-sm text-muted-foreground">
          De fase-overgang van 2 naar 3 is de belangrijkste — daar wordt bepaald of we klaar zijn
          voor een PRD/voorstel. Hieronder de state machine die dat aanstuurt.
        </p>
        <ScopeAuditFlow />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Het levend project-document</h2>
        <p className="text-sm text-muted-foreground">
          Geen statisch artefact aan het eind — één document dat met elke meeting/email rijker
          wordt. Per sectie een rijpheid-meter, bron-traceerbaarheid en aannames apart gemarkeerd.
          Onderstaande mockup toont hoe een Discovery-project er bij 62% rijpheid uitziet.
        </p>
        <LivingDocumentMockup />
      </section>

      <section className="space-y-3">
        <MockupGeneratorConcept />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <DataFlowDiagram />
        <WhatsNew />
      </section>
    </div>
  );
}
