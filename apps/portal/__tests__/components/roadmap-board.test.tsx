import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
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

describe("RoadmapBoard", () => {
  it("rendert de vier bucket-labels", () => {
    render(<RoadmapBoard buckets={emptyBuckets()} issueCounts={new Map()} projectId="p1" />);

    for (const label of [
      "Recent gefixt",
      "Komende week",
      "Hoge prio daarna",
      "Niet geprioritiseerd",
    ]) {
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    }
  });

  it("toont count met padding ('03') in de header", () => {
    const buckets = emptyBuckets();
    buckets.upcoming = [
      makeTopic({ id: "t1", title: "A" }),
      makeTopic({ id: "t2", title: "B" }),
      makeTopic({ id: "t3", title: "C" }),
    ];

    render(<RoadmapBoard buckets={buckets} issueCounts={new Map()} projectId="p1" />);

    const header = screen.getByRole("heading", { name: "Komende week" }).closest("header")!;
    expect(within(header).getByText("03")).toBeInTheDocument();
  });

  it("toont per lege bucket een eigen empty-state", () => {
    render(<RoadmapBoard buckets={emptyBuckets()} issueCounts={new Map()} projectId="p1" />);

    expect(screen.getByText("Nog geen recent opgeleverde onderwerpen")).toBeInTheDocument();
    expect(screen.getByText("Geen onderwerpen voor deze week")).toBeInTheDocument();
    expect(screen.getByText("Geen geprioriteerde onderwerpen wachtend")).toBeInTheDocument();
    expect(screen.getByText("Niets meer wachtend op jullie signaal")).toBeInTheDocument();
  });

  it("toont topic-card met client_title wanneer aanwezig, anders title", () => {
    const buckets = emptyBuckets();
    buckets.high_prio = [
      makeTopic({ id: "ta", title: "Internal A", client_title: "Client A" }),
      makeTopic({ id: "tb", title: "Internal B", client_title: null }),
    ];

    render(<RoadmapBoard buckets={buckets} issueCounts={new Map()} projectId="p1" />);

    expect(screen.getByText("Client A")).toBeInTheDocument();
    expect(screen.queryByText("Internal A")).not.toBeInTheDocument();
    expect(screen.getByText("Internal B")).toBeInTheDocument();
  });
});
