import { cn } from "@/lib/utils";

const COMPONENT_LABELS: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  api: "API",
  database: "Database",
  prompt_ai: "AI / Prompt",
  unknown: "Unknown",
};

export function ComponentBadge({
  component,
  className,
}: {
  component: string | null;
  className?: string;
}) {
  if (!component) return null;
  const label = COMPONENT_LABELS[component] ?? component;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[0.7rem] font-medium leading-none text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}
