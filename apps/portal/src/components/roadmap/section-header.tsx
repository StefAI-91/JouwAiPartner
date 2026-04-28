interface SectionHeaderProps {
  label: string;
  count: number;
  blurb: string;
  inkColor: string;
  ruleColor: string;
}

export function SectionHeader({ label, count, blurb, inkColor, ruleColor }: SectionHeaderProps) {
  const padded = String(count).padStart(2, "0");
  return (
    <header className="pb-3" style={{ borderBottom: `1px solid ${ruleColor}` }}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[1.05rem] tracking-tight" style={{ color: inkColor }}>
          {label}
        </h2>
        <span
          className="font-mono num-tabular text-[12px] tabular-nums"
          style={{ color: inkColor, opacity: 0.7 }}
        >
          {padded}
        </span>
      </div>
      <p className="mt-1 text-[12px] leading-snug" style={{ color: inkColor, opacity: 0.7 }}>
        {blurb}
      </p>
    </header>
  );
}
