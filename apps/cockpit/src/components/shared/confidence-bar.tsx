import { AlertTriangle } from "lucide-react";

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "bg-green-500";
  if (confidence >= 0.5) return "bg-amber-500";
  return "bg-red-500";
}

function getConfidenceTextColor(confidence: number): string {
  if (confidence >= 0.8) return "text-muted-foreground";
  if (confidence >= 0.5) return "text-amber-600";
  return "text-red-600";
}

export function ConfidenceBar({ confidence }: { confidence: number | null }) {
  if (confidence === null) return null;
  const percent = Math.round(confidence * 100);
  const isLow = confidence < 0.5;

  return (
    <div className="flex items-center gap-2">
      {isLow && <AlertTriangle className="size-3 text-red-500 shrink-0" />}
      <div className={`h-1.5 flex-1 rounded-full bg-gray-100 ${isLow ? "h-2" : ""}`}>
        <div
          className={`h-full rounded-full transition-all ${getConfidenceColor(confidence)}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span
        className={`text-[10px] tabular-nums font-medium ${getConfidenceTextColor(confidence)}`}
      >
        {percent}%
      </span>
    </div>
  );
}
