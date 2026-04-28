type SectionHeaderProps = {
  marker: string;
  title: string;
  fase: string | null;
  description?: string;
  id: string;
};

/**
 * Editorial section heading with § marker, fase-tag, and a generous
 * underrule. Used as anchor target for the sticky TOC.
 */
export function SectionHeader({ marker, title, fase, description, id }: SectionHeaderProps) {
  return (
    <header id={id} className="scroll-mt-24 pb-8">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 pb-3">
        <span className="section-marker">{marker}</span>
        {fase ? (
          <span
            className="font-mono text-[10px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-sm"
            style={{
              color: "var(--accent-brand-deep)",
              backgroundColor: "var(--accent-brand-soft)",
            }}
          >
            {fase}
          </span>
        ) : null}
      </div>
      <h2 className="font-display text-[2.4rem] leading-[1.05] tracking-tight text-[var(--ink)] md:text-[3rem]">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-[var(--ink-muted)]">
          {description}
        </p>
      ) : null}
      <div
        aria-hidden
        className="mt-6 h-px w-full"
        style={{ backgroundColor: "var(--rule-hairline)" }}
      />
    </header>
  );
}
