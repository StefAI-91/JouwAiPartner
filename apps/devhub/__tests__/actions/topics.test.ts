import { describe, it, expect, vi, beforeEach } from "vitest";
import { createNextCacheMock, resetNextMocks } from "../helpers/mock-next";

// PR-003 — boundary-mocked smoke-tests voor de Server Actions in
// `features/topics/`. Mocks staan op de externe grenzen
// (auth, queries, mutations, next/cache); de actie-logica zelf draait
// echt — zo testen we Zod-validatie, info-leak-handling en de plumbing
// naar de DB-laag zonder een DB nodig te hebben.

const IDS = {
  userId: "00000000-0000-4000-8000-000000000099",
  project: "00000000-0000-4000-8000-000000000002",
  topic: "00000000-0000-4000-8000-000000000020",
  topic2: "00000000-0000-4000-8000-000000000021",
  issue: "00000000-0000-4000-8000-000000000009",
  issue2: "00000000-0000-4000-8000-000000000022",
};

vi.mock("next/cache", () => createNextCacheMock());

// Voorkomt module-load-crash door admin-client (env-vars niet aanwezig in vitest).
vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({})),
}));

vi.mock("@repo/auth/helpers", () => {
  let _user: { id: string } | null = null;
  return {
    getAuthenticatedUser: vi.fn(async () => _user),
    __setMockUser: (user: { id: string } | null) => {
      _user = user;
    },
  };
});

class MockNotAuthorizedError extends Error {
  constructor(msg = "NotAuthorizedError") {
    super(msg);
    this.name = "NotAuthorizedError";
  }
}
const mockAssertProjectAccess = vi.fn();
vi.mock("@repo/auth/access", () => ({
  NotAuthorizedError: MockNotAuthorizedError,
  assertProjectAccess: (...args: unknown[]) => mockAssertProjectAccess(...args),
}));

const mockGetTopicById = vi.fn();
vi.mock("@repo/database/queries/topics", () => ({
  getTopicById: (...args: unknown[]) => mockGetTopicById(...args),
}));

const mockListIssues = vi.fn();
vi.mock("@repo/database/queries/issues", () => ({
  listIssues: (...args: unknown[]) => mockListIssues(...args),
}));

const mockInsertTopic = vi.fn();
const mockUpdateTopic = vi.fn();
const mockDeleteTopic = vi.fn();
const mockUpdateTopicStatus = vi.fn();
const mockLinkIssueToTopic = vi.fn();
const mockUnlinkIssueFromTopic = vi.fn();
vi.mock("@repo/database/mutations/topics", () => ({
  insertTopic: (...args: unknown[]) => mockInsertTopic(...args),
  updateTopic: (...args: unknown[]) => mockUpdateTopic(...args),
  deleteTopic: (...args: unknown[]) => mockDeleteTopic(...args),
  updateTopicStatus: (...args: unknown[]) => mockUpdateTopicStatus(...args),
  linkIssueToTopic: (...args: unknown[]) => mockLinkIssueToTopic(...args),
  unlinkIssueFromTopic: (...args: unknown[]) => mockUnlinkIssueFromTopic(...args),
}));

async function setUser(user: { id: string } | null) {
  const mod = (await import("@repo/auth/helpers")) as unknown as {
    __setMockUser: (u: { id: string } | null) => void;
  };
  mod.__setMockUser(user);
}

beforeEach(async () => {
  resetNextMocks();
  mockAssertProjectAccess.mockReset();
  mockGetTopicById.mockReset();
  mockListIssues.mockReset();
  mockInsertTopic.mockReset();
  mockUpdateTopic.mockReset();
  mockDeleteTopic.mockReset();
  mockUpdateTopicStatus.mockReset();
  mockLinkIssueToTopic.mockReset();
  mockUnlinkIssueFromTopic.mockReset();
  await setUser({ id: IDS.userId });
});

