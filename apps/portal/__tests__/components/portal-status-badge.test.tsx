import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortalStatusBadge } from "@/components/issues/portal-status-badge";

// Q3b §5: Portal-app eerste component-render test (jsdom + RTL).

describe("PortalStatusBadge", () => {
  it("vertaalt interne 'triage' status naar portal-label 'Ontvangen'", () => {
    render(<PortalStatusBadge status="triage" />);
    expect(screen.getByText(/ontvangen/i)).toBeInTheDocument();
  });

  it("toont onbekende status ongewijzigd (geen stille verwijdering)", () => {
    render(<PortalStatusBadge status="unknown_status" />);
    expect(screen.getByText("unknown_status")).toBeInTheDocument();
  });

  it("rendert als <span> met basis-styling klassen", () => {
    const { container } = render(<PortalStatusBadge status="in_progress" />);
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span?.className).toContain("rounded-full");
    expect(span?.className).toContain("border");
  });
});
