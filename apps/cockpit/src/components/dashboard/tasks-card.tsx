"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskItem, getUrgency } from "./task-item";
import { CircleCheck, AlertTriangle, Clock, X } from "lucide-react";
import type { TaskRow } from "@repo/database/queries/tasks";
import type { PersonForAssignment } from "@repo/database/queries/people";

type PersonFilter = string | null;
type UrgencyFilter = "all" | "overdue" | "this-week" | "no-deadline";

interface TasksCardProps {
  tasks: TaskRow[];
  people: PersonForAssignment[];
}

export function TasksCard({ tasks, people }: TasksCardProps) {
  const [personFilter, setPersonFilter] = useState<PersonFilter>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("all");
  const [showDone, setShowDone] = useState(false);

  const teammates = people.filter((p) => p.team);
  const clients = people.filter((p) => !p.team);

  // People who actually have tasks assigned
  const assignedPeople = useMemo(() => {
    const map = new Map<string, string>();
    for (const task of tasks) {
      if (task.assigned_person) {
        map.set(task.assigned_person.id, task.assigned_person.name);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tasks]);

  // Counts
  const urgencyCounts = useMemo(() => {
    const counts = { overdue: 0, "this-week": 0, "no-deadline": 0 };
    for (const task of tasks) {
      if (task.status !== "active") continue;
      if (!task.due_date) {
        counts["no-deadline"]++;
      } else {
        const u = getUrgency(task.due_date);
        if (u === "overdue") counts.overdue++;
        else if (u === "this-week") counts["this-week"]++;
      }
    }
    return counts;
  }, [tasks]);

  const activeCount = useMemo(() => tasks.filter((t) => t.status === "active").length, [tasks]);
  const doneCount = useMemo(() => tasks.filter((t) => t.status === "done").length, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!showDone && task.status === "done") return false;
      if (showDone && task.status !== "done") return false;
      if (personFilter && task.assigned_to !== personFilter) return false;
      if (urgencyFilter !== "all" && task.status === "active") {
        if (urgencyFilter === "no-deadline" && task.due_date) return false;
        if (urgencyFilter === "overdue" && getUrgency(task.due_date) !== "overdue") return false;
        if (urgencyFilter === "this-week" && getUrgency(task.due_date) !== "this-week") return false;
      }
      return true;
    });
  }, [tasks, personFilter, urgencyFilter, showDone]);

  const hasActiveFilter = personFilter !== null || urgencyFilter !== "all";

  function clearFilters() {
    setPersonFilter(null);
    setUrgencyFilter("all");
  }

  // First name only for pills
  function firstName(fullName: string) {
    return fullName.split(" ")[0];
  }

  return (
    <Card>
      <CardHeader className="border-b border-border/50">
        <div className="flex items-baseline justify-between">
          <CardTitle>Taken</CardTitle>
          <span className="text-xs text-muted-foreground">
            {activeCount} actief{doneCount > 0 ? ` · ${doneCount} afgerond` : ""}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {/* Filter bar — horizontal scroll, no wrap */}
        <div className="-mx-4 mb-2 flex items-center gap-1 overflow-x-auto px-4 pb-1 scrollbar-none">
          {/* Person pills — one per person */}
          {assignedPeople.length > 1 && (
            <>
              {assignedPeople.map(([id, name]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPersonFilter(personFilter === id ? null : id)}
                  className={`flex h-6 shrink-0 items-center rounded-full px-2 text-[11px] font-medium transition-colors ${
                    personFilter === id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {firstName(name)}
                </button>
              ))}
              <div className="mx-0.5 h-3.5 w-px shrink-0 bg-border" />
            </>
          )}

          {/* Urgency pills — only show if count > 0 */}
          {urgencyCounts.overdue > 0 && (
            <button
              type="button"
              onClick={() => setUrgencyFilter(urgencyFilter === "overdue" ? "all" : "overdue")}
              className={`flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium transition-colors ${
                urgencyFilter === "overdue"
                  ? "bg-red-600 text-white"
                  : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              <AlertTriangle className="size-2.5" />
              {urgencyCounts.overdue}
            </button>
          )}

          {urgencyCounts["this-week"] > 0 && (
            <button
              type="button"
              onClick={() =>
                setUrgencyFilter(urgencyFilter === "this-week" ? "all" : "this-week")
              }
              className={`flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium transition-colors ${
                urgencyFilter === "this-week"
                  ? "bg-amber-500 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              <Clock className="size-2.5" />
              {urgencyCounts["this-week"]}
            </button>
          )}

          {urgencyCounts["no-deadline"] > 0 && (
            <button
              type="button"
              onClick={() =>
                setUrgencyFilter(urgencyFilter === "no-deadline" ? "all" : "no-deadline")
              }
              className={`flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium transition-colors ${
                urgencyFilter === "no-deadline"
                  ? "bg-muted-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              Open
              <span className="text-[10px]">{urgencyCounts["no-deadline"]}</span>
            </button>
          )}

          {/* Done toggle */}
          {doneCount > 0 && (
            <button
              type="button"
              onClick={() => setShowDone(!showDone)}
              className={`flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium transition-colors ${
                showDone
                  ? "bg-green-600 text-white"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              <CircleCheck className="size-2.5" />
              {doneCount}
            </button>
          )}

          {/* Clear */}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex h-6 shrink-0 items-center rounded-full px-1.5 text-muted-foreground transition-colors hover:text-foreground"
              title="Wis filters"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Task list */}
        {filteredTasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {showDone
              ? "Geen afgeronde taken."
              : hasActiveFilter
                ? "Geen taken voor dit filter."
                : "Geen actieve taken. Promoveer actiepunten vanuit een meeting."}
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {filteredTasks.map((task) => (
              <TaskItem key={task.id} task={task} teammates={teammates} clients={clients} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
