import {
  ACTIVE_REPORT_NARRATIVE,
  ACTIVE_REPORT_PATTERNS,
  ACTIVE_REPORT_TOPICS,
  getTopicById,
  REPORTS,
} from "./mock-data";

const SECTION_TITLES: Record<keyof typeof ACTIVE_REPORT_TOPICS, string> = {
  recent_fixed: "Recent gefixt",
  coming_week: "Komende week",
  high_prio_after: "Hoge prio daarna",
  unprioritized: "Niet geprioritiseerd",
};

const SECTION_NUMBERS: Record<keyof typeof ACTIVE_REPORT_TOPICS, string> = {
  recent_fixed: "I",
  coming_week: "II",
  high_prio_after: "III",
  unprioritized: "IV",
};

/**
 * Het editorial centerpiece van de Portal — een wekelijks rapport
 * dat aanvoelt als een doordacht document, niet als een dashboard.
 *
 * Lay-out leent van CAI Studio's eigen Notion-doc: kritische noot
 * vooraf met drop cap, genummerde secties met romeinse cijfers,
 * patterns als geserveerde bullets onderaan.
 */
export function ReportDetail() {
  const report = REPORTS[0]!;

  return (
    <article
      className="relative mx-auto max-w-[820px] rounded-lg border bg-[var(--paper-elevated)] overflow-hidden"
      style={{ borderColor: "var(--rule-hairline)" }}
    >
      {/* Masthead — feels like a publication header */}
      <header
        className="border-b px-10 py-12 md:px-14 md:py-14"
        style={{
          borderColor: "var(--rule-hairline)",
          backgroundColor: "var(--paper-cream)",
        }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink-muted)]">
            Wekelijks rapport · Project CAI Studio
          </p>
          <p className="font-mono num-tabular text-[10px] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            Week 17 · {report.compiledAt}
          </p>
        </div>

        <h2 className="font-display mt-7 text-[2.6rem] leading-[0.98] tracking-[-0.025em] text-[var(--ink)] md:text-[3.4rem]">
          Drie symptomen,
          <br />
          één patroon.
        </h2>

        {/* Byline */}
        <div
          className="mt-9 flex items-center gap-3 border-t pt-5"
          style={{ borderColor: "var(--rule-hairline)" }}
        >
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-full font-mono text-[10px] font-medium"
            style={{
              backgroundColor: "var(--accent-brand)",
              color: "var(--paper)",
            }}
          >
            {report.compiledByInitials}
          </span>
          <div className="text-[12px] text-[var(--ink-muted)]">
            <span className="text-[var(--ink-soft)]">{report.compiledByName}</span>
            <span aria-hidden className="mx-2 opacity-40">
              ·
            </span>
            <span className="font-mono num-tabular">{report.compiledAt}</span>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="px-10 py-14 md:px-16 md:py-16">
        {/* Critical note vooraf */}
        <section>
          <div className="flex items-baseline gap-4 pb-6">
            <span className="section-marker">Kritische noot</span>
            <span
              aria-hidden
              className="flex-1 h-px"
              style={{ backgroundColor: "var(--rule-hairline)" }}
            />
          </div>

          <div className="prose-editorial drop-cap">
            {ACTIVE_REPORT_NARRATIVE.split("\n\n").map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>
        </section>

        {/* Topic sections per bucket */}
        {(Object.keys(ACTIVE_REPORT_TOPICS) as Array<keyof typeof ACTIVE_REPORT_TOPICS>).map(
          (bucketKey) => {
            const topicIds = ACTIVE_REPORT_TOPICS[bucketKey];
            const topics = topicIds.map(getTopicById).filter(Boolean);

            return (
              <section key={bucketKey} className="mt-14">
                <div className="flex items-baseline gap-4 pb-5">
                  <span className="font-display text-[1.1rem] italic text-[var(--ink-faint)]">
                    {SECTION_NUMBERS[bucketKey]}.
                  </span>
                  <h3 className="font-display text-[1.6rem] tracking-tight text-[var(--ink)]">
                    {SECTION_TITLES[bucketKey]}
                  </h3>
                  <span className="font-mono num-tabular text-[11px] tabular-nums text-[var(--ink-faint)] ml-auto">
                    {topics.length.toString().padStart(2, "0")}
                  </span>
                </div>

                <div className="border-t pt-2" style={{ borderColor: "var(--rule-hairline)" }}>
                  {topics.map((t) => (
                    <div
                      key={t!.id}
                      className="flex flex-col gap-1 border-b py-4 last:border-b-0 md:flex-row md:items-baseline md:gap-6"
                      style={{ borderColor: "var(--rule-soft)" }}
                    >
                      <div className="md:w-[34%] shrink-0">
                        <h4 className="font-display text-[1.05rem] leading-tight tracking-tight text-[var(--ink)]">
                          {t!.title}
                        </h4>
                        <p className="mt-1 font-mono num-tabular text-[10.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                          {t!.linkedIssuesCount} onderwerpen
                          {t!.sprintLabel ? (
                            <>
                              <span aria-hidden className="mx-1.5 opacity-50">
                                ·
                              </span>
                              {t!.sprintLabel}
                            </>
                          ) : null}
                        </p>
                      </div>
                      <p className="md:flex-1 text-[14px] leading-[1.6] text-[var(--ink-soft)]">
                        {t!.clientDescription}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            );
          },
        )}

        {/* Patterns */}
        <section className="mt-16">
          <div className="flex items-baseline gap-4 pb-5">
            <span className="section-marker">Wat herhaalt zich</span>
            <span
              aria-hidden
              className="flex-1 h-px"
              style={{ backgroundColor: "var(--rule-hairline)" }}
            />
          </div>

          <ul
            className="grid gap-px overflow-hidden rounded-md border md:grid-cols-1"
            style={{
              borderColor: "var(--rule-hairline)",
              backgroundColor: "var(--rule-hairline)",
            }}
          >
            {ACTIVE_REPORT_PATTERNS.map((p, idx) => (
              <li key={idx} className="bg-[var(--paper-elevated)] px-6 py-5">
                <div className="flex items-baseline gap-3">
                  <span
                    className="font-mono num-tabular text-[10px] tabular-nums tracking-[0.12em] text-[var(--ink-faint)]"
                    aria-hidden
                  >
                    {(idx + 1).toString().padStart(2, "0")}
                  </span>
                  <h4 className="font-display text-[1.1rem] tracking-tight text-[var(--ink)]">
                    {p.title}
                  </h4>
                </div>
                <p className="mt-1.5 ml-6 max-w-[60ch] text-[13.5px] leading-[1.55] text-[var(--ink-soft)]">
                  {p.description}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Footer note */}
        <footer className="mt-16 border-t pt-6" style={{ borderColor: "var(--rule-hairline)" }}>
          <p className="font-mono num-tabular text-[10.5px] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            Bevroren op {report.compiledAt}
            <span aria-hidden className="mx-2 opacity-40">
              ·
            </span>
            Voor live status zie de <span className="text-[var(--accent-brand-deep)]">roadmap</span>
          </p>
        </footer>
      </div>
    </article>
  );
}
