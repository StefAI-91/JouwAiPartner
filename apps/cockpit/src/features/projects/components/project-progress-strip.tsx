import { Clock } from "lucide-react";
import { formatDateShort } from "@repo/ui/format";
import { formatProjectProgress, type ProjectProgress } from "../utils/format-project-progress";

interface ProjectProgressStripProps {
  startDate: string | null;
  deadline: string | null;
}

function daysLabel(progress: ProjectProgress): string {
  if (progress.status === "overdue") {
    return `${Math.abs(progress.daysRemaining)} dagen over deadline`;
  }
  if (progress.status === "before") {
    return "Nog niet gestart";
  }
  return `${progress.daysRemaining} dagen tot deadline`;
}

export function ProjectProgressStrip({ startDate, deadline }: ProjectProgressStripProps) {
  const progress = formatProjectProgress(startDate, deadline);
  if (!progress) return null;

  return (
    <div className="border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-[#006B3F]/[0.03] to-transparent">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-[#006B3F]/60" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
            Voortgang
          </span>
          <span className="text-[10px] text-muted-foreground">· {progress.percent}%</span>
        </div>
        <span className="text-xs text-muted-foreground">
          <strong className="text-foreground/80">{daysLabel(progress)}</strong>
        </span>
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${progress.percent}%`,
            background: "linear-gradient(90deg, #006B3F, #4ade80)",
          }}
        />
        {progress.status === "in_progress" && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white border-2 shadow"
            style={{ left: `calc(${progress.percent}% - 6px)`, borderColor: "#006B3F" }}
          />
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>Kickoff · {formatDateShort(startDate)}</span>
        <span className="font-semibold text-[#006B3F]">Vandaag</span>
        <span>Deadline · {formatDateShort(deadline)}</span>
      </div>
    </div>
  );
}
