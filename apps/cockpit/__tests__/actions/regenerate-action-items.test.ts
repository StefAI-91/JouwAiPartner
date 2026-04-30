import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { mockAuthenticated, mockUnauthenticated, createServerMock } from "../helpers/mock-auth";
import { createNextCacheMock, resetNextMocks, getRevalidatePathCalls } from "../helpers/mock-next";

const IDS = {
  userId: "00000000-0000-4000-8000-000000000099",
  meetingId: "00000000-0000-4000-8000-000000000111",
  project: "00000000-0000-4000-8000-000000000002",
};

vi.mock("next/cache", () => createNextCacheMock());
vi.mock("@repo/database/supabase/server", () => createServerMock());

// `isAdmin` volgt hetzelfde pattern als de andere mocks in dit bestand:
// top-level `vi.fn()` zodat we 'm in `beforeEach` kunnen resetten en de
// default opnieuw kunnen zetten. Voorkomt mock-pollution wanneer een
// vorige test de `mockResolvedValueOnce`-queue heeft aangeraakt of door
// een time-out mid-execution gecancelled is (zie pre-push flakiness onder
// parallel turbo-load, sprint-doc 2026-04-29).
const mockIsAdmin = vi.fn();
vi.mock("@repo/auth/access", () => ({
  isAdmin: (...args: unknown[]) => mockIsAdmin(...args),
}));

// Q3b §3b: alleen externe grenzen mocken — de step + DB-queries.
const mockGetMeeting = vi.fn();
const mockGetKnownPeople = vi.fn();
vi.mock("@repo/database/queries/meetings", () => ({
  getMeetingForRegenerateRisks: (...args: unknown[]) => mockGetMeeting(...args),
}));
vi.mock("@repo/database/queries/people", () => ({
  getAllKnownPeople: (...args: unknown[]) => mockGetKnownPeople(...args),
}));

const mockRunStep = vi.fn();
vi.mock("@repo/ai/pipeline/steps/action-item-specialist", async () => {
  const actual = await vi.importActual<
    typeof import("@repo/ai/pipeline/steps/action-item-specialist")
  >("@repo/ai/pipeline/steps/action-item-specialist");
  return {
    ...actual,
    runActionItemSpecialistStep: (...args: unknown[]) => mockRunStep(...args),
  };
});

function makeMeeting(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: IDS.meetingId,
    title: "Sandra prospect",
    date: "2026-04-25",
    meeting_type: "sales",
    party_type: "external_lead",
    transcript: "Stef: ik stuur morgen offerte",
    transcript_elevenlabs: null,
    transcript_elevenlabs_named: null,
    raw_fireflies: {
      pipeline: {
        gatekeeper: {
          identified_projects: [
            { project_name: "Booktalk V2", project_id: IDS.project, confidence: 0.9 },
          ],
        },
      },
    },
    meeting_participants: [{ person: { name: "Stef" } }, { person: { name: "Sandra" } }],
    ...overrides,
  };
}

