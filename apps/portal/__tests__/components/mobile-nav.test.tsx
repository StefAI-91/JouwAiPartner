import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import {
  MobileNavDrawer,
  MobileNavProvider,
  MobileNavTrigger,
} from "@/components/layout/mobile-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// `WorkspaceSwitcher` haalt zware Base-UI/portal deps op die niet bijdragen
// aan deze drawer-smoke. Stub de UI-grens zodat we open/close + portal-mount
// kunnen testen zonder hele dropdown-tree te boot-strappen.
vi.mock("@repo/ui/workspace-switcher", () => ({
  WorkspaceSwitcher: () => <div data-testid="workspace-switcher" />,
}));

const projects = [
  { id: "proj-a", name: "Project A" },
  { id: "proj-b", name: "Project B" },
];

function Harness() {
  return (
    <MobileNavProvider>
      <MobileNavTrigger />
      <MobileNavDrawer projects={projects} />
    </MobileNavProvider>
  );
}

describe("MobileNavDrawer", () => {
  it("rendert geen dialoog tot de hamburger geklikt is", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opent de drawer wanneer de hamburger geklikt wordt", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("rendert de projectenlijst binnen de drawer", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Project A")).toBeInTheDocument();
    expect(within(dialog).getByText("Project B")).toBeInTheDocument();
  });

  it("sluit de drawer via de close-knop", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    const dialog = screen.getByRole("dialog");
    const closeButtons = within(dialog).getAllByRole("button", { name: /sluit menu/i });
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sluit de drawer wanneer een project-link wordt aangeklikt", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    const link = within(screen.getByRole("dialog")).getByText("Project A");
    fireEvent.click(link);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("rendert de drawer als direct child van document.body (createPortal)", () => {
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.parentElement).toBe(document.body);
    expect(container.contains(dialog)).toBe(false);
  });
});
