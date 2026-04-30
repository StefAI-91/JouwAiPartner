"use client";

import { X } from "lucide-react";
import { cn } from "@repo/ui/utils";
import {
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
  ISSUE_TYPES,
  ISSUE_TYPE_LABELS,
  ISSUE_COMPONENTS,
  ISSUE_COMPONENT_LABELS,
  UNASSIGNED_SENTINEL,
} from "@repo/database/constants/issues";
import { FilterDropdown } from "./filter-dropdown";
import { SortDropdown } from "./sort-dropdown";
import { useIssueFiltersUrl } from "./use-issue-filters-url";

const STATUS_OPTIONS = ISSUE_STATUSES.map((s) => ({ value: s, label: ISSUE_STATUS_LABELS[s] }));
const PRIORITY_OPTIONS = ISSUE_PRIORITIES.map((p) => ({
  value: p,
  label: ISSUE_PRIORITY_LABELS[p],
}));
const TYPE_OPTIONS = ISSUE_TYPES.map((t) => ({ value: t, label: ISSUE_TYPE_LABELS[t] }));
const COMPONENT_OPTIONS = ISSUE_COMPONENTS.map((c) => ({
  value: c,
  label: ISSUE_COMPONENT_LABELS[c],
}));

interface IssueFiltersProps {
  people: { id: string; name: string }[];
  topics: { id: string; label: string }[];
}

export function IssueFilters({ people, topics }: IssueFiltersProps) {
  const ASSIGNEE_OPTIONS = [
    { value: UNASSIGNED_SENTINEL, label: "Niet toegewezen" },
    ...people.map((p) => ({ value: p.id, label: p.name })),
  ];
  const TOPIC_OPTIONS = topics.map((t) => ({ value: t.id, label: t.label }));

  const {
    getValues,
    toggleFilter,
    sortValue,
    changeSort,
    groupActive,
    ungroupedActive,
    hasAnyFilter,
    toggleGroup,
    toggleUngrouped,
    clearAll,
  } = useIssueFiltersUrl();

  return (
    <div className="scrollbar-none flex items-center gap-2 overflow-x-auto border-b border-border px-4 py-3">
      <FilterDropdown
        label="Status"
        paramKey="status"
        options={STATUS_OPTIONS}
        selected={getValues("status")}
        onToggle={toggleFilter}
      />
      <FilterDropdown
        label="Priority"
        paramKey="priority"
        options={PRIORITY_OPTIONS}
        selected={getValues("priority")}
        onToggle={toggleFilter}
      />
      <FilterDropdown
        label="Type"
        paramKey="type"
        options={TYPE_OPTIONS}
        selected={getValues("type")}
        onToggle={toggleFilter}
      />
      <FilterDropdown
        label="Component"
        paramKey="component"
        options={COMPONENT_OPTIONS}
        selected={getValues("component")}
        onToggle={toggleFilter}
      />
      <FilterDropdown
        label="Toegewezen"
        paramKey="assignee"
        options={ASSIGNEE_OPTIONS}
        selected={getValues("assignee")}
        onToggle={toggleFilter}
      />
      {TOPIC_OPTIONS.length > 0 && (
        <FilterDropdown
          label="Topic"
          paramKey="topic"
          options={TOPIC_OPTIONS}
          selected={getValues("topic")}
          onToggle={toggleFilter}
        />
      )}
      {TOPIC_OPTIONS.length > 0 && (
        <button
          type="button"
          onClick={toggleGroup}
          aria-pressed={groupActive}
          className={cn(
            "flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm transition-colors",
            groupActive
              ? "border-primary/30 bg-primary/5 text-primary"
              : "border-border hover:bg-muted",
          )}
          title="Cluster issues per topic"
        >
          Groep op topic
        </button>
      )}
      <button
        type="button"
        onClick={toggleUngrouped}
        aria-pressed={ungroupedActive}
        className={cn(
          "flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm transition-colors",
          ungroupedActive
            ? "border-primary/30 bg-primary/5 text-primary"
            : "border-border hover:bg-muted",
        )}
        title="Toon alleen issues zonder topic — activeert het cluster-suggestie-paneel"
      >
        Alleen ungrouped
      </button>

      {hasAnyFilter && (
        <button
          onClick={clearAll}
          className="flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3" />
          Clear
        </button>
      )}

      <div className="ml-auto flex-shrink-0">
        <SortDropdown value={sortValue} onChange={changeSort} />
      </div>
    </div>
  );
}
