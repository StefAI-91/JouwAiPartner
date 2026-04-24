import { describe, it, expect, vi, beforeEach } from "vitest";

// Q3b §3a: GRENS-mocks alleen. We mocken niet meer de pipeline-helpers
// (`buildEntityContext`, `resolveOrganization`) — die zijn intern. We mocken
// hun onderliggende DB-queries en de externe AI/embeddings, en testen het
// gecombineerde gedrag van `processEmail`.

vi.mock("../../src/agents/email-classifier", () => ({
  runEmailClassifier: vi.fn(),
}));
vi.mock("@repo/database/queries/projects", () => ({
  getActiveProjectsForContext: vi.fn(async () => []),
  getAllProjects: vi.fn(async () => []),
  matchProjectsByEmbedding: vi.fn(async () => []),
}));
vi.mock("@repo/database/mutations/projects", () => ({
  updateProjectAliases: vi.fn(async () => ({ success: true })),
}));
vi.mock("@repo/database/queries/organizations", () => ({
  getAllOrganizations: vi.fn(async () => []),
  findOrganizationIdByEmailDomain: vi.fn(async () => null),
}));
vi.mock("@repo/database/queries/people", () => ({
  getPeopleForContext: vi.fn(async () => []),
  findPeopleByEmails: vi.fn(async () => []),
  findPersonOrgByEmail: vi.fn(async () => null),
}));
vi.mock("@repo/database/mutations/emails", () => ({
  updateEmailClassification: vi.fn(async () => ({ success: true })),
  updateEmailSenderPerson: vi.fn(async () => ({ success: true })),
  linkEmailProject: vi.fn(async () => ({ success: true })),
}));
vi.mock("../../src/embeddings", () => ({
  embedText: vi.fn(async () => [0.1, 0.2, 0.3]),
}));
vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    })),
  })),
}));

import { processEmail } from "../../src/pipeline/email/core";
import { runEmailClassifier } from "../../src/agents/email-classifier";
import { getAllOrganizations } from "@repo/database/queries/organizations";
import { getActiveProjectsForContext } from "@repo/database/queries/projects";
import {
  updateEmailClassification,
  updateEmailSenderPerson,
  linkEmailProject,
} from "@repo/database/mutations/emails";
import { findPersonOrgByEmail } from "@repo/database/queries/people";
import { embedText } from "../../src/embeddings";

const mockClassifier = runEmailClassifier as ReturnType<typeof vi.fn>;
const mockGetAllOrgs = getAllOrganizations as ReturnType<typeof vi.fn>;
const mockGetActiveProjects = getActiveProjectsForContext as ReturnType<typeof vi.fn>;
const mockUpdateClassification = updateEmailClassification as ReturnType<typeof vi.fn>;
const mockUpdateSenderPerson = updateEmailSenderPerson as ReturnType<typeof vi.fn>;
const mockLinkProject = linkEmailProject as ReturnType<typeof vi.fn>;
const mockFindPersonOrg = findPersonOrgByEmail as ReturnType<typeof vi.fn>;
const mockEmbedText = embedText as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

const baseEmail = {
  id: "email-1",
  subject: "Project Update Q2",
  from_address: "jan@klantbv.nl",
  from_name: "Jan Klant",
  to_addresses: ["stef@jouwaipartner.nl"],
  date: "2026-04-10T10:00:00Z",
  body_text:
    "Beste team, hier is de update over het project. We hebben voortgang geboekt op alle fronten.",
  snippet: "Beste team, hier is de update...",
};

const classifierOutput = {
  relevance_score: 0.8,
  reason: "Relevant projectcommunicatie",
  organization_name: "Klant BV",
  identified_projects: [{ project_name: "Klantportaal", project_id: "proj-1", confidence: 0.9 }],
  email_type: "project_communication" as const,
  party_type: "client" as const,
};

