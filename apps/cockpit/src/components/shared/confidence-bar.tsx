function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "bg-green-500";
  if (confidence >= 0.5) return "bg-amber-500";
  return "bg-red-500";
}

export function ConfidenceBar({ confidence }: { confidence: number | null }) {
  if (confidence === null) return null;
  const percent = Math.round(confidence * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="h-1 flex-1 rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${getConfidenceColor(confidence)}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground">{percent}%</span>
    </div>
  );
}
