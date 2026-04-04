import { Circle, Check, ChevronRight } from "lucide-react";

interface ActionItem {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  meeting: { id: string; title: string | null } | null;
  task?: {
    status: "active" | "done" | "dismissed";
    assigned_to: string | null;
    due_date: string | null;
  } | null;
}

interface ActionItemsListProps {
  items: ActionItem[];
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

function daysOverdue(dateStr: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  const diff = Math.ceil((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function getItemStatus(item: ActionItem): "overdue" | "open" | "done" | "dismissed" {
  if (item.task) {
    if (item.task.status === "done") return "done";
    if (item.task.status === "dismissed") return "dismissed";
    const dueDate = item.task.due_date;
    if (dueDate && daysOverdue(dueDate) > 0) return "overdue";
    return "open";
  }
  const dueDate = item.metadata.due_date ? String(item.metadata.due_date) : null;
  if (dueDate && daysOverdue(dueDate) > 0) return "overdue";
  return "open";
}

function getAssignee(item: ActionItem): string | null {
  if (item.task?.assigned_to) return item.task.assigned_to;
  return item.metadata.assignee ? String(item.metadata.assignee) : null;
}

function getDueDate(item: ActionItem): string | null {
  if (item.task?.due_date) return item.task.due_date;
  return item.metadata.due_date ? String(item.metadata.due_date) : null;
}

export function ActionItemsList({ items }: ActionItemsListProps) {
  if (items.length === 0) {
    return (
      <section className="mb-6 rounded-lg border border-border/30 px-5 py-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
          Actiepunten
        </h3>
        <p className="mt-3 text-sm text-muted-foreground/60">Geen actiepunten gevonden</p>
      </section>
    );
  }

  const openItems = items.filter((i) => {
    const s = getItemStatus(i);
    return s === "open" || s === "overdue";
  });
  const doneItems = items.filter((i) => {
    const s = getItemStatus(i);
    return s === "done" || s === "dismissed";
  });
  const overdueCount = items.filter((i) => getItemStatus(i) === "overdue").length;

  return (
    <section className="mb-6 rounded-lg border border-border/30 px-5 py-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
          Actiepunten
        </h3>
        <div className="flex gap-3 text-xs text-muted-foreground/65 tabular-nums">
          {overdueCount > 0 && (
            <span className="text-foreground/60">{overdueCount} overdue</span>
          )}
          <span>{openItems.length} open</span>
          <span>{doneItems.length} af</span>
        </div>
      </div>

      <div className="space-y-2">
        {openItems.map((item) => {
          const status = getItemStatus(item);
          const assignee = getAssignee(item);
          const dueDate = getDueDate(item);
          const source = item.meeting?.title ?? null;

          return (
            <div key={item.id} className="flex items-start gap-3 rounded-md bg-muted/30 px-3 py-3">
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
              <div className="flex-1 min-w-0">
                <p className="text-sm">{item.content}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/65">
                  {assignee && <span>{assignee}</span>}
                  {assignee && dueDate && <span>&middot;</span>}
                  {dueDate && (
                    status === "overdue" ? (
                      <span className="font-medium text-[#006B3F]">
                        {daysOverdue(dueDate)}d overdue
                      </span>
                    ) : (
                      <span>{formatDateShort(dueDate)}</span>
                    )
                  )}
                  {source && (
                    <>
                      <span>&middot;</span>
                      <span>{source}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {doneItems.length > 0 && (
        <details className="group mt-2">
          <summary className="flex cursor-pointer items-center gap-1 py-2 text-xs text-muted-foreground/55 hover:text-muted-foreground/60">
            <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
            {doneItems.length} afgerond
          </summary>
          <div className="mt-1 space-y-1">
            {doneItems.map((item) => {
              const assignee = getAssignee(item);
              const dueDate = getDueDate(item);
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-md px-3 py-2.5 opacity-40"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-through">{item.content}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {assignee && <span>{assignee}</span>}
                      {assignee && dueDate && <span>&middot;</span>}
                      {dueDate && <span>{formatDateShort(dueDate)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </section>
  );
}