describe("regenerateActionItemsAction", () => {
  // Pre-warm de dynamic import één keer in beforeAll i.p.v. in elke test —
  // onder parallel turbo-load (9 packages tegelijk op Windows) kan de eerste
  // import van een Server Action ruim boven de 15s test-timeout duren door
  // I/O contention, wat test 1 deed flakey-falen en via mock-pollution test 2
  // mee de afgrond introk. beforeAll heeft default 60s setup-timeout en draait
  // één keer per file, dus de cost telt niet meer mee in per-test timeouts.
  let action: typeof import("@/features/meetings/actions/regenerate-action-items").regenerateActionItemsAction;

  // Timeout op 60s (default is 10s) — onder parallel turbo-load op Windows kan
  // de eerste import van een Server Action met @repo/ai-deps in z'n graph
  // makkelijk 20-40s duren door I/O contention.
  beforeAll(async () => {
    const mod = await import("@/features/meetings/actions/regenerate-action-items");
    action = mod.regenerateActionItemsAction;
  }, 60_000);

  beforeEach(() => {
    mockAuthenticated(IDS.userId);
    resetNextMocks();
    mockGetMeeting.mockReset();
    mockGetKnownPeople.mockReset();
    mockRunStep.mockReset();
    mockIsAdmin.mockReset();
    mockIsAdmin.mockResolvedValue(true); // default: admin, individuele tests overrulen
  });

  it("blokkeert ongeauthenticeerde gebruikers", async () => {
    mockUnauthenticated();
    const result = await action({ meetingId: IDS.meetingId });

    expect(result).toEqual({ error: "Niet ingelogd" });
    expect(mockRunStep).not.toHaveBeenCalled();
  });

  it("blokkeert non-admins", async () => {
    mockIsAdmin.mockResolvedValueOnce(false);
    const result = await action({ meetingId: IDS.meetingId });

    expect(result).toEqual({ error: "Geen toegang" });
    expect(mockRunStep).not.toHaveBeenCalled();
  });

  it("returnt 404-error als meeting niet bestaat", async () => {
    mockGetMeeting.mockResolvedValue(null);
    const result = await action({ meetingId: IDS.meetingId });

    expect(result).toEqual({ error: "Meeting niet gevonden" });
    expect(mockRunStep).not.toHaveBeenCalled();
  });

  it("returnt error als geen transcript beschikbaar is", async () => {
    mockGetMeeting.mockResolvedValue(
      makeMeeting({
        transcript: null,
        transcript_elevenlabs: null,
        transcript_elevenlabs_named: null,
      }),
    );
    mockGetKnownPeople.mockResolvedValue([]);
    const result = await action({ meetingId: IDS.meetingId });

    expect("error" in result).toBe(true);
    expect(mockRunStep).not.toHaveBeenCalled();
  });

  it("draait step met Fireflies-transcript (NIET named-first)", async () => {
    mockGetMeeting.mockResolvedValue(
      makeMeeting({
        transcript: "FIREFLIES",
        transcript_elevenlabs_named: "NAMED",
        transcript_elevenlabs: "RAW",
      }),
    );
    mockGetKnownPeople.mockResolvedValue([]);
    mockRunStep.mockResolvedValue(undefined);
    await action({ meetingId: IDS.meetingId });

    expect(mockRunStep).toHaveBeenCalledTimes(1);
    expect(mockRunStep.mock.calls[0][1]).toBe("FIREFLIES");
  });

  it("hergebruikt identified_projects uit raw_fireflies.pipeline.gatekeeper", async () => {
    mockGetMeeting.mockResolvedValue(makeMeeting());
    mockGetKnownPeople.mockResolvedValue([]);
    mockRunStep.mockResolvedValue(undefined);
    await action({ meetingId: IDS.meetingId });

    const identifiedProjects = mockRunStep.mock.calls[0][3];
    expect(identifiedProjects).toEqual([
      { project_name: "Booktalk V2", project_id: IDS.project, confidence: 0.9 },
    ]);
  });

  it("revalidate'd /meetings/[id], /review/[id] en /review na success", async () => {
    mockGetMeeting.mockResolvedValue(makeMeeting());
    mockGetKnownPeople.mockResolvedValue([]);
    mockRunStep.mockResolvedValue(undefined);
    const result = await action({ meetingId: IDS.meetingId });

    expect(result).toEqual({ success: true });
    const paths = getRevalidatePathCalls();
    expect(paths).toContain(`/meetings/${IDS.meetingId}`);
    expect(paths).toContain(`/review/${IDS.meetingId}`);
    expect(paths).toContain("/review");
  });

  it("returnt error wanneer step faalt", async () => {
    mockGetMeeting.mockResolvedValue(makeMeeting());
    mockGetKnownPeople.mockResolvedValue([]);
    mockRunStep.mockRejectedValue(new Error("boom"));
    const result = await action({ meetingId: IDS.meetingId });

    expect(result).toEqual({ error: "Action items regenereren mislukt: boom" });
  });
});
