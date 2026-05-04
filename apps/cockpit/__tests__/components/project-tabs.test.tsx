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
  it("rendert alle vier tabs als links naar de juiste hrefs", () => {
    pathnameMock.value = "/projects/proj-a";
    render(<ProjectTabs projectId="proj-a" />);
    expect(screen.getByRole("tab", { name: "Overzicht" })).toHaveAttribute(
      "href",
      "/projects/proj-a",
    );
    expect(screen.getByRole("tab", { name: "Activiteit" })).toHaveAttribute(
      "href",
      "/projects/proj-a/activity",
    );
    expect(screen.getByRole("tab", { name: "Inzichten" })).toHaveAttribute(
      "href",
      "/projects/proj-a/insights",
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
    expect(screen.getByRole("tab", { name: "Activiteit" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: "Inzichten" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: "Inbox" })).toHaveAttribute("aria-selected", "false");
  });

  it("markeert Activiteit als active op /projects/[id]/activity", () => {
    pathnameMock.value = "/projects/proj-a/activity";
    render(<ProjectTabs projectId="proj-a" />);
    expect(screen.getByRole("tab", { name: "Activiteit" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Overzicht" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("markeert Inzichten als active op /projects/[id]/insights", () => {
    pathnameMock.value = "/projects/proj-a/insights";
    render(<ProjectTabs projectId="proj-a" />);
    expect(screen.getByRole("tab", { name: "Inzichten" })).toHaveAttribute("aria-selected", "true");
  });

  it("markeert Inbox als active op /projects/[id]/inbox en diepere routes", () => {
    pathnameMock.value = "/projects/proj-a/inbox";
    render(<ProjectTabs projectId="proj-a" />);
    expect(screen.getByRole("tab", { name: "Inbox" })).toHaveAttribute("aria-selected", "true");
    cleanup();

    pathnameMock.value = "/projects/proj-a/inbox/conversation/q-1";
    render(<ProjectTabs projectId="proj-a" />);
    expect(screen.getByRole("tab", { name: "Inbox" })).toHaveAttribute("aria-selected", "true");
  });

  it("toont inbox-badge wanneer inboxBadge > 0", () => {
    pathnameMock.value = "/projects/proj-a";
    render(<ProjectTabs projectId="proj-a" inboxBadge={5} />);
    const inboxTab = screen.getByRole("tab", { name: /Inbox/ });
    expect(inboxTab.textContent).toContain("5");
  });

  it("toont geen inbox-badge wanneer inboxBadge 0 of undefined is", () => {
    pathnameMock.value = "/projects/proj-a";
    render(<ProjectTabs projectId="proj-a" inboxBadge={0} />);
    const inboxTab = screen.getByRole("tab", { name: "Inbox" });
    expect(inboxTab.textContent?.trim()).toBe("Inbox");
  });
});
