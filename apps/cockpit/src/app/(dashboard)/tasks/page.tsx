export const dynamic = "force-dynamic";

import { ListChecks } from "lucide-react";
import { createClient } from "@repo/database/supabase/server";
import { listTasksWithContext } from "@repo/database/queries/tasks";
import { listPeopleForAssignment } from "@repo/database/queries/people";
import { TasksList } from "@/components/tasks/tasks-list";
import { CreateTaskForm } from "@/components/tasks/create-task-form";

export default async function TasksPage() {
  const supabase = await createClient();

  const [tasks, people] = await Promise.all([
    listTasksWithContext(200, supabase),
    listPeopleForAssignment(supabase),
  ]);

  const teammates = people.filter((p) => p.team !== null);
  const clients = people.filter((p) => p.team === null);
  const activeCount = tasks.filter((t) => t.status === "active").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  if (tasks.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ListChecks className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h2 className="mt-4 font-heading text-xl font-semibold">Geen taken</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Taken verschijnen hier zodra je actiepunten promoot vanuit meetings, of maak er handmatig
          een aan.
        </p>
        <div className="mt-6 flex justify-center">
          <CreateTaskForm teammates={teammates} clients={clients} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-semibold">Taken</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeCount} actief &middot; {doneCount} afgerond
          </p>
        </div>
        <CreateTaskForm teammates={teammates} clients={clients} />
      </div>

      <TasksList tasks={tasks} people={people} />
    </div>
  );
}
