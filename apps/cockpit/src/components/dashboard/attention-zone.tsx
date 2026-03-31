import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface AttentionZoneProps {
  reviewCount: number;
}

function getUrgency(count: number) {
  if (count === 0) return { level: "green", label: "All caught up", icon: CheckCircle2 } as const;
  if (count <= 5)
    return {
      level: "amber",
      label: `${count} meeting${count !== 1 ? "s" : ""} awaiting review`,
      icon: Clock,
    } as const;
  return {
    level: "red",
    label: `${count} meetings awaiting review`,
    icon: AlertTriangle,
  } as const;
}

const URGENCY_STYLES = {
  green: "bg-emerald-50 border-emerald-200 text-emerald-800",
  amber: "bg-amber-50 border-amber-200 text-amber-800",
  red: "bg-red-50 border-red-200 text-red-800",
} as const;

const ICON_STYLES = {
  green: "text-emerald-600",
  amber: "text-amber-600",
  red: "text-red-600",
} as const;

export function AttentionZone({ reviewCount }: AttentionZoneProps) {
  const { level, label, icon: Icon } = getUrgency(reviewCount);

  return (
    <Link href="/review" className="block">
      <div
        className={`flex items-center gap-4 rounded-2xl border p-5 transition-shadow hover:shadow-md ${URGENCY_STYLES[level]}`}
      >
        <Icon className={`h-6 w-6 shrink-0 ${ICON_STYLES[level]}`} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">{label}</p>
          {reviewCount > 0 && <p className="mt-0.5 text-sm opacity-80">Click to start reviewing</p>}
        </div>
        {reviewCount > 0 && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60 text-lg font-bold">
            {reviewCount}
          </span>
        )}
      </div>
    </Link>
  );
}
