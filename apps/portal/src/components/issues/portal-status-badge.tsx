import { cn } from "@repo/ui/utils";
import { STATUS_COLORS, getPortalStatusKey, translateStatus } from "@/lib/issue-status";

interface PortalStatusBadgeProps {
  /** Interne DevHub issue-status (bv. "triage", "in_progress"). */
  status: string;
  className?: string;
}

/**
 * Eén bron voor status-weergave in het portaal: vertaalt de interne status
 * naar het klantlabel en kiest de bijbehorende kleur. Gebruik dit component
 * overal waar een issue-status wordt getoond — niet de status-lookup
 * dupliceren.
 */
export function PortalStatusBadge({ status, className }: PortalStatusBadgeProps) {
  const label = translateStatus(status);
  const key = getPortalStatusKey(status);
  const colorClass = key ? STATUS_COLORS[key] : "bg-muted text-muted-foreground";

  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-xs", colorClass, className)}>
      {label}
    </span>
  );
}
