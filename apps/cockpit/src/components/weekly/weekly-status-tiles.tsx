import type { ProjectHealth } from "./weekly-summary-types";

interface StatusTileProps {
  count: number;
  label: string;
  projects: ProjectHealth[];
  countColor: string;
  border: string;
  bg: string;
  badgeBg: string;
  badgeText: string;
}

function StatusTile({
  count,
  label,
  projects,
  countColor,
  border,
  bg,
  badgeBg,
  badgeText,
}: StatusTileProps) {
  return (
    <div className={`flex flex-col items-center rounded-xl border ${border} ${bg} py-3`}>
      <span className={`font-heading text-2xl font-bold ${countColor}`}>{count}</span>
      <span className={`mt-0.5 text-[11px] font-medium ${countColor}/70`}>{label}</span>
      <div className="mt-1.5 flex flex-wrap justify-center gap-1">
        {projects.map((p) => (
          <span
            key={p.project_id}
            className={`rounded-full ${badgeBg} px-1.5 py-px text-[9px] font-medium ${badgeText}`}
          >
            {p.project_name}
          </span>
        ))}
      </div>
    </div>
  );
}

interface WeeklyStatusTilesProps {
  red: ProjectHealth[];
  orange: ProjectHealth[];
  green: ProjectHealth[];
}

export function WeeklyStatusTiles({ red, orange, green }: WeeklyStatusTilesProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <StatusTile
        count={red.length}
        label="Risico"
        projects={red}
        countColor="text-red-600"
        border="border-red-200/50"
        bg="bg-red-50/50"
        badgeBg="bg-red-100"
        badgeText="text-red-700"
      />
      <StatusTile
        count={orange.length}
        label="Aandacht"
        projects={orange}
        countColor="text-amber-600"
        border="border-amber-200/50"
        bg="bg-amber-50/50"
        badgeBg="bg-amber-100"
        badgeText="text-amber-700"
      />
      <StatusTile
        count={green.length}
        label="Op koers"
        projects={green}
        countColor="text-emerald-600"
        border="border-emerald-200/50"
        bg="bg-emerald-50/50"
        badgeBg="bg-emerald-100"
        badgeText="text-emerald-700"
      />
    </div>
  );
}
