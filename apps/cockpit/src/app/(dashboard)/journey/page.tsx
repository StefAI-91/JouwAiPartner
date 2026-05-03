import { phases } from "@/app/(dashboard)/journey/_data/phases";
import { JourneyIntro } from "@/components/journey/journey-intro";
import { PhaseStrip } from "@/components/journey/phase-strip";
import { PhaseCard } from "@/components/journey/phase-card";
import { DataFlowDiagram } from "@/components/journey/data-flow-diagram";
import { WhatsNew } from "@/components/journey/whats-new";

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

      <section className="grid gap-6 lg:grid-cols-2">
        <DataFlowDiagram />
        <WhatsNew />
      </section>
    </div>
  );
}
