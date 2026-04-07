import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database queries before importing the module under test
vi.mock("@repo/database/queries/projects", () => ({
  getActiveProjectsForContext: vi.fn(),
}));
vi.mock("@repo/database/queries/organizations", () => ({
  getAllOrganizations: vi.fn(),
}));
vi.mock("@repo/database/queries/people", () => ({
  getPeopleForContext: vi.fn(),
}));

import { buildEntityContext } from "../../src/pipeline/context-injection";
import { getActiveProjectsForContext } from "@repo/database/queries/projects";
import { getAllOrganizations } from "@repo/database/queries/organizations";
import { getPeopleForContext } from "@repo/database/queries/people";

const mockProjects = getActiveProjectsForContext as ReturnType<typeof vi.fn>;
const mockOrgs = getAllOrganizations as ReturnType<typeof vi.fn>;
const mockPeople = getPeopleForContext as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildEntityContext", () => {
  it("formats projects with organization and aliases", async () => {
    mockProjects.mockResolvedValue([
      {
        id: "uuid-1",
        name: "Klantportaal",
        aliases: ["het portaal", "klantplatform"],
        organization_name: "Jansen & Co",
      },
    ]);
    mockOrgs.mockResolvedValue([]);
    mockPeople.mockResolvedValue([]);

    const result = await buildEntityContext();

    expect(result.contextString).toContain("Bekende projecten:");
    expect(result.contextString).toContain('"Klantportaal"');
    expect(result.contextString).toContain("id: uuid-1");
    expect(result.contextString).toContain("organisatie: Jansen & Co");
    expect(result.contextString).toContain('"het portaal"');
    expect(result.contextString).toContain('"klantplatform"');
    expect(result.projects).toHaveLength(1);
  });

  it("formats organizations with aliases", async () => {
    mockProjects.mockResolvedValue([]);
    mockOrgs.mockResolvedValue([{ id: "org-1", name: "Jansen & Co", aliases: ["Jansen"] }]);
    mockPeople.mockResolvedValue([]);

    const result = await buildEntityContext();

    expect(result.contextString).toContain("Bekende organisaties:");
    expect(result.contextString).toContain('"Jansen & Co"');
    expect(result.contextString).toContain('"Jansen"');
  });

  it("formats people with organization", async () => {
    mockProjects.mockResolvedValue([]);
    mockOrgs.mockResolvedValue([]);
    mockPeople.mockResolvedValue([
      { id: "p-1", name: "Pieter de Vries", organization_name: "Jansen & Co" },
    ]);

    const result = await buildEntityContext();

    expect(result.contextString).toContain("Bekende personen:");
    expect(result.contextString).toContain('"Pieter de Vries"');
    expect(result.contextString).toContain("organisatie: Jansen & Co");
  });

  it("returns empty string when no entities exist", async () => {
    mockProjects.mockResolvedValue([]);
    mockOrgs.mockResolvedValue([]);
    mockPeople.mockResolvedValue([]);

    const result = await buildEntityContext();

    expect(result.contextString).toBe("");
    expect(result.projects).toHaveLength(0);
  });

  it("combines all sections when all entities exist", async () => {
    mockProjects.mockResolvedValue([
      { id: "uuid-1", name: "Project A", aliases: [], organization_name: null },
    ]);
    mockOrgs.mockResolvedValue([{ id: "org-1", name: "Org A", aliases: [] }]);
    mockPeople.mockResolvedValue([{ id: "p-1", name: "Person A", organization_name: null }]);

    const result = await buildEntityContext();

    expect(result.contextString).toContain("Bekende projecten:");
    expect(result.contextString).toContain("Bekende organisaties:");
    expect(result.contextString).toContain("Bekende personen:");
  });

  it("handles project without aliases or organization", async () => {
    mockProjects.mockResolvedValue([
      { id: "uuid-1", name: "Solo Project", aliases: [], organization_name: null },
    ]);
    mockOrgs.mockResolvedValue([]);
    mockPeople.mockResolvedValue([]);

    const result = await buildEntityContext();

    expect(result.contextString).toContain('"Solo Project" (id: uuid-1)');
    expect(result.contextString).not.toContain("organisatie:");
    expect(result.contextString).not.toContain("aliassen:");
  });
});
