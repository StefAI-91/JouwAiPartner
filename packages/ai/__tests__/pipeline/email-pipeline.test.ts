import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/agents/email-classifier", () => ({
  runEmailClassifier: vi.fn(),
}));
vi.mock("../../src/pipeline/context-injection", () => ({
  buildEntityContext: vi.fn(),
}));
vi.mock("../../src/pipeline/entity-resolution", () => ({
  resolveOrganization: vi.fn(),
}));
vi.mock("@repo/database/mutations/emails", () => ({
  updateEmailClassification: vi.fn(),
  updateEmailSenderPerson: vi.fn(),
  linkEmailProject: vi.fn(),
}));
vi.mock("@repo/database/queries/people", () => ({
  findPeopleByEmails: vi.fn(),
}));
vi.mock("../../src/embeddings", () => ({
  embedText: vi.fn(),
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

import { processEmail } from "../../src/pipeline/email-pipeline";
import { runEmailClassifier } from "../../src/agents/email-classifier";
import { buildEntityContext } from "../../src/pipeline/context-injection";
import { resolveOrganization } from "../../src/pipeline/entity-resolution";
import {
  updateEmailClassification,
  updateEmailSenderPerson,
  linkEmailProject,
} from "@repo/database/mutations/emails";
import { findPeopleByEmails } from "@repo/database/queries/people";
import { embedText } from "../../src/embeddings";

const mockClassifier = runEmailClassifier as ReturnType<typeof vi.fn>;
const mockEntityContext = buildEntityContext as ReturnType<typeof vi.fn>;
const mockResolveOrg = resolveOrganization as ReturnType<typeof vi.fn>;
const mockUpdateClassification = updateEmailClassification as ReturnType<typeof vi.fn>;
const mockUpdateSenderPerson = updateEmailSenderPerson as ReturnType<typeof vi.fn>;
const mockLinkProject = linkEmailProject as ReturnType<typeof vi.fn>;
const mockFindPeople = findPeopleByEmails as ReturnType<typeof vi.fn>;
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
  mockEntityContext.mockResolvedValue({
    projects: [{ id: "proj-1", name: "Klantportaal" }],
    contextString: "Bekende projecten: Klantportaal",
  });
  mockClassifier.mockResolvedValue(classifierOutput);
  mockResolveOrg.mockResolvedValue({
    matched: true,
    organization_id: "org-1",
    match_type: "exact",
  });
  mockUpdateClassification.mockResolvedValue({ success: true });
  mockFindPeople.mockResolvedValue(new Map([["jan@klantbv.nl", "person-1"]]));
  mockUpdateSenderPerson.mockResolvedValue({ success: true });
  mockLinkProject.mockResolvedValue({ success: true });
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

  it("resolved organisatie en linkt aan email", async () => {
    setupHappyPath();

    const result = await processEmail(baseEmail);

    expect(mockResolveOrg).toHaveBeenCalledWith("Klant BV");
    expect(result.organization_id).toBe("org-1");
  });

  it("matcht sender person op basis van email adres", async () => {
    setupHappyPath();

    await processEmail(baseEmail);

    expect(mockFindPeople).toHaveBeenCalledWith(["jan@klantbv.nl"]);
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
    mockResolveOrg.mockRejectedValue(new Error("DB timeout"));

    const result = await processEmail(baseEmail);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Org resolution failed");
  });

  it("markeert email als processed ook bij classificatie-falen", async () => {
    mockEntityContext.mockResolvedValue({ projects: [], contextString: "" });
    mockClassifier.mockRejectedValue(new Error("AI call failed"));
    mockUpdateClassification.mockResolvedValue({ success: true });

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
