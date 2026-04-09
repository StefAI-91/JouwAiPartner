import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  triage: { label: "Triage", className: "bg-orange-100 text-orange-700 border-orange-200" },
  backlog: { label: "Backlog", className: "bg-muted text-muted-foreground border-border" },
  todo: { label: "Todo", className: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "In Progress", className: "bg-amber-50 text-amber-700 border-amber-200" },
  done: { label: "Done", className: "bg-green-50 text-green-700 border-green-200" },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-500 border-red-200 line-through",
  },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.backlog;
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
