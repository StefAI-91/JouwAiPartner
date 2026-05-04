import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReadyToTestCard } from "@/components/briefing/ready-to-test-card";
import type { BriefingSprint, BriefingTopic } from "@repo/database/queries/portal";

function topicItem(overrides: Partial<BriefingTopic> = {}) {
  const topic: BriefingTopic = {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Snellere zoekfunctie",
    client_title: null,
    client_description: "Resultaten verschijnen tijdens typen.",
    client_test_instructions: "1. Open preview\n2. Klik zoek\n3. Verwacht resultaat",
    type: "feature",
    status: "in_progress",
    updated_at: "2026-04-28T10:00:00Z",
    ...overrides,
  };
  return { kind: "topic" as const, topic };
}

function sprintItem(overrides: Partial<BriefingSprint> = {}) {
  const sprint: BriefingSprint = {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Sprint 5",
    summary: "Login + onboarding flow",
    client_test_instructions:
      "1. Open de app\n2. Log in via e-mail\n3. Doorloop het welkomstscherm",
    delivery_week: "2026-05-04",
    updated_at: "2026-04-28T10:00:00Z",
    ...overrides,
  };
  return { kind: "sprint" as const, sprint };
}

describe("ReadyToTestCard — topic", () => {
  it("toont client_title wanneer aanwezig, anders title", () => {
    const { rerender } = render(
      <ReadyToTestCard item={topicItem({ title: "Intern", client_title: "Klantvertaling" })} />,
    );
    expect(screen.getByText("Klantvertaling")).toBeInTheDocument();

    rerender(<ReadyToTestCard item={topicItem({ title: "Intern", client_title: null })} />);
    expect(screen.getByText("Intern")).toBeInTheDocument();
  });

  it("toont instructies pas na klikken op de toggle", () => {
    render(<ReadyToTestCard item={topicItem()} />);

    expect(screen.queryByText(/Open preview/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText(/Open preview/)).toBeInTheDocument();
    expect(screen.getByText("Hoe te testen")).toBeInTheDocument();
  });

  it("opent direct wanneer defaultOpen=true (eerste card)", () => {
    render(<ReadyToTestCard item={topicItem()} defaultOpen />);
    expect(screen.getByText("Hoe te testen")).toBeInTheDocument();
  });

  it("toggle gaat dicht na tweede klik", () => {
    render(<ReadyToTestCard item={topicItem()} defaultOpen />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText("Hoe te testen")).not.toBeInTheDocument();
  });

  it("rendert bug-badge wanneer type=bug", () => {
    render(<ReadyToTestCard item={topicItem({ type: "bug" })} />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
  });
});

describe("ReadyToTestCard — sprint", () => {
  it("rendert sprint-naam, summary en sprint-badge", () => {
    render(<ReadyToTestCard item={sprintItem()} />);
    expect(screen.getByText("Sprint 5")).toBeInTheDocument();
    expect(screen.getByText("Login + onboarding flow")).toBeInTheDocument();
    expect(screen.getByText("Sprint")).toBeInTheDocument();
  });

  it("toont opleverweek-bereik onder de titel", () => {
    render(<ReadyToTestCard item={sprintItem({ delivery_week: "2026-05-04" })} />);
    expect(screen.getByText(/Oplevering week van 4 mei.*10 mei/)).toBeInTheDocument();
  });

  it("klap-instructies open toont sprint-test-instructies", () => {
    render(<ReadyToTestCard item={sprintItem()} defaultOpen />);
    expect(screen.getByText(/Log in via e-mail/)).toBeInTheDocument();
  });
});
