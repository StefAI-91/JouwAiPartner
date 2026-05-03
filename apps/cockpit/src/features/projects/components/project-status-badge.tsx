import { OTHER_STEPS, STATUS_LABELS, getPhaseSteps } from "@repo/database/constants/projects";

interface ProjectStatusBadgeProps {
  status: string;
}

const OTHER_COLORS: Record<string, string> = {
  on_hold: "bg-amber-100 text-amber-700",
  lost: "bg-red-100 text-red-700",
  maintenance: "bg-blue-100 text-blue-700",
};

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const label = STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status;

  if ((OTHER_STEPS as readonly string[]).includes(status)) {
    const color = OTHER_COLORS[status] ?? "bg-muted text-muted-foreground";
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
      >
        {label}
      </span>
    );
  }

  const phaseSteps: readonly string[] = getPhaseSteps(status);
  const currentIndex = phaseSteps.indexOf(status);
  const stepNumber = currentIndex >= 0 ? currentIndex + 1 : null;
  const total = phaseSteps.length;
  const percent = stepNumber !== null ? (stepNumber / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-full bg-[#006B3F] px-2.5 py-0.5 text-xs font-medium text-white">
          {label}
        </span>
        {stepNumber !== null && (
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
            {stepNumber}/{total}
          </span>
        )}
      </div>
      {stepNumber !== null && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#006B3F] transition-all"
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-valuenow={stepNumber}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-label={`Stap ${stepNumber} van ${total}: ${label}`}
          />
        </div>
      )}
    </div>
  );
}