describe("createTopicAction", () => {
  async function getAction() {
    const mod = await import("@/features/topics/actions/topics");
    return mod.createTopicAction;
  }

  it("retourneert success+id bij valide payload", async () => {
    mockAssertProjectAccess.mockResolvedValue(undefined);
    mockInsertTopic.mockResolvedValue({ success: true, data: { id: IDS.topic } });

    const action = await getAction();
    const result = await action({
      project_id: IDS.project,
      title: "Knop X werkt niet",
      type: "bug",
    });

    expect(result).toEqual({ success: true, data: { id: IDS.topic } });
    expect(mockInsertTopic).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: IDS.project,
        title: "Knop X werkt niet",
        type: "bug",
        created_by: IDS.userId,
      }),
    );
  });

  it("weigert zonder auth", async () => {
    await setUser(null);
    const action = await getAction();
    const result = await action({
      project_id: IDS.project,
      title: "Test",
      type: "bug",
    });
    expect(result).toEqual({ error: "Niet ingelogd" });
    expect(mockInsertTopic).not.toHaveBeenCalled();
  });

  it("weigert ongeldige input zonder DB-call", async () => {
    const action = await getAction();
    const result = await action({
      project_id: "not-a-uuid",
      title: "to",
      type: "bug",
    });
    expect(result).toHaveProperty("error");
    expect(mockInsertTopic).not.toHaveBeenCalled();
  });

  it("vertaalt access-denied naar 'Topic niet gevonden' (info-leak guard)", async () => {
    mockAssertProjectAccess.mockRejectedValue(new MockNotAuthorizedError());
    const action = await getAction();
    const result = await action({
      project_id: IDS.project,
      title: "Test topic",
      type: "feature",
    });
    expect(result).toEqual({ error: "Topic niet gevonden" });
    expect(mockInsertTopic).not.toHaveBeenCalled();
  });
});

