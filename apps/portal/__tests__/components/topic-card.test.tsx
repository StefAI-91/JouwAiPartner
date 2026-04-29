import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopicCard } from "@/components/roadmap/topic-card";
import type { TopicListRow } from "@repo/database/queries/topics";

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

describe("TopicCard", () => {
  it("linkt naar /projects/{id}/roadmap/{topicId}", () => {
    render(<TopicCard topic={makeTopic({ id: "t-xyz" })} projectId="p1" linkedIssuesCount={0} />);

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/projects/p1/roadmap/t-xyz");
  });

  it("toont client_title wanneer aanwezig, anders title", () => {
    const { rerender } = render(
      <TopicCard
        topic={makeTopic({ title: "Intern", client_title: "Klantvertaling" })}
        projectId="p1"
        linkedIssuesCount={0}
      />,
    );
    expect(screen.getByText("Klantvertaling")).toBeInTheDocument();

    rerender(
      <TopicCard
        topic={makeTopic({ title: "Intern", client_title: null })}
        projectId="p1"
        linkedIssuesCount={0}
      />,
    );
    expect(screen.getByText("Intern")).toBeInTheDocument();
  });

  it("toont 'Gesloten' wanneer closed_at gevuld is, anders 'Bijgewerkt'", () => {
    const { rerender } = render(
      <TopicCard
        topic={makeTopic({ status: "done", closed_at: "2026-04-26T10:00:00Z" })}
        projectId="p1"
        linkedIssuesCount={2}
      />,
    );
    expect(screen.getByText("Gesloten")).toBeInTheDocument();
    expect(screen.queryByText("Bijgewerkt")).not.toBeInTheDocument();

    rerender(
      <TopicCard
        topic={makeTopic({ status: "in_progress", closed_at: null })}
        projectId="p1"
        linkedIssuesCount={2}
      />,
    );
    expect(screen.getByText("Bijgewerkt")).toBeInTheDocument();
  });

  it("rendert het issue-count zoals doorgegeven", () => {
    render(<TopicCard topic={makeTopic()} projectId="p1" linkedIssuesCount={7} />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});
