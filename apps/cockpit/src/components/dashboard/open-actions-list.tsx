import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OpenActionItem } from "@repo/database/queries/action-items";

interface OpenActionsListProps {
  items: OpenActionItem[];
}

function formatDueDate(dueDateStr: string | null): string {
  if (!dueDateStr) return "";
  return new Date(dueDateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

function isOverdue(dueDateStr: string | null): boolean {
  if (!dueDateStr) return false;
  return new Date(dueDateStr) < new Date(new Date().toDateString());
}

export function OpenActionsList({ items }: OpenActionsListProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border/50">
        <CardTitle>Open action items</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No open action items.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {items.map((item) => {
              const overdue = isOverdue(item.due_date);
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
                        variant={overdue ? "destructive" : "secondary"}
                        className="h-4 text-[10px]"
                      >
                        {overdue ? "Overdue · " : ""}
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
