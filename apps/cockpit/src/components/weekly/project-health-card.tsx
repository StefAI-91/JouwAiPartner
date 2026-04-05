import { AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";

interface ProjectHealth {
  project_id: string;
  project_name: string;
  status: "groen" | "oranje" | "rood";
  summary: string;
  risks: string[];
  recommendations: string[];
}

interface ProjectHealthCardProps {
  project: ProjectHealth;
}

const STATUS_CONFIG = {
  rood: {
    icon: AlertTriangle,
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
    iconColor: "text-red-500",
    label: "Risico",
  },
  oranje: {
    icon: AlertCircle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    iconColor: "text-amber-500",
    label: "Aandacht",
  },
  groen: {
    icon: CheckCircle2,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    iconColor: "text-emerald-500",
    label: "Op koers",
  },
};

export function ProjectHealthCard({ project }: ProjectHealthCardProps) {
  const config = STATUS_CONFIG[project.status];
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.iconColor}`} />
          <h3 className="text-sm font-semibold text-foreground">{project.project_name}</h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.badge}`}
        >
          {config.label}
        </span>
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-foreground/75">{project.summary}</p>

      {project.risks.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-1">
            Risico&apos;s
          </p>
          <ul className="space-y-0.5">
            {project.risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                <span className="text-xs text-foreground/65">{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {project.recommendations.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-1">
            Aanbevelingen
          </p>
          <ul className="space-y-0.5">
            {project.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#006B3F]/40" />
                <span className="text-xs text-foreground/65">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
