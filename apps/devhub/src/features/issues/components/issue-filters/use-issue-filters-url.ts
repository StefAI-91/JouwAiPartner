"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { DEFAULT_SORT, SORT_VALUES, type SortValue } from "./sort-dropdown";

export function useIssueFiltersUrl() {
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

  // Group-by-topic is default; `?group=flat` schakelt het uit. De toggle
  // is dus "default aan" en flippen voegt `flat` toe i.p.v. `topic`.
  const groupOverridden = searchParams.get("group") === "flat";
  const groupActive = !groupOverridden;
  const ungroupedActive = searchParams.get("ungrouped") === "1";

  const hasAnyFilter =
    searchParams.has("status") ||
    searchParams.has("priority") ||
    searchParams.has("type") ||
    searchParams.has("component") ||
    searchParams.has("source") ||
    searchParams.has("assignee") ||
    searchParams.has("topic") ||
    searchParams.has("ungrouped") ||
    groupOverridden;

  const toggleGroup = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (groupOverridden) {
      params.delete("group");
    } else {
      params.set("group", "flat");
    }
    params.delete("page");
    router.push(`/issues?${params.toString()}`);
  }, [router, searchParams, groupOverridden]);

  // PR-019 — toggle naar de ungrouped-only view die het cluster-paneel
  // triggert. Bij activeren forceren we group=flat zodat de IssueList plat
  // is (gegroepeerd-met-alleen-ungrouped is geen zinvolle weergave). De
  // open/afgerond keuze leeft binnen het paneel zelf.
  const toggleUngrouped = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (ungroupedActive) {
      params.delete("ungrouped");
      params.delete("group");
      // Done-mode wordt door het paneel via `?status=done` geactiveerd; bij
      // afsluiten van de cleanup-view ruimen we die ook op.
      if (params.get("status") === "done") {
        params.delete("status");
      }
    } else {
      params.set("ungrouped", "1");
      params.set("group", "flat");
    }
    params.delete("page");
    router.push(`/issues?${params.toString()}`);
  }, [router, searchParams, ungroupedActive]);

  const clearAll = useCallback(() => {
    const params = new URLSearchParams();
    const project = searchParams.get("project");
    if (project) params.set("project", project);
    const qs = params.toString();
    router.push(qs ? `/issues?${qs}` : "/issues");
  }, [router, searchParams]);

  return {
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
  };
}
