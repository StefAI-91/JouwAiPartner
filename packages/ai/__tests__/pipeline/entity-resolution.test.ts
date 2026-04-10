import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/queries/projects", () => ({
  getAllProjects: vi.fn(),
  matchProjectsByEmbedding: vi.fn(),
}));
vi.mock("@repo/database/queries/organizations", () => ({
  getAllOrganizations: vi.fn(),
}));
vi.mock("@repo/database/mutations/projects", () => ({
  updateProjectAliases: vi.fn(),
}));
vi.mock("../../src/embeddings", () => ({
  embedText: vi.fn(),
}));

import {
  resolveProject,
  resolveOrganization,
  resolveClientEntities,
} from "../../src/pipeline/entity-resolution";
import { getAllProjects, matchProjectsByEmbedding } from "@repo/database/queries/projects";
import { getAllOrganizations } from "@repo/database/queries/organizations";
import { updateProjectAliases } from "@repo/database/mutations/projects";
import { embedText } from "../../src/embeddings";

const mockGetAllProjects = getAllProjects as ReturnType<typeof vi.fn>;
const mockMatchByEmbedding = matchProjectsByEmbedding as ReturnType<typeof vi.fn>;
const mockGetAllOrgs = getAllOrganizations as ReturnType<typeof vi.fn>;
const mockUpdateAliases = updateProjectAliases as ReturnType<typeof vi.fn>;
const mockEmbedText = embedText as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveProject", () => {
  const projects = [
    { id: "proj-1", name: "Klantportaal", aliases: ["het portaal"] },
    { id: "proj-2", name: "AI Platform", aliases: ["ai-platform", "JAIP Platform"] },
    { id: "proj-3", name: "CRM", aliases: [] },
  ];

  it("exact name match retourneert { matched: true, match_type: 'exact' }", async () => {
    mockGetAllProjects.mockResolvedValue(projects);

    const result = await resolveProject("Klantportaal");

    expect(result.matched).toBe(true);
    expect(result.project_id).toBe("proj-1");
    expect(result.match_type).toBe("exact");
  });

  it("exact name match is case-insensitive", async () => {
    mockGetAllProjects.mockResolvedValue(projects);

    const result = await resolveProject("klantportaal");

    expect(result.matched).toBe(true);
    expect(result.project_id).toBe("proj-1");
  });

  it("substring match (>=4 chars) retourneert matched: true (impl gebruikt match_type 'exact')", async () => {
    mockGetAllProjects.mockResolvedValue(projects);

    // "portaal" is a substring of "Klantportaal" (>= 4 chars → substring matching active)
    const result = await resolveProject("portaal");

    expect(result.matched).toBe(true);
    expect(result.project_id).toBe("proj-1");
    // Note: implementatie groepeert substring onder "exact" match_type (geen "substring" in MatchResult)
    expect(result.match_type).toBe("exact");
  });

  it("alias match retourneert match_type: 'alias'", async () => {
    mockGetAllProjects.mockResolvedValue(projects);

    const result = await resolveProject("het portaal");

    expect(result.matched).toBe(true);
    expect(result.project_id).toBe("proj-1");
    expect(result.match_type).toBe("alias");
  });

  it("embedding similarity match retourneert match_type: 'embedding' met similarity score", async () => {
    mockGetAllProjects.mockResolvedValue(projects);
    mockEmbedText.mockResolvedValue([0.1, 0.2, 0.3]);
    mockMatchByEmbedding.mockResolvedValue([
      { id: "proj-1", name: "Klantportaal", aliases: ["het portaal"], similarity: 0.92 },
    ]);
    mockUpdateAliases.mockResolvedValue(undefined);

    const result = await resolveProject("Klantenportaal Applicatie");

    expect(result.matched).toBe(true);
    expect(result.match_type).toBe("embedding");
    expect(result.similarity).toBe(0.92);
    expect(result.project_id).toBe("proj-1");
  });

  it("embedding match voegt alias toe", async () => {
    mockGetAllProjects.mockResolvedValue(projects);
    mockEmbedText.mockResolvedValue([0.1, 0.2]);
    mockMatchByEmbedding.mockResolvedValue([
      { id: "proj-1", name: "Klantportaal", aliases: ["het portaal"], similarity: 0.9 },
    ]);
    mockUpdateAliases.mockResolvedValue(undefined);

    await resolveProject("Nieuw Portaal Naam");

    expect(mockUpdateAliases).toHaveBeenCalledWith("proj-1", ["het portaal", "Nieuw Portaal Naam"]);
  });

  it("geen match retourneert { matched: false }", async () => {
    mockGetAllProjects.mockResolvedValue(projects);
    mockEmbedText.mockResolvedValue([0.1, 0.2]);
    mockMatchByEmbedding.mockResolvedValue([]);

    const result = await resolveProject("Totaal Onbekend Project");

    expect(result.matched).toBe(false);
    expect(result.project_id).toBeNull();
    expect(result.match_type).toBe("none");
  });

  it("korte namen (<4 chars) slaan substring matching over", async () => {
    mockGetAllProjects.mockResolvedValue(projects);
    mockEmbedText.mockResolvedValue([0.1, 0.2]);
    mockMatchByEmbedding.mockResolvedValue([]);

    // "CRM" has 3 chars → substring matching is skipped.
    // "crm" is not a substring match because the length check (>=4) prevents it.
    // But searching for "CR" which is a substring of "CRM" should NOT match via substring
    // because "CRM".length < 4.
    const result = await resolveProject("CR");

    // "CR" doesn't exact-match any project, and substring is skipped for <4 char project names
    // → falls through to embedding, which returns no match
    expect(result.matched).toBe(false);
    expect(result.match_type).toBe("none");
  });

  it("exact match werkt nog wel voor korte namen", async () => {
    mockGetAllProjects.mockResolvedValue(projects);

    const result = await resolveProject("CRM");

    expect(result.matched).toBe(true);
    expect(result.match_type).toBe("exact");
  });
});

