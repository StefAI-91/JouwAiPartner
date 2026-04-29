import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { BucketStack } from "@/components/roadmap/bucket-stack";
import type { TopicListRow } from "@repo/database/queries/topics";
import type { PortalBucketKey } from "@repo/database/constants/topics";

function makeTopic(overrides: Partial<TopicListRow> = {}): TopicListRow {
  return {
    id: overrides.id ?? "11111111-1111-4111-8111-111111111111",
    project_id: "p1",
    title: overrides.title ?? "Internal title",
    client_title: overrides.client_title ?? null,
    type: overrides.type ?? "bug",
    status: overrides.status ?? "in_progress",
    priority: overrides.priority ?? null,
    target_sprint_id: overrides.target_sprint_id ?? null,
    closed_at: overrides.closed_at ?? null,
    updated_at: overrides.updated_at ?? "2026-04-26T10:00:00Z",
  };
}

function emptyBuckets(): Record<PortalBucketKey, TopicListRow[]> {
  return { recent_done: [], upcoming: [], high_prio: [], awaiting_input: [] };
}

describe("BucketStack", () => {
  it("rendert de vier bucket-labels", () => {
    render(<BucketStack buckets={emptyBuckets()} issueCounts={new Map()} projectId="p1" />);

    for (const label of [
      "Recent gefixt",
      "Komende week",
      "Hoge prio daarna",
      "Niet geprioritiseerd",
    ]) {
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    }
  });

  it("splitst topics binnen een bucket per type (bug vs feature)", () => {
    const buckets = emptyBuckets();
    buckets.upcoming = [
      makeTopic({ id: "t1", title: "Bug A", type: "bug" }),
      makeTopic({ id: "t2", title: "Bug B", type: "bug" }),
      makeTopic({ id: "t3", title: "Feature C", type: "feature" }),
    ];

    render(<BucketStack buckets={buckets} issueCounts={new Map()} projectId="p1" />);

    const upcomingHeader = screen.getByRole("heading", { name: "Komende week" });
    const section = upcomingHeader.closest("section")!;

    expect(within(section).getByText("Bugs")).toBeInTheDocument();
    expect(within(section).getByText("Functionaliteit")).toBeInTheDocument();
    expect(within(section).getByText("Bug A")).toBeInTheDocument();
    expect(within(section).getByText("Bug B")).toBeInTheDocument();
    expect(within(section).getByText("Feature C")).toBeInTheDocument();
  });

  it("toont per lege type-kolom een eigen empty-state", () => {
    render(<BucketStack buckets={emptyBuckets()} issueCounts={new Map()} projectId="p1" />);

    // Vier buckets × twee types = acht empty-states (vier per tekst).
    expect(screen.getAllByText("Geen bugs in deze fase — fijn.")).toHaveLength(4);
    expect(screen.getAllByText("Geen openstaande wensen in deze fase.")).toHaveLength(4);
  });

  it("gebruikt client_title wanneer aanwezig, anders interne title", () => {
    const buckets = emptyBuckets();
    buckets.high_prio = [
      makeTopic({ id: "ta", title: "Internal A", client_title: "Client A" }),
      makeTopic({ id: "tb", title: "Internal B", client_title: null }),
    ];

    render(<BucketStack buckets={buckets} issueCounts={new Map()} projectId="p1" />);

    expect(screen.getByText("Client A")).toBeInTheDocument();
    expect(screen.queryByText("Internal A")).not.toBeInTheDocument();
    expect(screen.getByText("Internal B")).toBeInTheDocument();
  });
});
