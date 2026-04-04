"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TaskItem, getUrgency } from "./task-item";
import { CircleCheck, AlertTriangle, Clock, Users } from "lucide-react";
import type { TaskRow } from "@repo/database/queries/tasks";
import type { PersonForAssignment } from "@repo/database/queries/people";

type PersonFilter = string | null; // person id or null for "all"
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

  // Counts for urgency badges
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

  const doneCount = useMemo(() => tasks.filter((t) => t.status === "done").length, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Status filter
      if (!showDone && task.status === "done") return false;
      if (showDone && task.status !== "done") return false;

      // Person filter
      if (personFilter && task.assigned_to !== personFilter) return false;

      // Urgency filter (only for active tasks)
      if (urgencyFilter !== "all" && task.status === "active") {
        if (urgencyFilter === "no-deadline" && task.due_date) return false;
        if (urgencyFilter === "overdue" && getUrgency(task.due_date) !== "overdue") return false;
        if (urgencyFilter === "this-week" && getUrgency(task.due_date) !== "this-week") return false;
      }

      return true;
    });
  }, [tasks, personFilter, urgencyFilter, showDone]);

  const activeFilters = (personFilter ? 1 : 0) + (urgencyFilter !== "all" ? 1 : 0);

  function clearFilters() {
    setPersonFilter(null);
    setUrgencyFilter("all");
  }

  return (
    <Card>
      <CardHeader className="border-b border-border/50">
        <CardTitle>Taken</CardTitle>
        <CardDescription>Actiepunten uit meetings</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Filter pills */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {/* Person filter */}
          {assignedPeople.length > 0 && (
            <div className="relative">
              <select
                value={personFilter ?? ""}
                onChange={(e) => setPersonFilter(e.target.value || null)}
                className={`h-7 appearance-none rounded-full border pl-7 pr-3 text-[11px] font-medium outline-none transition-colors ${
                  personFilter
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <option value="">Iedereen</option>
                {assignedPeople.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
              <Users className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            </div>
          )}

          {/* Urgency pills */}
          {urgencyCounts.overdue > 0 && (
            <button
              type="button"
              onClick={() => setUrgencyFilter(urgencyFilter === "overdue" ? "all" : "overdue")}
              className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
                urgencyFilter === "overdue"
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <AlertTriangle className="size-3" />
              Verlopen
              <span className="ml-0.5 rounded-full bg-red-100 px-1.5 text-[10px] text-red-700">
                {urgencyCounts.overdue}
              </span>
            </button>
          )}

          {urgencyCounts["this-week"] > 0 && (
            <button
              type="button"
              onClick={() =>
                setUrgencyFilter(urgencyFilter === "this-week" ? "all" : "this-week")
              }
              className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
                urgencyFilter === "this-week"
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Clock className="size-3" />
              Deze week
              <span className="ml-0.5 rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-700">
                {urgencyCounts["this-week"]}
              </span>
            </button>
          )}

          {urgencyCounts["no-deadline"] > 0 && (
            <button
              type="button"
              onClick={() =>
                setUrgencyFilter(urgencyFilter === "no-deadline" ? "all" : "no-deadline")
              }
              className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
                urgencyFilter === "no-deadline"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              Geen deadline
              <span className="ml-0.5 rounded-full bg-muted px-1.5 text-[10px]">
                {urgencyCounts["no-deadline"]}
              </span>
            </button>
          )}

          {/* Divider + done toggle */}
          {doneCount > 0 && (
            <>
              <div className="mx-0.5 h-4 w-px bg-border" />
              <button
                type="button"
                onClick={() => setShowDone(!showDone)}
                className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
                  showDone
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <CircleCheck className="size-3" />
                Afgerond
                <span className="ml-0.5 rounded-full bg-green-100 px-1.5 text-[10px] text-green-700">
                  {doneCount}
                </span>
              </button>
            </>
          )}

          {/* Clear filters */}
          {activeFilters > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-7 rounded-full px-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Wis filters
            </button>
          )}
        </div>

        {/* Task list */}
        {filteredTasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {showDone
              ? "Geen afgeronde taken."
              : activeFilters > 0
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
