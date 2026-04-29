import { describe, it, expect, vi, beforeEach } from "vitest";
import { createNextCacheMock, resetNextMocks } from "../helpers/mock-next";

/**
 * PR-019 — Boundary-mocked tests voor de bulk-cluster-cleanup action.
 * Mocks: auth, queries, agent-call, en de DB-grens (`linkIssueToTopic` /
 * `insertTopic`). De accept-actions hergebruiken de bestaande
 * `linkIssueAction` / `createTopicAction` letterlijk — die draaien dus
 * mee in deze tests, zodat we ook borgen dat de hergebruik-keten klopt.
 */

const IDS = {
  user: "00000000-0000-4000-8000-000000000099",
  project: "00000000-0000-4000-8000-000000000002",
  projectOther: "00000000-0000-4000-8000-000000000003",
  topic: "00000000-0000-4000-8000-000000000020",
  topicVerdwenen: "00000000-0000-4000-8000-000000000021",
  newTopic: "00000000-0000-4000-8000-000000000022",
  issueA: "00000000-0000-4000-8000-000000000001",
  issueB: "00000000-0000-4000-8000-000000000002",
};

vi.mock("next/cache", () => createNextCacheMock());

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({})),
}));

vi.mock("@repo/auth/helpers", () => {
  let _user: { id: string } | null = null;
  return {
    getAuthenticatedUser: vi.fn(async () => _user),
    createPageClient: vi.fn(async () => ({})),
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
const mockListAccessibleProjectIds = vi.fn();
const mockAssertProjectAccess = vi.fn();
vi.mock("@repo/auth/access", () => ({
  NotAuthorizedError: MockNotAuthorizedError,
  listAccessibleProjectIds: (...args: unknown[]) => mockListAccessibleProjectIds(...args),
  assertProjectAccess: (...args: unknown[]) => mockAssertProjectAccess(...args),
}));

const mockListIssues = vi.fn();
vi.mock("@repo/database/queries/issues", () => ({
  listIssues: (...args: unknown[]) => mockListIssues(...args),
  getIssueById: vi.fn(),
}));

const mockListOpenTopicsForCluster = vi.fn();
const mockGetTopicById = vi.fn();
vi.mock("@repo/database/queries/topics", () => ({
  listOpenTopicsForCluster: (...args: unknown[]) => mockListOpenTopicsForCluster(...args),
  getTopicById: (...args: unknown[]) => mockGetTopicById(...args),
  getTopicMembershipForIssues: vi.fn(),
}));

const mockInsertTopic = vi.fn();
const mockLinkIssueToTopic = vi.fn();
vi.mock("@repo/database/mutations/topics", () => ({
  insertTopic: (...args: unknown[]) => mockInsertTopic(...args),
  linkIssueToTopic: (...args: unknown[]) => mockLinkIssueToTopic(...args),
  updateTopic: vi.fn(),
  deleteTopic: vi.fn(),
  updateTopicStatus: vi.fn(),
  unlinkIssueFromTopic: vi.fn(),
  setTopicForIssue: vi.fn(),
}));

const mockRunBulkClusterCleanup = vi.fn();
vi.mock("@repo/ai/agents/bulk-cluster-cleanup", () => ({
  runBulkClusterCleanup: (...args: unknown[]) => mockRunBulkClusterCleanup(...args),
}));

async function setUser(user: { id: string } | null) {
  const mod = (await import("@repo/auth/helpers")) as unknown as {
    __setMockUser: (u: { id: string } | null) => void;
  };
  mod.__setMockUser(user);
}

beforeEach(async () => {
  resetNextMocks();
  mockListAccessibleProjectIds.mockReset();
  mockAssertProjectAccess.mockReset();
  mockListIssues.mockReset();
  mockListOpenTopicsForCluster.mockReset();
  mockGetTopicById.mockReset();
  mockInsertTopic.mockReset();
  mockLinkIssueToTopic.mockReset();
  mockRunBulkClusterCleanup.mockReset();
  await setUser({ id: IDS.user });
});

async function getActions() {
  return await import("@/actions/bulk-cluster-cleanup");
}

describe("runBulkClusterCleanupAction — auth & access", () => {
  it("geeft 'Niet ingelogd' als geen user", async () => {
    await setUser(null);
    const { runBulkClusterCleanupAction } = await getActions();

    const result = await runBulkClusterCleanupAction({ projectId: IDS.project });

    expect(result).toEqual({ error: "Niet ingelogd" });
    expect(mockListIssues).not.toHaveBeenCalled();
    expect(mockRunBulkClusterCleanup).not.toHaveBeenCalled();
  });

  it("geeft 'Geen toegang' als project niet in accessible-list zit", async () => {
    mockListAccessibleProjectIds.mockResolvedValue([IDS.projectOther]);
    const { runBulkClusterCleanupAction } = await getActions();

    const result = await runBulkClusterCleanupAction({ projectId: IDS.project });

    expect(result).toEqual({ error: "Geen toegang tot dit project" });
    expect(mockListIssues).not.toHaveBeenCalled();
  });

  it("weigert ongeldige uuid", async () => {
    const { runBulkClusterCleanupAction } = await getActions();
    const result = await runBulkClusterCleanupAction({ projectId: "not-a-uuid" });
    expect(result).toEqual({ error: "Ongeldige invoer" });
  });
});

describe("runBulkClusterCleanupAction — happy & negative paths", () => {
  it("retourneert lege clusters als project geen ungrouped open issues heeft", async () => {
    mockListAccessibleProjectIds.mockResolvedValue([IDS.project]);
    mockListIssues.mockResolvedValue([]);

    const { runBulkClusterCleanupAction } = await getActions();
    const result = await runBulkClusterCleanupAction({ projectId: IDS.project });

    expect(result).toEqual({ clusters: [], droppedExpired: 0 });
    expect(mockRunBulkClusterCleanup).not.toHaveBeenCalled();
  });

  it("done-mode: filtert op status='done' i.p.v. open statuses", async () => {
    mockListAccessibleProjectIds.mockResolvedValue([IDS.project]);
    mockListIssues.mockResolvedValue([]);

    const { runBulkClusterCleanupAction } = await getActions();
    await runBulkClusterCleanupAction({ projectId: IDS.project, mode: "done" });

    expect(mockListIssues).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: IDS.project,
        status: ["done"],
        ungroupedOnly: true,
      }),
      expect.anything(),
    );
  });

  it("filtert ungrouped+open status hardgecodeerd, ongeacht meegegeven extra params", async () => {
    mockListAccessibleProjectIds.mockResolvedValue([IDS.project]);
    mockListIssues.mockResolvedValue([
      {
        id: IDS.issueA,
        title: "Foo",
        description: "x".repeat(600),
        issue_number: 1,
        ai_classification: { type: "bug" },
      },
    ]);
    mockListOpenTopicsForCluster.mockResolvedValue([]);
    mockRunBulkClusterCleanup.mockResolvedValue({ clusters: [] });

    const { runBulkClusterCleanupAction } = await getActions();
    await runBulkClusterCleanupAction({ projectId: IDS.project });

    expect(mockListIssues).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: IDS.project,
        status: ["triage", "backlog", "todo", "in_progress"],
        ungroupedOnly: true,
        limit: 200,
      }),
      expect.anything(),
    );

    // Description wordt op 400 chars geknipt
    const agentCall = mockRunBulkClusterCleanup.mock.calls[0][0] as {
      issues: Array<{ description: string | null }>;
    };
    expect(agentCall.issues[0].description).toHaveLength(400);
  });

  it("filtert match-clusters waarvan target-topic verdwenen is en telt droppedExpired", async () => {
    mockListAccessibleProjectIds.mockResolvedValue([IDS.project]);
    mockListIssues.mockResolvedValue([
      {
        id: IDS.issueA,
        title: "A",
        description: null,
        issue_number: 1,
        ai_classification: null,
      },
      {
        id: IDS.issueB,
        title: "B",
        description: null,
        issue_number: 2,
        ai_classification: null,
      },
    ]);
    mockListOpenTopicsForCluster.mockResolvedValue([
      { id: IDS.topic, title: "Wit scherm", description: null, type: "bug", status: "prioritized" },
    ]);
    mockRunBulkClusterCleanup.mockResolvedValue({
      clusters: [
        {
          kind: "match",
          match_topic_id: IDS.topic,
          issue_ids: [IDS.issueA],
          rationale: "Past op bestaand topic",
        },
        {
          kind: "match",
          match_topic_id: IDS.topicVerdwenen,
          issue_ids: [IDS.issueB],
          rationale: "Verdwenen",
        },
      ],
    });

    const { runBulkClusterCleanupAction } = await getActions();
    const result = await runBulkClusterCleanupAction({ projectId: IDS.project });

    expect("clusters" in result).toBe(true);
    if (!("clusters" in result)) return;
    expect(result.clusters).toHaveLength(1);
    expect(result.droppedExpired).toBe(1);
  });
});

