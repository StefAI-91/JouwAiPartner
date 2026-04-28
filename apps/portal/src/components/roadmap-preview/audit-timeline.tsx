import { AUDIT_TIMELINE } from "./mock-data";

/**
 * Klant-versie van de audit-timeline (PRD §8.3.5).
 * Geen team-actor-namen, alleen datum + neutrale beschrijving.
 */
export function AuditTimeline() {
  return (
    <div
      className="rounded-lg border bg-[var(--paper-elevated)] p-7"
      style={{ borderColor: "var(--rule-hairline)" }}
    >
      <header className="pb-5">
        <p className="section-marker mb-1.5">Geschiedenis</p>
        <h4 className="font-display text-[1.4rem] tracking-tight text-[var(--ink)]">
          Wat er is gebeurd met dit topic
        </h4>
      </header>

      <ol className="relative">
        {/* Timeline rule */}
        <span
          aria-hidden
          className="absolute left-[6px] top-2 bottom-2 w-px"
          style={{ backgroundColor: "var(--rule-hairline)" }}
        />

        {AUDIT_TIMELINE.map((entry, idx) => {
          const isLatest = idx === AUDIT_TIMELINE.length - 1;
          return (
            <li key={`${entry.date}-${idx}`} className="relative flex gap-5 pl-6 pb-5 last:pb-0">
              {/* Dot */}
              <span
                aria-hidden
                className="absolute left-[2px] top-[7px] size-[9px] rounded-full"
                style={{
                  backgroundColor: isLatest ? "var(--accent-brand)" : "var(--paper-elevated)",
                  border: isLatest ? "none" : "1.5px solid var(--rule-hairline)",
                  boxShadow: isLatest ? "0 0 0 4px var(--accent-brand-soft)" : "none",
                }}
              />
              <div className="flex-1 -mt-0.5">
                <p className="font-mono num-tabular text-[11px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  {entry.date}
                </p>
                <p
                  className="mt-1 text-[14px] leading-snug"
                  style={{
                    color: isLatest ? "var(--ink)" : "var(--ink-soft)",
                    fontWeight: isLatest ? 500 : 400,
                  }}
                >
                  {entry.text}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
