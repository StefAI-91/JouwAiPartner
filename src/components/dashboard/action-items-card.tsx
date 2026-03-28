import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OpenActionItem } from "@/lib/queries/action-items";

interface ActionItemsCardProps {
  items: OpenActionItem[];
}

type Urgency = "overdue" | "this-week" | "default";

function getUrgency(dueDateStr: string | null): Urgency {
  if (!dueDateStr) return "default";
  const due = new Date(dueDateStr);
  const now = new Date();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = (dueMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "this-week";
  return "default";
}

function formatDueDate(dueDateStr: string | null): string {
  if (!dueDateStr) return "";
  return new Date(dueDateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

const URGENCY_CLASSES: Record<Urgency, string> = {
  overdue: "text-destructive",
  "this-week": "text-warning",
  default: "text-muted-foreground",
};

const URGENCY_BADGE_VARIANTS: Record<Urgency, "destructive" | "secondary" | "outline"> = {
  overdue: "destructive",
  "this-week": "secondary",
  default: "outline",
};

export function ActionItemsCard({ items }: ActionItemsCardProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border/50">
        <CardTitle>Open actiepunten</CardTitle>
        <CardDescription>Taken met status &apos;open&apos;</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Geen openstaande actiepunten.
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {items.map((item) => {
              const urgency = getUrgency(item.due_date);
              return (
                <li key={item.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                  <p className="text-sm leading-snug">{item.description}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    {item.assignee && (
                      <span className="text-xs text-muted-foreground">{item.assignee}</span>
                    )}
                    {item.scope && (
                      <Badge variant="outline" className="h-4 text-[10px]">
                        {item.scope}
                      </Badge>
                    )}
                    {item.due_date && (
                      <Badge
                        variant={URGENCY_BADGE_VARIANTS[urgency]}
                        className={`h-4 text-[10px] ${URGENCY_CLASSES[urgency]}`}
                      >
                        {urgency === "overdue" ? "Verlopen · " : ""}
                        {formatDueDate(item.due_date)}
                      </Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
