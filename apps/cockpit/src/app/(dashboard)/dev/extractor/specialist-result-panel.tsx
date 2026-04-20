import { Shield } from "lucide-react";
import type { DevRiskSpecialistResult } from "@/actions/dev-extractor";
import { Panel, summariseMetadata } from "./panel";

export function SpecialistResultPanel({ result }: { result: DevRiskSpecialistResult }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-2 text-xs">
        <p className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          <Shield className="size-3.5" /> RiskSpecialist A/B
        </p>
        <span className="text-muted-foreground">
          prompt {result.promptVersion} · Sonnet 4.6 high
        </span>
        <span className="text-muted-foreground">{result.metrics.latency_ms}ms</span>
        <span className="text-muted-foreground">
          in {result.metrics.input_tokens ?? "?"}t · out {result.metrics.output_tokens ?? "?"}t ·
          reason {result.metrics.reasoning_tokens ?? "?"}t
        </span>
        <span className="ml-auto font-medium">
          Specialist: {result.freshRisks.length} risks · DB (structurer):{" "}
          {result.currentInDb.length}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Panel title="Transcript" copyValue={result.transcript}>
          <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/80 select-text">
            {result.transcript}
          </pre>
        </Panel>

        <Panel
          title="Structurer-risks (in DB)"
          count={result.currentInDb.length}
          copyValue={JSON.stringify(result.currentInDb, null, 2)}
        >
          {result.currentInDb.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              Geen risks in DB voor deze meeting.
            </p>
          ) : (
            <ul className="space-y-2">
              {result.currentInDb.map((row) => (
                <li key={row.id} className="rounded border bg-background p-2 text-xs">
                  <p className="leading-snug">{row.content}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    conf {row.confidence?.toFixed(2) ?? "—"} · {summariseMetadata(row.metadata)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="RiskSpecialist-risks (fresh)"
          count={result.freshRisks.length}
          accent
          copyValue={JSON.stringify(result.freshRisks, null, 2)}
        >
          {result.freshRisks.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              RiskSpecialist emit geen risks voor deze meeting.
            </p>
          ) : (
            <ul className="space-y-2">
              {result.freshRisks.map((r, i) => (
                <li
                  key={i}
                  className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-xs"
                >
                  <p className="leading-snug">{r.content}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    conf {r.confidence.toFixed(2)} ·{" "}
                    {summariseMetadata(r.metadata as Record<string, unknown>)}
                  </p>
                  {r.source_quote && (
                    <blockquote className="mt-1 border-l-2 border-muted pl-2 text-[10px] italic text-muted-foreground">
                      {r.source_quote}
                    </blockquote>
                  )}
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                      raw JSON
                    </summary>
                    <pre className="mt-1 overflow-auto rounded bg-background p-2 text-[10px] leading-snug">
                      {JSON.stringify(r, null, 2)}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
