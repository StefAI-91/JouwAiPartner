const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  decision: { label: "decisions", color: "bg-blue-500" },
  action_item: { label: "action items", color: "bg-green-500" },
  need: { label: "needs", color: "bg-purple-500" },
  insight: { label: "insights", color: "bg-gray-400" },
};

interface ExtractionDotsProps {
  extractions: { type: string }[];
}

export function ExtractionDots({ extractions }: ExtractionDotsProps) {
  const counts = new Map<string, number>();
  for (const e of extractions) {
    counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
  }

  if (counts.size === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      {Array.from(counts.entries()).map(([type, count]) => {
        const config = TYPE_CONFIG[type];
        if (!config) return null;
        return (
          <span key={type} className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${config.color}`} />
            {count} {config.label}
          </span>
        );
      })}
    </div>
  );
}
