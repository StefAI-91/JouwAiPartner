import { User, Users, CalendarDays, Clock } from "lucide-react";
import { StatusPipeline } from "./status-pipeline";

interface ProjectHeaderProps {
  name: string;
  organizationName: string | null;
  status: string;
  ownerName: string | null;
  contactPersonName: string | null;
  startDate: string | null;
  deadline: string | null;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(dateStr: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function ProjectHeader({
  name,
  organizationName,
  status,
  ownerName,
  contactPersonName,
  startDate,
  deadline,
}: ProjectHeaderProps) {
  const daysLeft = deadline ? daysUntil(deadline) : null;

  return (
    <div className="mb-10">
      {organizationName && (
        <p className="text-xs font-medium tracking-wide text-muted-foreground/60 uppercase">
          {organizationName}
        </p>
      )}

      <h1 className="mt-1 text-[#006B3F]">{name}</h1>

      <div className="mt-3">
        <StatusPipeline status={status} size="lg" />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-muted-foreground">
        {ownerName && (
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {ownerName}
          </span>
        )}
        {contactPersonName && (
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {contactPersonName}
          </span>
        )}
        {startDate && deadline && (
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(startDate)} — {formatDate(deadline)}
          </span>
        )}
        {!startDate && deadline && (
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Deadline: {formatDate(deadline)}
          </span>
        )}
        {daysLeft !== null && (
          <span
            className={`flex items-center gap-1.5 ${daysLeft < 14 ? "text-foreground/70" : ""}`}
          >
            <Clock className="h-3.5 w-3.5" />
            {daysLeft > 0 ? `${daysLeft}d tot deadline` : "Deadline verstreken"}
          </span>
        )}
      </div>
    </div>
  );
}
