import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  bug: { label: "Bug", className: "bg-red-50 text-red-700 border-red-200" },
  feature_request: {
    label: "Feature",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  question: { label: "Question", className: "bg-blue-50 text-blue-700 border-blue-200" },
};

export function TypeBadge({ type, className }: { type: string; className?: string }) {
  const config = TYPE_CONFIG[type] ?? {
    label: type,
    className: "bg-muted text-muted-foreground border-border",
  };
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
