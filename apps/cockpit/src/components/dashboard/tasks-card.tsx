"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TaskItem } from "./task-item";
import type { TaskRow } from "@repo/database/queries/tasks";
import type { PersonWithOrg } from "@repo/database/queries/people";

interface TasksCardProps {
  tasks: TaskRow[];
  people: PersonWithOrg[];
}

export function TasksCard({ tasks, people }: TasksCardProps) {
  const teammates = people.filter((p) => p.team);
  const clients = people.filter((p) => !p.team);

  return (
    <Card>
      <CardHeader className="border-b border-border/50">
        <CardTitle>Taken</CardTitle>
        <CardDescription>Actieve actiepunten uit meetings</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Geen actieve taken. Promoveer actiepunten vanuit een meeting.
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} teammates={teammates} clients={clients} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
