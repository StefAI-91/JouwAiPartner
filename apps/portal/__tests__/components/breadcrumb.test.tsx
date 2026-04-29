import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumb } from "@/components/layout/breadcrumb";

const pathnameMock = vi.hoisted(() => ({ value: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock.value,
}));

beforeEach(() => {
  pathnameMock.value = "/";
});

const projects = [
  { id: "proj-a", name: "Project Alfa" },
  { id: "proj-b", name: "Project Beta" },
];

describe("Breadcrumb", () => {
  it("toont alleen 'Projecten' op de overview-route", () => {
    pathnameMock.value = "/";
    render(<Breadcrumb projects={projects} />);
    expect(screen.getByText("Projecten")).toBeInTheDocument();
  });

  it("zet de project-naam als laatste crumb op een project-detail", () => {
    pathnameMock.value = "/projects/proj-a";
    render(<Breadcrumb projects={projects} />);
    expect(screen.getByText("Project Alfa")).toBeInTheDocument();
  });

  it("rendert volledige keten op een project-issues route", () => {
    pathnameMock.value = "/projects/proj-a/issues";
    render(<Breadcrumb projects={projects} />);
    expect(screen.getByText("Projecten")).toBeInTheDocument();
    expect(screen.getByText("Project Alfa")).toBeInTheDocument();
    expect(screen.getByText("Issues")).toBeInTheDocument();
  });

  it("valt terug op 'Project' als het id niet bekend is", () => {
    pathnameMock.value = "/projects/onbekend/feedback";
    render(<Breadcrumb projects={projects} />);
    expect(screen.getByText("Project")).toBeInTheDocument();
    expect(screen.getByText("Feedback")).toBeInTheDocument();
  });
});
