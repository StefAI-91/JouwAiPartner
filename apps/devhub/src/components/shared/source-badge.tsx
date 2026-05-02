import { cn } from "@repo/ui/utils";
import {
  resolveDevhubSourceGroup,
  type DevhubSourceGroupKey,
} from "@repo/database/constants/issues";

const SOURCE_CONFIG: Record<DevhubSourceGroupKey, { label: string; className: string }> = {
  client_pm: { label: "Klant-PM", className: "bg-violet-50 text-violet-700 border-violet-200" },
  end_user: {
    label: "Eindgebruiker",
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
};

export function SourceBadge({ source, className }: { source: string | null; className?: string }) {
  const group = resolveDevhubSourceGroup(source);
  if (!group) return null;
  const config = SOURCE_CONFIG[group];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[0.7rem] font-medium leading-none",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