describe("updateTopicAction", () => {
  async function getAction() {
    const mod = await import("@/features/topics/actions/topics");
    return mod.updateTopicAction;
  }

  it("update title bij valide payload", async () => {
    mockGetTopicById.mockResolvedValue({ id: IDS.topic, project_id: IDS.project });
    mockAssertProjectAccess.mockResolvedValue(undefined);
    mockUpdateTopic.mockResolvedValue({ success: true, data: {} });

    const action = await getAction();
    const result = await action({ id: IDS.topic, title: "Aangepaste titel" });
    expect(result).toEqual({ success: true });
    expect(mockUpdateTopic).toHaveBeenCalledWith(
      IDS.topic,
      expect.objectContaining({ title: "Aangepaste titel" }),
    );
  });

  it("retourneert 'Topic niet gevonden' als id niet bestaat", async () => {
    mockGetTopicById.mockResolvedValue(null);
    const action = await getAction();
    const result = await action({ id: IDS.topic, title: "Anders" });
    expect(result).toEqual({ error: "Topic niet gevonden" });
    expect(mockUpdateTopic).not.toHaveBeenCalled();
  });

  it("vangt onverwachte throws (DB-errors uit getTopicById) als action-error", async () => {
    // Voorheen liet een throw uit `getTopicById` de Server Action via een
    // unhandled rejection naar de built-in Next.js global-error fallback
    // bubbelen ("This page couldn't load"). De action-wrapper vangt dat nu
    // op zodat de gebruiker een toast ziet i.p.v. een dichtgeklapte pagina.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetTopicById.mockRejectedValue(new Error("getTopicById failed: connection lost"));
    const action = await getAction();
    const result = await action({
      id: IDS.topic,
      resolution: "Probleem opgelost via een hotfix.",
    });
    expect(result).toEqual({
      error: "Er ging iets mis. Probeer het opnieuw of ververs de pagina.",
    });
    expect(mockUpdateTopic).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("updateTopicStatusAction", () => {
  async function getAction() {
    const mod = await import("@/features/topics/actions/topics");
    return mod.updateTopicStatusAction;
  }

  it("geeft wont_do_reason door aan de mutation", async () => {
    mockGetTopicById.mockResolvedValue({ id: IDS.topic, project_id: IDS.project });
    mockAssertProjectAccess.mockResolvedValue(undefined);
    mockUpdateTopicStatus.mockResolvedValue({ success: true, data: {} });

    const action = await getAction();
    const result = await action({
      id: IDS.topic,
      status: "wont_do",
      wont_do_reason: "Buiten scope na review met klant",
    });
    expect(result).toEqual({ success: true });
    expect(mockUpdateTopicStatus).toHaveBeenCalledWith(
      IDS.topic,
      "wont_do",
      expect.objectContaining({ wont_do_reason: "Buiten scope na review met klant" }),
    );
  });

  it("weigert onbekende status via Zod", async () => {
    const action = await getAction();
    const result = await action({ id: IDS.topic, status: "blocked" });
    expect(result).toHaveProperty("error");
    expect(mockUpdateTopicStatus).not.toHaveBeenCalled();
  });
});

describe("deleteTopicAction", () => {
  async function getAction() {
    const mod = await import("@/features/topics/actions/topics");
    return mod.deleteTopicAction;
  }

  it("propageert 'gekoppeld' error letterlijk (UX-relevant)", async () => {
    mockGetTopicById.mockResolvedValue({ id: IDS.topic, project_id: IDS.project });
    mockAssertProjectAccess.mockResolvedValue(undefined);
    mockDeleteTopic.mockResolvedValue({
      error: "Topic heeft 2 gekoppelde issue(s); ontkoppel eerst voor je het topic verwijdert.",
    });

    const action = await getAction();
    const result = await action({ id: IDS.topic });
    expect(result).toEqual(
      expect.objectContaining({
        error: expect.stringContaining("gekoppeld"),
      }),
    );
  });

  it("maskeert generieke DB-errors", async () => {
    mockGetTopicById.mockResolvedValue({ id: IDS.topic, project_id: IDS.project });
    mockAssertProjectAccess.mockResolvedValue(undefined);
    mockDeleteTopic.mockResolvedValue({ error: "constraint violation: unrelated thing" });

    const action = await getAction();
    const result = await action({ id: IDS.topic });
    expect(result).toEqual({ error: "Topic verwijderen mislukt" });
  });
});

describe("linkIssueAction / unlinkIssueAction", () => {
  async function getActions() {
    const mod = await import("@/features/topics/actions/linking");
    return mod;
  }

  it("linkIssueAction success geeft success terug en revalidate", async () => {
    mockGetTopicById.mockResolvedValue({ id: IDS.topic, project_id: IDS.project });
    mockAssertProjectAccess.mockResolvedValue(undefined);
    mockLinkIssueToTopic.mockResolvedValue({ success: true, data: {} });

    const { linkIssueAction } = await getActions();
    const result = await linkIssueAction({ topic_id: IDS.topic, issue_id: IDS.issue });
    expect(result).toEqual({ success: true });
    expect(mockLinkIssueToTopic).toHaveBeenCalledWith(IDS.topic, IDS.issue, IDS.userId, "manual");
  });

  it("linkIssueAction propageert UNIQUE-foutmelding letterlijk naar UI", async () => {
    mockGetTopicById.mockResolvedValue({ id: IDS.topic, project_id: IDS.project });
    mockAssertProjectAccess.mockResolvedValue(undefined);
    mockLinkIssueToTopic.mockResolvedValue({
      error: "Issue is al aan een topic gekoppeld; ontkoppel eerst.",
    });

    const { linkIssueAction } = await getActions();
    const result = await linkIssueAction({ topic_id: IDS.topic2, issue_id: IDS.issue });
    expect(result).toEqual({
      error: expect.stringMatching(/al aan een topic gekoppeld/i),
    });
  });

  it("unlinkIssueAction is success ongeacht of de link bestond", async () => {
    mockGetTopicById.mockResolvedValue({ id: IDS.topic, project_id: IDS.project });
    mockAssertProjectAccess.mockResolvedValue(undefined);
    mockUnlinkIssueFromTopic.mockResolvedValue({ success: true, data: {} });

    const { unlinkIssueAction } = await getActions();
    const result = await unlinkIssueAction({ topic_id: IDS.topic, issue_id: IDS.issue });
    expect(result).toEqual({ success: true });
  });
});

describe("searchProjectIssuesAction", () => {
  async function getAction() {
    const mod = await import("@/features/topics/actions/linking");
    return mod.searchProjectIssuesAction;
  }

  it("retourneert max 50 issues, projecteert op picker-shape", async () => {
    mockAssertProjectAccess.mockResolvedValue(undefined);
    mockListIssues.mockResolvedValue([
      { id: IDS.issue, title: "Eerste", status: "triage", issue_number: 1, foo: "extra" },
      { id: IDS.issue2, title: "Tweede", status: "todo", issue_number: 2, foo: "extra" },
    ]);

    const action = await getAction();
    const result = await action({ project_id: IDS.project, q: "knop" });
    expect(result).toEqual({
      data: [
        { id: IDS.issue, title: "Eerste", status: "triage", issue_number: 1 },
        { id: IDS.issue2, title: "Tweede", status: "todo", issue_number: 2 },
      ],
    });
    expect(mockListIssues).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: IDS.project, search: "knop", limit: 50 }),
    );
  });
});
