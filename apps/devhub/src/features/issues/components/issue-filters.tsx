"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpDown, ChevronDown, X } from "lucide-react";
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

const SORT_OPTIONS = [
  { value: "priority", label: "Priority" },
  { value: "newest", label: "Nieuwste eerst" },
  { value: "oldest", label: "Oudste eerst" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];
const SORT_VALUES = SORT_OPTIONS.map((o) => o.value) as readonly SortValue[];
const DEFAULT_SORT: SortValue = "priority";

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

interface FilterDropdownProps {
  label: string;
  paramKey: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (key: string, value: string) => void;
}

function FilterDropdown({ label, paramKey, options, selected, onToggle }: FilterDropdownProps) {
  const hasSelection = selected.length > 0;
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left });
    }

    updatePosition();

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="flex-shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted",
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

      {open &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="z-50 min-w-40 rounded-lg border border-border bg-popover py-1 shadow-lg"
          >
            {options.map((opt) => {
              const isSelected = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isSelected}
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
          </div>,
          document.body,
        )}
    </div>
  );
}

interface SortDropdownProps {
  value: SortValue;
  onChange: (value: SortValue) => void;
}

function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isCustom = value !== DEFAULT_SORT;
  const activeLabel = SORT_OPTIONS.find((o) => o.value === value)?.label ?? "Priority";

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left });
    }

    updatePosition();

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="flex-shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted",
          isCustom && "border-primary/30 bg-primary/5 text-primary",
        )}
      >
        <ArrowUpDown className="size-3 text-muted-foreground" />
        {activeLabel}
        <ChevronDown className="size-3 text-muted-foreground" />
      </button>

      {open &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="z-50 min-w-44 rounded-lg border border-border bg-popover py-1 shadow-lg"
          >
            {SORT_OPTIONS.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent",
                    isSelected && "font-medium text-primary",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-3.5 items-center justify-center rounded-full border",
                      isSelected ? "border-primary" : "border-border",
                    )}
                  >
                    {isSelected && <span className="size-1.5 rounded-full bg-primary" />}
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}

interface IssueFiltersProps {
  people: { id: string; name: string }[];
  topics: { id: string; label: string }[];
}

export function IssueFilters({ people, topics }: IssueFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ASSIGNEE_OPTIONS = [
    { value: UNASSIGNED_SENTINEL, label: "Niet toegewezen" },
    ...people.map((p) => ({ value: p.id, label: p.name })),
  ];
  const TOPIC_OPTIONS = topics.map((t) => ({ value: t.id, label: t.label }));

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

      // Filters change the result set — reset to page 1 to avoid landing on a stale page.
      params.delete("page");

      router.push(`/issues?${params.toString()}`);
    },
    [router, searchParams],
  );

  const rawSort = searchParams.get("sort");
  const sortValue: SortValue = (SORT_VALUES as readonly string[]).includes(rawSort ?? "")
    ? (rawSort as SortValue)
    : DEFAULT_SORT;

  const changeSort = useCallback(
    (value: SortValue) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === DEFAULT_SORT) {
        params.delete("sort");
      } else {
        params.set("sort", value);
      }
      // Sort change reshuffles everything — reset pagination.
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `/issues?${qs}` : "/issues");
    },
    [router, searchParams],
  );

  const hasAnyFilter =
    searchParams.has("status") ||
    searchParams.has("priority") ||
    searchParams.has("type") ||
    searchParams.has("component") ||
    searchParams.has("assignee") ||
    searchParams.has("topic");

  const clearAll = useCallback(() => {
    const params = new URLSearchParams();
    const project = searchParams.get("project");
    if (project) params.set("project", project);
    const qs = params.toString();
    router.push(qs ? `/issues?${qs}` : "/issues");
  }, [router, searchParams]);

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