function setupHappyPath() {
  // Echte resolveOrganization én buildEntityContext krijgen deze org binnen.
  mockGetAllOrgs.mockResolvedValue([{ id: "org-1", name: "Klant BV", aliases: [] }]);
  // Pipeline matched project_id tegen entityContext.projects → moet aanwezig zijn.
  mockGetActiveProjects.mockResolvedValue([
    { id: "proj-1", name: "Klantportaal", aliases: [], organization_name: "Klant BV" },
  ]);
  mockClassifier.mockResolvedValue(classifierOutput);
  mockFindPersonOrg.mockResolvedValue({ personId: "person-1", organizationId: "org-1" });
  mockEmbedText.mockResolvedValue([0.1, 0.2, 0.3]);
}

describe("processEmail", () => {
  it("classificeert email en slaat classificatie op in DB", async () => {
    setupHappyPath();

    const result = await processEmail(baseEmail);

    expect(mockClassifier).toHaveBeenCalled();
    expect(result.classifier).toBeDefined();
    expect(result.classifier!.relevance_score).toBe(0.8);
  });

  it("voert geen AI-extractie uit op e-mails (extraction disabled)", async () => {
    setupHappyPath();

    const result = await processEmail(baseEmail);

    // Pipeline resultaat mag geen extractor-velden meer hebben
    expect(result).not.toHaveProperty("extractor");
    expect(result).not.toHaveProperty("extractions_saved");
    // Classificatie blijft wel gebeuren
    expect(result.classifier).toBeDefined();
  });

  it("resolved organisatie via echte resolveOrganization en linkt aan email", async () => {
    setupHappyPath();

    const result = await processEmail(baseEmail);

    // Observable side-effect: organization_id is opgelost én doorgezet naar update.
    expect(result.organization_id).toBe("org-1");
    expect(mockUpdateClassification).toHaveBeenCalledWith(
      "email-1",
      expect.objectContaining({ organization_id: "org-1" }),
    );
  });

  it("matcht sender person op basis van email adres", async () => {
    setupHappyPath();

    await processEmail(baseEmail);

    expect(mockFindPersonOrg).toHaveBeenCalledWith("jan@klantbv.nl");
    expect(mockUpdateSenderPerson).toHaveBeenCalledWith("email-1", "person-1");
  });

  it("linkt projecten op basis van classifier output", async () => {
    setupHappyPath();

    const result = await processEmail(baseEmail);

    expect(mockLinkProject).toHaveBeenCalledWith("email-1", "proj-1", "ai");
    expect(result.projects_linked).toBe(1);
  });

  it("accumuleert errors in array ipv crashen", async () => {
    setupHappyPath();
    // `getAllOrganizations` wordt twee keer aangeroepen: eerst door
    // `buildEntityContext` (succes), daarna door `resolveOrganization` (fail).
    // Override beide volgordes expliciet.
    mockGetAllOrgs.mockReset();
    mockGetAllOrgs.mockResolvedValueOnce([]); // buildEntityContext
    mockGetAllOrgs.mockRejectedValueOnce(new Error("DB timeout")); // resolveOrganization

    const result = await processEmail(baseEmail);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes("Org resolution failed"))).toBe(true);
  });

  it("markeert email als processed ook bij classificatie-falen", async () => {
    mockClassifier.mockRejectedValue(new Error("AI call failed"));

    const result = await processEmail(baseEmail);

    expect(mockUpdateClassification).toHaveBeenCalledWith(
      "email-1",
      expect.objectContaining({
        is_processed: true,
        relevance_score: 0,
      }),
    );
    expect(result.errors.some((e) => e.includes("Classification failed"))).toBe(true);
  });

  it("retourneert EmailPipelineResult met alle stap-resultaten", async () => {
    setupHappyPath();

    const result = await processEmail(baseEmail);

    expect(result.emailId).toBe("email-1");
    expect(result.classifier).toBeDefined();
    expect(result.organization_id).toBe("org-1");
    expect(result.projects_linked).toBe(1);
    expect(result.embedded).toBe(true);
  });

  it("skipt embedding als text te kort is", async () => {
    setupHappyPath();

    const shortEmail = {
      ...baseEmail,
      subject: null,
      body_text: "kort",
      snippet: null,
    };

    const result = await processEmail(shortEmail);

    expect(result.embedded).toBe(false);
  });
});
