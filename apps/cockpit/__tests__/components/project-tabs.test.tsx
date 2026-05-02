// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const pathnameMock = vi.hoisted(() => ({ value: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock.value,
}));

import { ProjectTabs } from "@/features/projects/components/project-tabs";

afterEach(() => cleanup());

describe("ProjectTabs", () => {
  it("rendert beide tabs als links naar de juiste hrefs", () => {
    pathnameMock.value = "/projects/proj-a";
    render(<ProjectTabs projectId="proj-a" />);
    expect(screen.getByRole("tab", { name: "Overzicht" })).toHaveAttribute(
      "href",
      "/projects/proj-a",
    );
    expect(screen.getByRole("tab", { name: "Inbox" })).toHaveAttribute(
      "href",
      "/projects/proj-a/inbox",
    );
  });

  it("markeert Overzicht als active op /projects/[id]", () => {
    pathnameMock.value = "/projects/proj-a";
    render(<ProjectTabs projectId="proj-a" />);
    expect(screen.getByRole("tab", { name: "Overzicht" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Inbox" })).toHaveAttribute("aria-selected", "false");
  });

  it("markeert Inbox als active op /projects/[id]/inbox", () => {
    pathnameMock.value = "/projects/proj-a/inbox";
    render(<ProjectTabs projectId="proj-a" />);
    expect(screen.getByRole("tab", { name: "Inbox" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Overzicht" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("matcht ook diepere inbox-routes (bv. /inbox/conversation/...)", () => {
    pathnameMock.value = "/projects/proj-a/inbox/conversation/q-1";
    render(<ProjectTabs projectId="proj-a" />);
    expect(screen.getByRole("tab", { name: "Inbox" })).toHaveAttribute("aria-selected", "true");
  });
});
