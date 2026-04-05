"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { TaskListItem, getUrgency } from "./task-list-item";
import type { TaskRowWithContext } from "@repo/database/queries/tasks";
import type { PersonForAssignment } from "@repo/database/queries/people";

type UrgencyFilter = "overdue" | "this-week" | "no-deadline" | null;
type StatusFilter = "active" | "done";

interface TasksListProps {
  tasks: TaskRowWithContext[];
  people: PersonForAssignment[];
}

export function TasksList({ tasks, people }: TasksListProps) {
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [search, setSearch] = useState("");

  const teammates = useMemo(() => people.filter((p) => p.team !== null), [people]);
  const clients = useMemo(() => people.filter((p) => p.team === null), [people]);

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) {
      const project = t.extraction?.project;
      if (project) map.set(project.id, project.name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [tasks]);

  const filtered = useMemo(() => {
    let result = tasks;

    result = result.filter((t) => t.status === statusFilter);

    if (selectedPerson) {
      result = result.filter((t) => t.assigned_to === selectedPerson);
    }
    if (selectedProject) {
      result = result.filter((t) => t.extraction?.project?.id === selectedProject);
    }
    if (urgencyFilter === "overdue") {
      result = result.filter((t) => getUrgency(t.due_date) === "overdue");
    } else if (urgencyFilter === "this-week") {
      result = result.filter((t) => getUrgency(t.due_date) === "this-week");
    } else if (urgencyFilter === "no-deadline") {
      result = result.filter((t) => !t.due_date);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }

    return result;
  }, [tasks, statusFilter, selectedPerson, selectedProject, urgencyFilter, search]);

  const grouped = useMemo(() => {
    const groups: { key: string; label: string; tasks: TaskRowWithContext[] }[] = [];
    const byProject = new Map<string, TaskRowWithContext[]>();

    for (const t of filtered) {
      const projectId = t.extraction?.project?.id ?? "__none__";
      if (!byProject.has(projectId)) byProject.set(projectId, []);
      byProject.get(projectId)!.push(t);
    }

    // Named projects first, sorted alphabetically
    const sorted = [...byProject.entries()].sort((a, b) => {
      if (a[0] === "__none__") return 1;
      if (b[0] === "__none__") return -1;
      const nameA = a[1][0]?.extraction?.project?.name ?? "";
      const nameB = b[1][0]?.extraction?.project?.name ?? "";
      return nameA.localeCompare(nameB);
    });

    for (const [key, groupTasks] of sorted) {
      const label =
        key === "__none__"
          ? "Geen project"
          : (groupTasks[0]?.extraction?.project?.name ?? "Onbekend");
      groups.push({ key, label, tasks: groupTasks });
    }

    return groups;
  }, [filtered]);

  const hasFilters =
    selectedPerson !== null ||
    selectedProject !== null ||
    urgencyFilter !== null ||
    search.trim() !== "";

  const activeCount = tasks.filter((t) => t.status === "active").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoeken..."
          className="h-8 w-40 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground"
        />

        <select
          value={selectedPerson ?? ""}
          onChange={(e) => setSelectedPerson(e.target.value || null)}
          className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
        >
          <option value="">Alle personen</option>
          {teammates.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          {clients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={selectedProject ?? ""}
          onChange={(e) => setSelectedProject(e.target.value || null)}
          className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
        >
          <option value="">Alle projecten</option>
          {projects.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={urgencyFilter ?? ""}
          onChange={(e) => setUrgencyFilter((e.target.value as UrgencyFilter) || null)}
          className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
        >
          <option value="">Alle urgentie</option>
          <option value="overdue">Verlopen</option>
          <option value="this-week">Deze week</option>
          <option value="no-deadline">Geen deadline</option>
        </select>

        {/* Status toggle */}
        <div className="flex h-8 items-center rounded-lg border border-border bg-background text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`h-full rounded-l-lg px-2.5 transition-colors ${
              statusFilter === "active"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Actief ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("done")}
            className={`h-full rounded-r-lg px-2.5 transition-colors ${
              statusFilter === "done"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Afgerond ({doneCount})
          </button>
        </div>

        {hasFilters && (
          <button
            onClick={() => {
              setSelectedPerson(null);
              setSelectedProject(null);
              setUrgencyFilter(null);
              setSearch("");
            }}
            className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Wis filters
          </button>
        )}

        {hasFilters && (
          <span className="text-xs text-muted-foreground">
            {filtered.length} van {tasks.filter((t) => t.status === statusFilter).length}
          </span>
        )}
      </div>

      {/* Grouped list */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {hasFilters ? "Geen taken gevonden met deze filters." : "Geen taken."}
        </p>
      ) : (
        grouped.map((group) => (
          <div key={group.key}>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
              <span className="ml-1.5 font-normal">({group.tasks.length})</span>
            </h2>
            <ul className="divide-y divide-border/40 rounded-lg bg-card px-3">
              {group.tasks.map((task) => (
                <TaskListItem key={task.id} task={task} teammates={teammates} clients={clients} />
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
