"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@repo/ui/utils";

const STATUS_OPTIONS = [
  { value: "triage", label: "Triage" },
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const TYPE_OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "feature_request", label: "Feature" },
  { value: "question", label: "Question" },
];

const COMPONENT_OPTIONS = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "api", label: "API" },
  { value: "database", label: "Database" },
  { value: "prompt_ai", label: "AI / Prompt" },
  { value: "unknown", label: "Unknown" },
];

interface FilterDropdownProps {
  label: string;
  paramKey: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (key: string, value: string) => void;
}

function FilterDropdown({ label, paramKey, options, selected, onToggle }: FilterDropdownProps) {
  const hasSelection = selected.length > 0;

  return (
    <div className="group relative">
      <button
        className={cn(
          "flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted",
          hasSelection && "border-primary/30 bg-primary/5 text-primary",
        )}
      >
        {label}
        {hasSelection && (
          <span className="ml-0.5 rounded bg-primary/10 px-1 text-[0.65rem] font-medium">
            {selected.length}
          </span>
        )}
        <ChevronDown className="size-3 text-muted-foreground" />
      </button>

      <div className="invisible absolute left-0 top-full z-50 mt-1 min-w-40 rounded-lg border border-border bg-popover py-1 shadow-lg opacity-0 transition-all group-focus-within:visible group-focus-within:opacity-100">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => onToggle(paramKey, opt.value)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent",
                isSelected && "font-medium text-primary",
              )}
            >
              <span
                className={cn(
                  "flex size-3.5 items-center justify-center rounded border",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
              >
                {isSelected && (
                  <svg className="size-2.5" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function IssueFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const getValues = useCallback(
    (key: string): string[] => {
      const val = searchParams.get(key);
      return val ? val.split(",") : [];
    },
    [searchParams],
  );

  const toggleFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.get(key)?.split(",").filter(Boolean) ?? [];

      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      if (updated.length > 0) {
        params.set(key, updated.join(","));
      } else {
        params.delete(key);
      }

      router.push(`/issues?${params.toString()}`);
    },
    [router, searchParams],
  );

  const hasAnyFilter =
    searchParams.has("status") ||
    searchParams.has("priority") ||
    searchParams.has("type") ||
    searchParams.has("component");

  const clearAll = useCallback(() => {
    const params = new URLSearchParams();
    const project = searchParams.get("project");
    if (project) params.set("project", project);
    const qs = params.toString();
    router.push(qs ? `/issues?${qs}` : "/issues");
  }, [router, searchParams]);

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-border px-4 py-3 scrollbar-none">
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

      {hasAnyFilter && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3" />
          Clear
        </button>
      )}
    </div>
  );
}
