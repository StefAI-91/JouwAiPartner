import type { BriefingSprint, BriefingTopic } from "@repo/database/queries/portal";
import { ReadyToTestCard, type ReadyToTestItem } from "./ready-to-test-card";

interface ReadyToTestListProps {
  topics: BriefingTopic[];
  sprints: BriefingSprint[];
  hasPreviewLink: boolean;
}

/**
 * CP-010 — Sectie "Klaar om te testen". Server component die de lijst van
 * topics + ingevulde instructies rendert. Eerste card opent default zodat
 * de klant het instructie-patroon meteen ziet zonder eerst te klikken.
 *
 * CP-012 follow-up — sprints kunnen ook direct testbaar zijn (zonder
 * tussenliggend topic). Sprints renderen we eerst, daarna topics — sprint-
 * niveau is breder en past natuurlijk als kop boven de feature-detail-cards.
 *
 * Empty-state: blok blijft zichtbaar met subtiele lege-state-tekst zodat
 * de klant snapt dat hier later iets verschijnt zodra het team test-
 * instructies invult — anders lijkt er niets te gebeuren.
 */
export function ReadyToTestList({ topics, sprints, hasPreviewLink }: ReadyToTestListProps) {
  const items: ReadyToTestItem[] = [
    ...sprints.map((s): ReadyToTestItem => ({ kind: "sprint", sprint: s })),
    ...topics.map((t): ReadyToTestItem => ({ kind: "topic", topic: t })),
  ];

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Klaar om te testen</h2>
        {items.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
            {hasPreviewLink ? " · live op preview" : ""}
          </span>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card px-4 py-5 text-center text-sm text-muted-foreground">
          Nog niets te testen — zodra het team een feature klaarzet voor jou verschijnt hij hier met
          instructies.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <ReadyToTestCard
              key={item.kind === "sprint" ? `sprint-${item.sprint.id}` : `topic-${item.topic.id}`}
              item={item}
              defaultOpen={index === 0}
            />
          ))}
        </div>
      )}
    </section>
  );
}
