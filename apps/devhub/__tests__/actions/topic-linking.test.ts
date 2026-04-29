import { describe, it, expect, vi, beforeEach } from "vitest";
import { createNextCacheMock, resetNextMocks, getRevalidatePathCalls } from "../helpers/mock-next";

// Topic-pill / setIssueTopicAction — boundary-mocked unit tests.
// Mocks staan op de externe grenzen (auth, queries, mutations, next/cache);
// de actie-logica zelf draait echt. Zo testen we Zod-validatie,
// access-checks, cross-project-block en revalidatePath-aanroepen.

const IDS = {
  userId: "00000000-0000-4000-8000-000000000099",
  project: "00000000-0000-4000-8000-000000000002",
  projectB: "00000000-0000-4000-8000-000000000012",
  topic: "00000000-0000-4000-8000-000000000020",
  topicB: "00000000-0000-4000-8000-000000000021",
  issue: "00000000-0000-4000-8000-000000000009",
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

const mockGetIssueById = vi.fn();
vi.mock("@repo/database/queries/issues", () => ({
  getIssueById: (...args: unknown[]) => mockGetIssueById(...args),
  listIssues: vi.fn(),
}));

const mockGetTopicById = vi.fn();
const mockGetTopicMembershipForIssues = vi.fn();
vi.mock("@repo/database/queries/topics", () => ({
  getTopicById: (...args: unknown[]) => mockGetTopicById(...args),
  getTopicMembershipForIssues: (...args: unknown[]) => mockGetTopicMembershipForIssues(...args),
}));

const mockSetTopicForIssue = vi.fn();
vi.mock("@repo/database/mutations/topics", () => ({
  setTopicForIssue: (...args: unknown[]) => mockSetTopicForIssue(...args),
  insertTopic: vi.fn(),
  updateTopic: vi.fn(),
  deleteTopic: vi.fn(),
  updateTopicStatus: vi.fn(),
  linkIssueToTopic: vi.fn(),
  unlinkIssueFromTopic: vi.fn(),
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
  mockGetIssueById.mockReset();
  mockGetTopicById.mockReset();
  mockGetTopicMembershipForIssues.mockReset();
  mockSetTopicForIssue.mockReset();
  await setUser({ id: IDS.userId });
});

async function getAction() {
  const mod = await import("@/features/topics/actions/linking");
  return mod.setIssueTopicAction;
}

describe("setIssueTopicAction — auth & validatie", () => {
  it("geeft { error: 'Niet ingelogd' } zonder auth, geen DB-calls", async () => {
    await setUser(null);
    const action = await getAction();
    const result = await action({ issue_id: IDS.issue, topic_id: IDS.topic });

    expect(result).toEqual({ error: "Niet ingelogd" });
    expect(mockGetIssueById).not.toHaveBeenCalled();
    expect(mockSetTopicForIssue).not.toHaveBeenCalled();
  });

  it("geeft { error: ... } bij ongeldige Zod input (geen uuid), geen DB-calls", async () => {
    const action = await getAction();
    const result = await action({ issue_id: "not-a-uuid", topic_id: null });

    expect(result).toHaveProperty("error");
    expect(mockGetIssueById).not.toHaveBeenCalled();
    expect(mockSetTopicForIssue).not.toHaveBeenCalled();
  });
});

describe("setIssueTopicAction — issue-checks", () => {
  it("geeft { error: 'Issue niet gevonden' } als getIssueById null teruggeeft", async () => {
    mockGetIssueById.mockResolvedValue(null);
    const action = await getAction();
    const result = await action({ issue_id: IDS.issue, topic_id: IDS.topic });

    expect(result).toEqual({ error: "Issue niet gevonden" });
    expect(mockSetTopicForIssue).not.toHaveBeenCalled();
  });

  it("vertaalt NotAuthorizedError naar 'Issue niet gevonden' (info-leak guard)", async () => {
    mockGetIssueById.mockResolvedValue({ id: IDS.issue, project_id: IDS.project });
    mockAssertProjectAccess.mockRejectedValue(new MockNotAuthorizedError());

    const action = await getAction();
    const result = await action({ issue_id: IDS.issue, topic_id: IDS.topic });

    expect(result).toEqual({ error: "Issue niet gevonden" });
    expect(mockSetTopicForIssue).not.toHaveBeenCalled();
  });
});

describe("setIssueTopicAction — cross-project block", () => {
  it("geeft { error: 'Topic niet gevonden' } als topic in ander project zit, setTopicForIssue NIET aangeroepen", async () => {
    mockGetIssueById.mockResolvedValue({ id: IDS.issue, project_id: IDS.project });
    mockAssertProjectAccess.mockResolvedValue(undefined);
    // Topic B hoort bij projectB, niet bij project A van de issue
    mockGetTopicById.mockResolvedValue({ id: IDS.topicB, project_id: IDS.projectB });

    const action = await getAction();
    const result = await action({ issue_id: IDS.issue, topic_id: IDS.topicB });

    expect(result).toEqual({ error: "Topic niet gevonden" });
    expect(mockSetTopicForIssue).not.toHaveBeenCalled();
  });
});

describe("setIssueTopicAction — happy paths", () => {
  it("happy path met previousTopicId: setTopicForIssue aangeroepen, revalidatePath voor beide topics + issue-paden", async () => {
    const OLD_TOPIC = "00000000-0000-4000-8000-000000000020";
    const NEW_TOPIC = "00000000-0000-4000-8000-000000000021";

    mockGetIssueById.mockResolvedValue({ id: IDS.issue, project_id: IDS.project });
    mockAssertProjectAccess.mockResolvedValue(undefined);
    mockGetTopicById.mockResolvedValue({ id: NEW_TOPIC, project_id: IDS.project });
    // Issue was al gekoppeld aan OLD_TOPIC
    mockGetTopicMembershipForIssues.mockResolvedValue(
      new Map([[IDS.issue, { id: OLD_TOPIC, title: "Oud topic" }]]),
    );
    mockSetTopicForIssue.mockResolvedValue({
      success: true,
      data: { issue_id: IDS.issue, topic_id: NEW_TOPIC },
    });

    const action = await getAction();
    const result = await action({ issue_id: IDS.issue, topic_id: NEW_TOPIC });

    expect(result).toEqual({ success: true });

    // Correcte payload naar de DB-grens
    expect(mockSetTopicForIssue).toHaveBeenCalledWith(IDS.issue, NEW_TOPIC, IDS.userId, "manual");

    const paths = getRevalidatePathCalls();
    expect(paths).toContain("/issues");
    expect(paths).toContain(`/issues/${IDS.issue}`);
    expect(paths).toContain(`/topics/${OLD_TOPIC}`);
    expect(paths).toContain(`/topics/${NEW_TOPIC}`);
  });

  it("happy path zonder previous: revalidatePath voor nieuwe topic maar NIET voor een oud topic", async () => {
    mockGetIssueById.mockResolvedValue({ id: IDS.issue, project_id: IDS.project });
    mockAssertProjectAccess.mockResolvedValue(undefined);
    mockGetTopicById.mockResolvedValue({ id: IDS.topic, project_id: IDS.project });
    // Issue had nog geen topic
    mockGetTopicMembershipForIssues.mockResolvedValue(new Map());
    mockSetTopicForIssue.mockResolvedValue({
      success: true,
      data: { issue_id: IDS.issue, topic_id: IDS.topic },
    });

    const action = await getAction();
    const result = await action({ issue_id: IDS.issue, topic_id: IDS.topic });

    expect(result).toEqual({ success: true });

    const paths = getRevalidatePathCalls();
    expect(paths).toContain(`/topics/${IDS.topic}`);
    // Geen enkel pad met een oud topic (de enige topic-paden zijn het nieuwe topic)
    const topicPaths = paths.filter((p) => p.startsWith("/topics/"));
    expect(topicPaths).toEqual([`/topics/${IDS.topic}`]);
  });

  it("clear (topic_id = null): revalidatePath voor oud topic maar NIET voor een nieuw topic", async () => {
    const OLD_TOPIC = IDS.topic;

    mockGetIssueById.mockResolvedValue({ id: IDS.issue, project_id: IDS.project });
    mockAssertProjectAccess.mockResolvedValue(undefined);
    // topic_id = null: geen getTopicById call nodig
    mockGetTopicMembershipForIssues.mockResolvedValue(
      new Map([[IDS.issue, { id: OLD_TOPIC, title: "Oud topic" }]]),
    );
    mockSetTopicForIssue.mockResolvedValue({
      success: true,
      data: { issue_id: IDS.issue, topic_id: null },
    });

    const action = await getAction();
    const result = await action({ issue_id: IDS.issue, topic_id: null });

    expect(result).toEqual({ success: true });

    const paths = getRevalidatePathCalls();
    expect(paths).toContain(`/topics/${OLD_TOPIC}`);
    // Geen nieuw topic-pad (topic_id was null)
    const topicPaths = paths.filter((p) => p.startsWith("/topics/"));
    expect(topicPaths).toEqual([`/topics/${OLD_TOPIC}`]);
  });
});
