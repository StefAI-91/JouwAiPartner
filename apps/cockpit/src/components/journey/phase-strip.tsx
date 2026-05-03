import { phases, colorClasses } from "@/app/(dashboard)/journey/_data/phases";

export function PhaseStrip() {
  return (
    <div className="overflow-x-auto pb-2">
      <ol className="flex min-w-max items-stretch gap-2">
        {phases.map((phase, i) => {
          const colors = colorClasses[phase.color];
          const Icon = phase.icon;
          return (
            <li key={phase.id} className="flex items-stretch">
              <a
                href={`#phase-${phase.id}`}
                className={`flex w-44 flex-col rounded-xl border ${colors.border} ${colors.bgSoft} px-3 py-3 transition-all hover:scale-[1.02] hover:shadow-sm`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${colors.bg} text-xs font-bold text-white`}
                  >
                    {phase.number}
                  </div>
                  <Icon className={`h-4 w-4 ${colors.text}`} />
                </div>
                <div className={`mt-2 text-sm font-semibold ${colors.text}`}>{phase.name}</div>
                <div className="mt-1 text-[11px] leading-tight text-muted-foreground">
                  {phase.pmRole}
                </div>
              </a>
              {i < phases.length - 1 && (
                <div className="flex items-center px-1 text-muted-foreground/50">→</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
