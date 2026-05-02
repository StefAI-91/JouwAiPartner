import { resolvePortalSourceGroup } from "@repo/database/constants/issues";

/**
 * Subtle bron-indicator op de inbox-rij. Gebruikt de centrale
 * `resolvePortalSourceGroup` zodat een rebrand van bron-groepen op één
 * plek leeft. CC-003 brengt rijkere DevHub-source-badges; CC-001 gebruikt
 * deze minimale variant.
 */
export function SourceDot({ source }: { source: string | null | undefined }) {
  const group = resolvePortalSourceGroup(source);
  if (group === "jaip") return null;

  const isClientPm = group === "client_pm";
  const cls = isClientPm ? "bg-[oklch(0.55_0.12_280)]" : "bg-warning/80";
  const label = isClientPm ? "Klant-PM" : "Eindgebr.";
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground/70"
      title={isClientPm ? "Klant-PM" : "Eindgebruiker"}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cls}`} aria-hidden />
      <span className="hidden xl:inline">{label}</span>
    </span>
  );
}
