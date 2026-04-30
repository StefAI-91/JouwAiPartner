import { Flame } from "lucide-react";

export function WeeklyFocusItem({ item, index }: { item: string; index: number }) {
  const colonIdx = item.indexOf(":");
  const projectName = colonIdx > -1 ? item.slice(0, colonIdx) : null;
  const description = colonIdx > -1 ? item.slice(colonIdx + 1).trim() : item;
  const isUrgent = index === 0;

  return (
    <div
      className={`flex gap-3 rounded-xl border px-4 py-3.5 transition-all ${
        isUrgent ? "border-red-200/60 bg-red-50/40" : "border-border/50 bg-white"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
          isUrgent ? "bg-red-100 text-red-700" : "bg-[#006B3F]/8 text-[#006B3F]/70"
        }`}
      >
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        {projectName && (
          <span
            className={`text-xs font-semibold ${isUrgent ? "text-red-700" : "text-foreground/80"}`}
          >
            {projectName}
          </span>
        )}
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {isUrgent && <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />}
    </div>
  );
}
