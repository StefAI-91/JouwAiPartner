"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskItem } from "./task-item";
import { getUrgency } from "@/lib/urgency";
import type { TaskRow } from "@repo/database/queries/tasks";
import type { PersonForAssignment } from "@repo/database/queries/people";

interface TasksCardProps {
  tasks: TaskRow[];
  people: PersonForAssignment[];
}

interface PersonGroup {
  id: string | null;
  name: string;
  tasks: TaskRow[];
}

export function TasksCard({ tasks, people }: TasksCardProps) {
  const [showDone, setShowDone] = useState(false);

  const teammates = people.filter((p) => p.team);
  const clients = people.filter((p) => !p.team);

  const activeCount = useMemo(() => tasks.filter((t) => t.status === "active").length, [tasks]);
  const doneCount = useMemo(() => tasks.filter((t) => t.status === "done").length, [tasks]);

  const overdueCount = useMemo(() => {
    return tasks.filter(
      (t) => t.status === "active" && t.due_date && getUrgency(t.due_date) === "overdue",
    ).length;
  }, [tasks]);

  // Group active tasks by person: teammates first, then "Klanten", then unassigned
  const personGroups = useMemo(() => {
    const activeTasks = tasks.filter((t) => t.status === "active");
    const groups = new Map<string, TaskRow[]>();

    for (const task of activeTasks) {
      const key = task.assigned_to ?? "__unassigned__";
      const existing = groups.get(key) ?? [];
      existing.push(task);
      groups.set(key, existing);
    }

    const result: PersonGroup[] = [];

    // Teammates first (sorted by first name)
    const teammateGroups: PersonGroup[] = [];
    for (const [personId, personTasks] of groups) {
      if (personId === "__unassigned__") continue;
      const person = personTasks[0]?.assigned_person;
      if (!person) continue;
      if (person.team) {
        teammateGroups.push({
          id: personId,
          name: person.name.split(" ")[0],
          tasks: personTasks,
        });
      }
    }
    teammateGroups.sort((a, b) => a.name.localeCompare(b.name));
    result.push(...teammateGroups);

    // Client tasks grouped under "Klanten"
    const clientTasks: TaskRow[] = [];
    for (const [personId, personTasks] of groups) {
      if (personId === "__unassigned__") continue;
      const person = personTasks[0]?.assigned_person;
      if (!person) continue;
      if (!person.team) {
        clientTasks.push(...personTasks);
      }
    }
    if (clientTasks.length > 0) {
      result.push({ id: "__clients__", name: "Klanten", tasks: clientTasks });
    }

    // Unassigned
    const unassigned = groups.get("__unassigned__");
    if (unassigned && unassigned.length > 0) {
      result.push({ id: null, name: "Niet toegewezen", tasks: unassigned });
    }

    return result;
  }, [tasks]);

  const doneTasks = useMemo(() => tasks.filter((t) => t.status === "done"), [tasks]);

  return (
    <Card>
      <CardHeader className="border-b border-border/50">
        <div className="flex items-baseline justify-between">
          <CardTitle>Taken</CardTitle>
          <span className="text-xs text-muted-foreground">
            {activeCount} actief{doneCount > 0 ? ` · ${doneCount} afgerond` : ""}
          </span>
        </div>

        {/* Toggle pills + urgentie indicator */}
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDone(false)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              !showDone
                ? "bg-foreground text-background"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Actief
          </button>
          {doneCount > 0 && (
            <button
              type="button"
              onClick={() => setShowDone(true)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                showDone
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              Afgerond
            </button>
          )}
          <div className="flex-1" />
          {!showDone && overdueCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-red-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              {overdueCount} verlopen
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {!showDone ? (
          personGroups.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Geen actieve taken. Promoveer actiepunten vanuit een meeting.
            </p>
          ) : (
            <div className="space-y-6">
              {personGroups.map((group) => (
                <div key={group.id ?? "__unassigned__"}>
                  <div className="mb-3 flex items-baseline gap-2">
                    <h3 className="text-lg font-semibold">{group.name}</h3>
                    <span className="text-xs font-medium text-muted-foreground">
                      {group.tasks.length} {group.tasks.length === 1 ? "taak" : "taken"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {group.tasks.map((task) => (
                      <TaskItem key={task.id} task={task} teammates={teammates} clients={clients} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : doneTasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Geen afgeronde taken.</p>
        ) : (
          <div className="space-y-1">
            {doneTasks.map((task) => (
              <TaskItem key={task.id} task={task} teammates={teammates} clients={clients} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
