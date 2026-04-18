import Link from "next/link";
import { TrendingUp, Calendar } from "lucide-react";
import { formatDateShort, timeAgoDays } from "@repo/ui/format";
import { PanelCard, PanelEmpty } from "./panel-card";

interface PulsePanelProps {
  briefing: { content: string; created_at: string } | null;
  upcomingMeetings: { id: string; title: string | null; date: string }[];
}

export function PulsePanel({ briefing, upcomingMeetings }: PulsePanelProps) {
  return (
    <PanelCard
      title="Pulse & volgende gesprek"
      icon={TrendingUp}
      iconBgClassName="bg-primary/10"
      iconClassName="text-primary"
    >
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {briefing ? `Briefing — ${timeAgoDays(briefing.created_at)}` : "Briefing"}
        </p>
        {briefing ? (
          <p className="text-sm leading-relaxed text-foreground/85">{briefing.content}</p>
        ) : (
          <PanelEmpty>Nog geen briefing beschikbaar.</PanelEmpty>
        )}
      </div>

      <div className="border-t pt-3">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          <Calendar className="size-3" />
          Aankomende meetings
        </p>
        {upcomingMeetings.length === 0 ? (
          <PanelEmpty>Geen geplande meetings.</PanelEmpty>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {upcomingMeetings.map((m) => (
              <li key={m.id} className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">{formatDateShort(m.date)}</span>
                <Link
                  href={`/meetings/${m.id}`}
                  className="text-foreground/85 hover:text-foreground hover:underline"
                >
                  {m.title ?? "Meeting zonder titel"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PanelCard>
  );
}
