import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RecentDecision } from "@/lib/queries/decisions";
import { DASHBOARD } from "@/lib/config/dashboard";

interface DecisionsCardProps {
  decisions: RecentDecision[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(DASHBOARD.locale, {
    day: "numeric",
    month: "short",
  });
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  archived: "secondary",
  superseded: "outline",
};

export function DecisionsCard({ decisions }: DecisionsCardProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border/50">
        <CardTitle>Recente besluiten</CardTitle>
        <CardDescription>Laatste besluiten uit meetings</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {decisions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nog geen besluiten opgeslagen.
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {decisions.map((d) => (
              <li key={d.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-snug">{truncate(d.decision, DASHBOARD.truncate.decision)}</p>
                  {d.status && (
                    <Badge
                      variant={STATUS_VARIANTS[d.status] ?? "outline"}
                      className="mt-0.5 shrink-0"
                    >
                      {d.status}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {d.made_by && <span>{d.made_by}</span>}
                  {d.meeting_title && (
                    <span className="italic">{truncate(d.meeting_title, DASHBOARD.truncate.meetingTitle)}</span>
                  )}
                  {d.date && <span>{formatDate(d.date)}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
