import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import type { BriefingTopic } from "@repo/database/queries/portal";

interface AwaitingInputListProps {
  topics: BriefingTopic[];
  projectId: string;
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function formatOpenSince(iso: string): string {
  const days = daysSince(iso);
  if (days === 0) return "Open sinds vandaag";
  if (days === 1) return "Open sinds 1 dag";
  return `Open sinds ${days} dagen`;
}

/**
 * CP-010 — Sectie "Waar wachten we op". Topics waar de klant ons blokkeert.
 * Ambertint volgens de mockup — geen rood/oranje, dat is voor incidenten.
 *
 * Empty-state expliciet positief geformuleerd: "Geen extra blockers — we
 * kunnen door". Dat is een actief signaal naar de klant dat het team niet
 * wacht op iets dat hij vergeten is.
 */
export function AwaitingInputList({ topics, projectId }: AwaitingInputListProps) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Waar wachten we op</h2>
        {topics.length > 0 ? (
          <span className="text-xs text-amber-700">
            {topics.length} {topics.length === 1 ? "item" : "items"}
          </span>
        ) : null}
      </div>
      <div className="space-y-3">
        {topics.map((topic) => (
          <article key={topic.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex items-start gap-2.5">
              <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">{topic.client_title ?? topic.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatOpenSince(topic.updated_at)}
                </p>
                <Link
                  href={`/projects/${projectId}/roadmap/${topic.id}`}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  Bekijk topic
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          </article>
        ))}
        {topics.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card px-3 py-3 text-center text-xs text-muted-foreground">
            Geen extra blockers — we kunnen door.
          </p>
        ) : null}
      </div>
    </section>
  );
}
