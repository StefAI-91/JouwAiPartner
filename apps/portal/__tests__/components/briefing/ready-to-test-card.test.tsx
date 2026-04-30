import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReadyToTestCard } from "@/components/briefing/ready-to-test-card";
import type { BriefingTopic } from "@repo/database/queries/portal";

function makeTopic(overrides: Partial<BriefingTopic> = {}): BriefingTopic {
  return {
    id: overrides.id ?? "11111111-1111-4111-8111-111111111111",
    title: overrides.title ?? "Snellere zoekfunctie",
    client_title: overrides.client_title ?? null,
    client_description: overrides.client_description ?? "Resultaten verschijnen tijdens typen.",
    client_test_instructions:
      overrides.client_test_instructions ?? "1. Open preview\n2. Klik zoek\n3. Verwacht resultaat",
    type: overrides.type ?? "feature",
    status: overrides.status ?? "in_progress",
    updated_at: overrides.updated_at ?? "2026-04-28T10:00:00Z",
  };
}

describe("ReadyToTestCard", () => {
  it("toont client_title wanneer aanwezig, anders title", () => {
    const { rerender } = render(
      <ReadyToTestCard topic={makeTopic({ title: "Intern", client_title: "Klantvertaling" })} />,
    );
    expect(screen.getByText("Klantvertaling")).toBeInTheDocument();

    rerender(<ReadyToTestCard topic={makeTopic({ title: "Intern", client_title: null })} />);
    expect(screen.getByText("Intern")).toBeInTheDocument();
  });

  it("toont instructies pas na klikken op de toggle", () => {
    render(<ReadyToTestCard topic={makeTopic()} />);

    expect(screen.queryByText(/Open preview/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText(/Open preview/)).toBeInTheDocument();
    expect(screen.getByText("Hoe te testen")).toBeInTheDocument();
  });

  it("opent direct wanneer defaultOpen=true (eerste card)", () => {
    render(<ReadyToTestCard topic={makeTopic()} defaultOpen />);
    expect(screen.getByText("Hoe te testen")).toBeInTheDocument();
  });

  it("toggle gaat dicht na tweede klik", () => {
    render(<ReadyToTestCard topic={makeTopic()} defaultOpen />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText("Hoe te testen")).not.toBeInTheDocument();
  });

  it("rendert bug-badge wanneer type=bug", () => {
    render(<ReadyToTestCard topic={makeTopic({ type: "bug" })} />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
  });
});
