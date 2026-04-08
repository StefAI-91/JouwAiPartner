import {
  ALL_STEPS,
  OTHER_STEPS,
  STATUS_LABELS as STEP_LABELS,
  getPhaseSteps,
} from "@/lib/constants/project";

interface StatusPipelineProps {
  status: string;
  size?: "sm" | "lg";
}

export function StatusPipeline({ status, size = "sm" }: StatusPipelineProps) {
  const currentIndex = ALL_STEPS.indexOf(status as (typeof ALL_STEPS)[number]);
  const phaseSteps = getPhaseSteps(status);

  // For "other" statuses, show as single badge
  if ((OTHER_STEPS as readonly string[]).includes(status)) {
    const colors: Record<string, string> = {
      on_hold: "bg-amber-100 text-amber-700",
      lost: "bg-red-100 text-red-700",
      maintenance: "bg-blue-100 text-blue-700",
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${
          size === "lg" ? "text-sm" : "text-xs"
        } ${colors[status] ?? "bg-muted text-muted-foreground"}`}
      >
        {STEP_LABELS[status] ?? status}
      </span>
    );
  }

  // For sales/delivery, show pipeline steps
  const isLarge = size === "lg";

  return (
    <div className="flex items-center gap-0.5" role="list" aria-label="Project status pipeline">
      {phaseSteps.map((step) => {
        const stepGlobalIndex = ALL_STEPS.indexOf(step as (typeof ALL_STEPS)[number]);
        const isCurrent = step === status;
        const isPast = stepGlobalIndex < currentIndex;

        let className = "rounded-full transition-colors ";

        if (isLarge) {
          className += "px-3 py-1 text-xs font-medium ";
        } else {
          className += "px-2 py-0.5 text-[10px] font-medium ";
        }

        if (isCurrent) {
          className += "bg-[#006B3F] text-white";
        } else if (isPast) {
          className += "bg-[#006B3F]/15 text-[#006B3F]";
        } else {
          className += "bg-muted text-muted-foreground/50";
        }

        return (
          <span
            key={step}
            className={className}
            role="listitem"
            aria-current={isCurrent ? "step" : undefined}
          >
            {isLarge ? STEP_LABELS[step] : STEP_LABELS[step]}
          </span>
        );
      })}
    </div>
  );
}