describe("acceptClusterToExistingAction — hergebruik linkIssueAction", () => {
  it("roept linkIssueToTopic exact N keer aan met juiste payload", async () => {
    mockGetTopicById.mockResolvedValue({ id: IDS.topic, project_id: IDS.project });
    mockAssertProjectAccess.mockResolvedValue(undefined);
    mockLinkIssueToTopic.mockResolvedValue({ success: true, data: {} });

    const { acceptClusterToExistingAction } = await getActions();
    const result = await acceptClusterToExistingAction({
      topicId: IDS.topic,
      issueIds: [IDS.issueA, IDS.issueB],
    });

    expect(result).toEqual({ success: true, linked: 2 });
    expect(mockLinkIssueToTopic).toHaveBeenCalledTimes(2);
    expect(mockLinkIssueToTopic).toHaveBeenNthCalledWith(
      1,
      IDS.topic,
      IDS.issueA,
      IDS.user,
      "manual",
    );
    expect(mockLinkIssueToTopic).toHaveBeenNthCalledWith(
      2,
      IDS.topic,
      IDS.issueB,
      IDS.user,
      "manual",
    );
  });

  it("breekt af op eerste fout en propageert die error", async () => {
    mockGetTopicById.mockResolvedValue({ id: IDS.topic, project_id: IDS.project });
    mockAssertProjectAccess.mockResolvedValue(undefined);
    mockLinkIssueToTopic
      .mockResolvedValueOnce({ error: "Issue is al aan een topic gekoppeld; ontkoppel eerst." })
      .mockResolvedValueOnce({ success: true, data: {} });

    const { acceptClusterToExistingAction } = await getActions();
    const result = await acceptClusterToExistingAction({
      topicId: IDS.topic,
      issueIds: [IDS.issueA, IDS.issueB],
    });

    expect(result).toEqual({ error: expect.stringMatching(/al aan een topic gekoppeld/) });
    expect(mockLinkIssueToTopic).toHaveBeenCalledTimes(1);
  });
});

