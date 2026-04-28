import { REPORTS } from "./mock-data";

export function ReportsList() {
  return (
    <div
      className="rounded-lg border bg-[var(--paper-elevated)] overflow-hidden"
      style={{ borderColor: "var(--rule-hairline)" }}
    >
      <header className="px-7 py-5 border-b" style={{ borderColor: "var(--rule-hairline)" }}>
        <p className="section-marker mb-1.5">Rapporten</p>
        <h4 className="font-display text-[1.5rem] tracking-tight text-[var(--ink)]">
          Wekelijkse rapporten — CAI Studio
        </h4>
        <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
          Bevroren snapshots met handgeschreven kritische noot. Nieuw rapport elke vrijdag.
        </p>
      </header>

      <ol>
        {REPORTS.map((rep, idx) => {
          const isLatest = idx === 0;
          return (
            <li
              key={rep.id}
              className="group flex items-center justify-between gap-5 px-7 py-5 transition-colors hover:bg-[var(--paper-cream)]"
              style={{
                borderTop: idx === 0 ? "none" : "1px solid var(--rule-hairline)",
              }}
            >
              <div className="flex items-baseline gap-5 min-w-0">
                {/* Date column */}
                <div className="shrink-0 w-[110px]">
                  <p className="font-mono num-tabular text-[11px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                    {rep.compiledAt}
                  </p>
                </div>

                {/* Title */}
                <div className="min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h5 className="font-display text-[1.15rem] tracking-tight text-[var(--ink)]">
                      {rep.title}
                    </h5>
                    {isLatest ? (
                      <span
                        className="font-mono text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-sm"
                        style={{
                          color: "var(--accent-brand-deep)",
                          backgroundColor: "var(--accent-brand-soft)",
                        }}
                      >
                        Nieuwste
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-[var(--ink-muted)]">
                    Samengesteld door {rep.compiledByName}
                  </p>
                </div>
              </div>

              {/* Read indicator */}
              <span
                aria-hidden
                className="font-display text-[1.4rem] text-[var(--ink-faint)] transition-all group-hover:translate-x-1 group-hover:text-[var(--accent-brand-deep)]"
              >
                →
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