describe("resolveOrganization", () => {
  const orgs = [
    { id: "org-1", name: "Jansen & Co", aliases: ["Jansen"] },
    { id: "org-2", name: "Markant Internet", aliases: ["Markant", "markant bv"] },
  ];

  it("exact match op organisatie naam", async () => {
    mockGetAllOrgs.mockResolvedValue(orgs);

    const result = await resolveOrganization("Jansen & Co");

    expect(result.matched).toBe(true);
    expect(result.organization_id).toBe("org-1");
    expect(result.match_type).toBe("exact");
  });

  it("exact match is case-insensitive", async () => {
    mockGetAllOrgs.mockResolvedValue(orgs);

    const result = await resolveOrganization("jansen & co");

    expect(result.matched).toBe(true);
    expect(result.organization_id).toBe("org-1");
  });

  it("alias match op organisatie", async () => {
    mockGetAllOrgs.mockResolvedValue(orgs);

    const result = await resolveOrganization("Markant");

    expect(result.matched).toBe(true);
    expect(result.organization_id).toBe("org-2");
    expect(result.match_type).toBe("alias");
  });

  it("geen match retourneert { matched: false }", async () => {
    mockGetAllOrgs.mockResolvedValue(orgs);

    const result = await resolveOrganization("Onbekend BV");

    expect(result.matched).toBe(false);
    expect(result.organization_id).toBeNull();
    expect(result.match_type).toBe("none");
  });

  it("null input retourneert { matched: false }", async () => {
    const result = await resolveOrganization(null);

    expect(result.matched).toBe(false);
    expect(result.organization_id).toBeNull();
  });
});

describe("resolveClientEntities", () => {
  const orgs = [
    { id: "org-1", name: "Jansen & Co", aliases: ["Jansen"] },
    { id: "org-2", name: "Markant Internet", aliases: ["Markant"] },
  ];

  it("skipt namen in ignoredNames set", async () => {
    mockGetAllOrgs.mockResolvedValue(orgs);

    const ignored = new Set(["jansen & co"]);
    const result = await resolveClientEntities(["Jansen & Co"], ignored);

    expect(result.get("Jansen & Co")).toBeNull();
  });

  it("retourneert Map van naam→org_id voor gematchte clients", async () => {
    mockGetAllOrgs.mockResolvedValue(orgs);

    const result = await resolveClientEntities(["Jansen & Co", "Markant"]);

    expect(result.get("Jansen & Co")).toBe("org-1");
    expect(result.get("Markant")).toBe("org-2");
  });

  it("ongematchte namen krijgen null in de Map", async () => {
    mockGetAllOrgs.mockResolvedValue(orgs);

    const result = await resolveClientEntities(["Onbekend BV"]);

    expect(result.get("Onbekend BV")).toBeNull();
  });

  it("retourneert lege Map bij lege input", async () => {
    const result = await resolveClientEntities([]);

    expect(result.size).toBe(0);
    expect(mockGetAllOrgs).not.toHaveBeenCalled();
  });
});
