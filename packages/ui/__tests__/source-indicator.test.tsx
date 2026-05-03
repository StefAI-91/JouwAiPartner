import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SourceIndicator } from "../src/source-indicator";

afterEach(() => cleanup());

/**
 * CC-008 — gedeelde SourceIndicator vervangt de gedupliceerde
 * `source-badge` (devhub) en `source-dot` (cockpit). Test verifieert
 * de twee varianten en dat onbekende/null-groepen niets renderen
 * (consistent met de oude fallback).
 */

describe("SourceIndicator", () => {
  it("rendert niets als group null is", () => {
    const { container } = render(<SourceIndicator group={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("rendert niets als group undefined is", () => {
    const { container } = render(<SourceIndicator group={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("badge-variant: toont label voor client_pm", () => {
    render(<SourceIndicator group="client_pm" variant="badge" />);
    expect(screen.getByText("Klant-PM")).toBeInTheDocument();
  });

  it("badge-variant: toont label voor end_user", () => {
    render(<SourceIndicator group="end_user" variant="badge" />);
    expect(screen.getByText("Eindgebruiker")).toBeInTheDocument();
  });

  it("badge-variant heeft border + violet-50/orange-50 background-class", () => {
    const { container: a } = render(<SourceIndicator group="client_pm" variant="badge" />);
    expect(a.firstChild?.textContent).toBe("Klant-PM");
    expect((a.firstChild as HTMLElement).className).toContain("violet-50");

    const { container: b } = render(<SourceIndicator group="end_user" variant="badge" />);
    expect((b.firstChild as HTMLElement).className).toContain("orange-50");
  });

  it("dot-variant: toont rounded-full bullet met title", () => {
    const { container } = render(<SourceIndicator group="client_pm" variant="dot" />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("title")).toBe("Klant-PM");
    // De bullet zelf is een aparte span met rounded-full
    expect(root.querySelector(".rounded-full")).toBeTruthy();
  });

  it("default variant is badge", () => {
    render(<SourceIndicator group="client_pm" />);
    expect(screen.getByText("Klant-PM")).toBeInTheDocument();
  });

  it("custom className wordt toegevoegd", () => {
    const { container } = render(
      <SourceIndicator group="client_pm" variant="badge" className="custom-x" />,
    );
    expect((container.firstChild as HTMLElement).className).toContain("custom-x");
  });
});
