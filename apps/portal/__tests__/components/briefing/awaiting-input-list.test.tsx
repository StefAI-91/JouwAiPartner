import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AwaitingInputList } from "@/components/briefing/awaiting-input-list";
import type { BriefingTopic } from "@repo/database/queries/portal";

function makeTopic(overrides: Partial<BriefingTopic> = {}): BriefingTopic {
  return {
    id: overrides.id ?? "22222222-2222-4222-8222-222222222222",
    title: overrides.title ?? "Welke rollen krijgen toegang?",
    client_title: overrides.client_title ?? null,
    client_description: overrides.client_description ?? null,
    client_test_instructions: overrides.client_test_instructions ?? null,
    type: overrides.type ?? "feature",
    status: overrides.status ?? "awaiting_client_input",
    updated_at: overrides.updated_at ?? "2026-04-28T10:00:00Z",
  };
}

describe("AwaitingInputList", () => {
  beforeAll(() => {
    // Vaste klok zodat "open sinds X dagen" deterministisch is.
    vi.setSystemTime(new Date("2026-05-02T12:00:00Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("toont 'Geen extra blockers' als de lijst leeg is", () => {
    render(<AwaitingInputList topics={[]} projectId="p1" />);
    expect(screen.getByText(/Geen extra blockers/)).toBeInTheDocument();
  });

  it("formatteert 'Open sinds X dagen' uit updated_at", () => {
    // 2026-04-28 → 2026-05-02 = 4 dagen
    render(
      <AwaitingInputList
        topics={[makeTopic({ updated_at: "2026-04-28T12:00:00Z" })]}
        projectId="p1"
      />,
    );
    expect(screen.getByText("Open sinds 4 dagen")).toBeInTheDocument();
  });

  it("toont 'vandaag' wanneer updated_at minder dan 24u oud is", () => {
    render(
      <AwaitingInputList
        topics={[makeTopic({ updated_at: "2026-05-02T08:00:00Z" })]}
        projectId="p1"
      />,
    );
    expect(screen.getByText("Open sinds vandaag")).toBeInTheDocument();
  });

  it("CTA-link wijst naar de topic-detail in de roadmap", () => {
    render(<AwaitingInputList topics={[makeTopic({ id: "topic-abc" })]} projectId="proj-xyz" />);
    const link = screen.getByRole("link", { name: /Bekijk topic/ });
    expect(link.getAttribute("href")).toBe("/projects/proj-xyz/roadmap/topic-abc");
  });

  it("toont client_title wanneer aanwezig, anders title", () => {
    const { rerender } = render(
      <AwaitingInputList
        topics={[makeTopic({ title: "Intern", client_title: "Klantvariant" })]}
        projectId="p1"
      />,
    );
    expect(screen.getByText("Klantvariant")).toBeInTheDocument();

    rerender(
      <AwaitingInputList
        topics={[makeTopic({ title: "Intern", client_title: null })]}
        projectId="p1"
      />,
    );
    expect(screen.getByText("Intern")).toBeInTheDocument();
  });
});
