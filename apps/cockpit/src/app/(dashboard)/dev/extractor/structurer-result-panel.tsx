import type { DevExtractorResult } from "@/actions/dev-extractor";
import type { ExtractionType } from "@repo/ai/extraction-types";
import { Panel, summariseMetadata } from "./panel";

export function StructurerResultPanel({
  result,
  type,
}: {
  result: DevExtractorResult;
  type: ExtractionType;
}) {
  return (
    <>
      <div className="rounded-lg bg-primary/5 px-4 py-3 text-sm leading-relaxed">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
          Fresh briefing (niet type-gefilterd)
        </p>
        <p className="text-foreground/85">{result.freshBriefing}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Panel title="Transcript" copyValue={result.transcript}>
          <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/80 select-text">
            {result.transcript}
          </pre>
        </Panel>

        <Panel
          title={`DB — type="${type}"`}
          count={result.currentInDb.length}
          copyValue={JSON.stringify(result.currentInDb, null, 2)}
        >
          {result.currentInDb.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">Niets opgeslagen voor dit type.</p>
          ) : (
            <ul className="space-y-2">
              {result.currentInDb.map((row) => (
                <li key={row.id} className="rounded border bg-background p-2 text-xs">
                  <p className="leading-snug">{row.content}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    conf {row.confidence?.toFixed(2) ?? "—"} · {summariseMetadata(row.metadata)}
                  </p>
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                      raw metadata
                    </summary>
                    <pre className="mt-1 overflow-auto rounded bg-muted/30 p-2 text-[10px] leading-snug">
                      {JSON.stringify(row.metadata, null, 2)}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={`Fresh — type="${type}"`}
          count={result.freshOutput.length}
          accent
          copyValue={JSON.stringify(result.freshOutput, null, 2)}
        >
          {result.freshOutput.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              Agent emit geen items van dit type op deze meeting.
            </p>
          ) : (
            <ul className="space-y-2">
              {result.freshOutput.map((k, i) => (
                <li key={i} className="rounded border border-primary/30 bg-primary/5 p-2 text-xs">
                  <p className="leading-snug">{k.content}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    conf {k.confidence.toFixed(2)} · {summariseMetadata(k.metadata)}
                  </p>
                  {k.source_quote && (
                    <blockquote className="mt-1 border-l-2 border-muted pl-2 text-[10px] italic text-muted-foreground">
                      {k.source_quote}
                    </blockquote>
                  )}
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                      raw JSON
                    </summary>
                    <pre className="mt-1 overflow-auto rounded bg-background p-2 text-[10px] leading-snug">
                      {JSON.stringify(
                        {
                          theme: k.theme,
                          theme_project: k.theme_project,
                          project: k.project,
                          confidence: k.confidence,
                          source_quote: k.source_quote,
                          metadata: k.metadata,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
