import type { BriefingTopic } from "@repo/database/queries/portal";
import { ReadyToTestCard } from "./ready-to-test-card";

interface ReadyToTestListProps {
  topics: BriefingTopic[];
  hasPreviewLink: boolean;
}

/**
 * CP-010 — Sectie "Klaar om te testen". Server component die de lijst van
 * topics + ingevulde instructies rendert. Eerste card opent default zodat
 * de klant het instructie-patroon meteen ziet zonder eerst te klikken.
 *
 * Empty-state: blok blijft zichtbaar met subtiele lege-state-tekst zodat
 * de klant snapt dat hier later iets verschijnt zodra het team test-
 * instructies invult — anders lijkt er niets te gebeuren.
 */
export function ReadyToTestList({ topics, hasPreviewLink }: ReadyToTestListProps) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Klaar om te testen</h2>
        {topics.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {topics.length} {topics.length === 1 ? "item" : "items"}
            {hasPreviewLink ? " · live op preview" : ""}
          </span>
        ) : null}
      </div>
      {topics.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card px-4 py-5 text-center text-sm text-muted-foreground">
          Nog niets te testen — zodra het team een feature klaarzet voor jou verschijnt hij hier met
          instructies.
        </p>
      ) : (
        <div className="space-y-3">
          {topics.map((topic, index) => (
            <ReadyToTestCard key={topic.id} topic={topic} defaultOpen={index === 0} />
          ))}
        </div>
      )}
    </section>
  );
}