describe("acceptClusterAsNewAction — hergebruik createTopicAction + linkIssueAction", () => {
  it("maakt eerst het topic aan, dan N×link", async () => {
    mockAssertProjectAccess.mockResolvedValue(undefined);
    mockInsertTopic.mockResolvedValue({ success: true, data: { id: IDS.newTopic } });
    mockGetTopicById.mockResolvedValue({ id: IDS.newTopic, project_id: IDS.project });
    mockLinkIssueToTopic.mockResolvedValue({ success: true, data: {} });

    const { acceptClusterAsNewAction } = await getActions();
    const result = await acceptClusterAsNewAction({
      projectId: IDS.project,
      topicPayload: {
        title: "Nieuw cluster topic",
        description: "Beschrijving van het cluster",
        type: "bug",
      },
      issueIds: [IDS.issueA, IDS.issueB],
    });

    expect(result).toEqual({ success: true, topicId: IDS.newTopic, linked: 2 });
    expect(mockInsertTopic).toHaveBeenCalledTimes(1);
    expect(mockInsertTopic).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: IDS.project,
        title: "Nieuw cluster topic",
        type: "bug",
        created_by: IDS.user,
      }),
    );
    expect(mockLinkIssueToTopic).toHaveBeenCalledTimes(2);
  });

  it("propageert createTopic-error en linkt geen issues", async () => {
    mockAssertProjectAccess.mockResolvedValue(undefined);
    mockInsertTopic.mockResolvedValue({ error: "boom" });

    const { acceptClusterAsNewAction } = await getActions();
    const result = await acceptClusterAsNewAction({
      projectId: IDS.project,
      topicPayload: {
        title: "Nieuw cluster topic",
        description: "Beschrijving van het cluster",
        type: "feature",
      },
      issueIds: [IDS.issueA],
    });

    expect(result).toEqual({ error: "Topic aanmaken mislukt" });
    expect(mockLinkIssueToTopic).not.toHaveBeenCalled();
  });
});
