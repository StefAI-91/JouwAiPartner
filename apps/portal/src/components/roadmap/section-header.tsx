interface SectionHeaderProps {
  label: string;
  count: number;
  blurb: string;
}

export function SectionHeader({ label, count, blurb }: SectionHeaderProps) {
  const padded = String(count).padStart(2, "0");
  return (
    <header className="border-b border-border pb-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{label}</h2>
        <span className="text-xs tabular-nums text-muted-foreground">{padded}</span>
      </div>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">{blurb}</p>
    </header>
  );
}
