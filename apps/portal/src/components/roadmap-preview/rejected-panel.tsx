import { REJECTED_TOPICS } from "./mock-data";

/**
 * "Bekijk afgewezen wensen" paneel — fase 3 (PRD §8.3.6).
 * Toont de wont_do-topics met verplichte reden zodat klant ziet
 * waar afgewezen wensen heengaan. Niemand verdwijnt in een zwart gat.
 */
export function RejectedPanel({ expanded = true }: { expanded?: boolean }) {
  return (
    <div
      className="rounded-lg border bg-[var(--paper-deep)]"
      style={{ borderColor: "var(--rule-hairline)" }}
    >
      <header className="flex items-baseline justify-between gap-4 px-7 py-5">
        <div>
          <p className="section-marker mb-1.5">Niet doorgegaan</p>
          <h4 className="font-display text-[1.4rem] tracking-tight text-[var(--ink)]">
            Afgewezen wensen
          </h4>
          <p className="mt-1 max-w-[58ch] text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
            Topics die we bewust niet hebben opgepakt. Elk heeft een uitgeschreven reden — geen wens
            verdwijnt zonder uitleg.
          </p>
        </div>
        <span className="font-mono num-tabular text-[12px] tabular-nums text-[var(--ink-muted)] shrink-0">
          {REJECTED_TOPICS.length.toString().padStart(2, "0")} totaal
        </span>
      </header>

      {expanded ? (
        <ul
          className="border-t divide-y"
          style={{
            borderColor: "var(--rule-hairline)",
          }}
        >
          {REJECTED_TOPICS.map((rt) => (
            <li
              key={rt.id}
              className="px-7 py-5"
              style={{ borderTop: "1px solid var(--rule-hairline)" }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h5 className="font-display text-[1.05rem] tracking-tight text-[var(--ink-soft)]">
                  {rt.title}
                </h5>
                <span className="font-mono num-tabular text-[11px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  {rt.closedAt}
                </span>
              </div>
              <p className="mt-2 max-w-[60ch] text-[13.5px] leading-[1.55] text-[var(--ink-soft)]">
                <span className="font-mono uppercase tracking-[0.12em] text-[10px] text-[var(--ink-faint)] mr-2">
                  Reden
                </span>
                {rt.reason}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
