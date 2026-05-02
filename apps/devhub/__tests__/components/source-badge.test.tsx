// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { SourceBadge } from "../../src/components/shared/source-badge";

// CC-003 — visuele triage-hint. Test asserteert het zichtbare label per
// source-categorie en het uitdrukkelijk verborgen-zijn voor interne sources
// (manual/ai); geen visuele ruis op default = bewuste keuze (zie sprint).

describe("SourceBadge", () => {
  afterEach(() => cleanup());

  it("toont 'Klant-PM' voor source='portal'", () => {
    render(<SourceBadge source="portal" />);
    expect(screen.getByText("Klant-PM")).toBeDefined();
  });

  it("toont 'Eindgebruiker' voor source='userback'", () => {
    render(<SourceBadge source="userback" />);
    expect(screen.getByText("Eindgebruiker")).toBeDefined();
  });

  it("toont 'Eindgebruiker' voor source='jaip_widget'", () => {
    render(<SourceBadge source="jaip_widget" />);
    expect(screen.getByText("Eindgebruiker")).toBeDefined();
  });

  it("rendert niets voor interne sources (manual/ai)", () => {
    const { container: manual } = render(<SourceBadge source="manual" />);
    expect(manual.firstChild).toBeNull();
    cleanup();
    const { container: ai } = render(<SourceBadge source="ai" />);
    expect(ai.firstChild).toBeNull();
  });

  it("rendert niets voor null source", () => {
    const { container } = render(<SourceBadge source={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("rendert niets voor onbekende source", () => {
    const { container } = render(<SourceBadge source="slack" />);
    expect(container.firstChild).toBeNull();
  });
});
