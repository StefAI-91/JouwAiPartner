// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { resolveDevhubSourceGroup } from "@repo/database/constants/issues";
import { SourceIndicator } from "@repo/ui/source-indicator";

// CC-008 — integration-test op de DevHub call-site.
//
// Tot CC-008 leefde dit als wrapper-component (`SourceBadge`); na de
// consolidatie naar `@repo/ui/source-indicator` is de wrapper weg en
// resolved de caller zelf. Deze test bevestigt dat de combinatie
// `resolveDevhubSourceGroup` + `SourceIndicator` exact hetzelfde gedrag
// produceert: label op klant/eindgebruiker, niets op intern/onbekend.

function DevhubSource({ source }: { source: string | null }) {
  return <SourceIndicator group={resolveDevhubSourceGroup(source)} variant="badge" />;
}

describe("DevHub source-indicator integratie", () => {
  afterEach(() => cleanup());

  it("toont 'Klant-PM' voor source='portal'", () => {
    render(<DevhubSource source="portal" />);
    expect(screen.getByText("Klant-PM")).toBeDefined();
  });

  it("toont 'Eindgebruiker' voor source='userback'", () => {
    render(<DevhubSource source="userback" />);
    expect(screen.getByText("Eindgebruiker")).toBeDefined();
  });

  it("toont 'Eindgebruiker' voor source='jaip_widget'", () => {
    render(<DevhubSource source="jaip_widget" />);
    expect(screen.getByText("Eindgebruiker")).toBeDefined();
  });

  it("rendert niets voor interne sources (manual/ai)", () => {
    const { container: manual } = render(<DevhubSource source="manual" />);
    expect(manual.firstChild).toBeNull();
    cleanup();
    const { container: ai } = render(<DevhubSource source="ai" />);
    expect(ai.firstChild).toBeNull();
  });

  it("rendert niets voor null source", () => {
    const { container } = render(<DevhubSource source={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("rendert niets voor onbekende source", () => {
    const { container } = render(<DevhubSource source="slack" />);
    expect(container.firstChild).toBeNull();
  });
});
