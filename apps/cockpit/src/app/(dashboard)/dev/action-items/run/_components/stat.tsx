export function Stat({
  label,
  value,
  hint,
  variant = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  variant?: "default" | "ok" | "warn";
}) {
  const valueClass =
    variant === "ok"
      ? "text-emerald-700"
      : variant === "warn"
        ? "text-amber-700"
        : "text-foreground";
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`font-mono text-sm ${valueClass}`}>{value}</dd>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
