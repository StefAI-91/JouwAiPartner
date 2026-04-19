import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/mutations/meetings", () => ({
  linkAllMeetingProjects: vi.fn(),
}));
vi.mock("@repo/database/mutations/extractions", () => ({
  insertExtractions: vi.fn(),
  replaceMeetingExtractions: vi.fn(),
}));

import { saveStructuredExtractions } from "../../src/pipeline/save-extractions";
import { linkAllMeetingProjects } from "@repo/database/mutations/meetings";
import { replaceMeetingExtractions } from "@repo/database/mutations/extractions";
import type { MeetingStructurerOutput, Kernpunt } from "../../src/validations/meeting-structurer";
import type { IdentifiedProject } from "../../src/validations/gatekeeper";

const mockLinkProjects = linkAllMeetingProjects as ReturnType<typeof vi.fn>;
const mockReplaceExtractions = replaceMeetingExtractions as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

const MEETING_ID = "meeting-uuid-1";

/**
 * Haal de rows-payload uit de Nth call naar de `replaceMeetingExtractions`
 * boundary-mock. De mutation-signatuur is `(meetingId, rows)`, dus de rows
 * staan op index 1. Helper zodat tests asserten op wat er naar de DB gaat,
 * niet op interne call-vorm.
 */
function rowsFromCall(callIndex: number = 0) {
  const call = mockReplaceExtractions.mock.calls[callIndex];
  return call?.[1] as ReturnType<typeof makeRow>[];
}

// Type-alias zodat rowsFromCall() een zinnige return type heeft.
function makeRow() {
  return {} as {
    meeting_id: string;
    type: string;
    content: string;
    confidence: number;
    transcript_ref: string | null;
    metadata: Record<string, unknown>;
    project_id: string | null;
    embedding_stale: boolean;
    verification_status: string;
    follow_up_context?: string | null;
  };
}

function makeKernpunt(overrides: Partial<Kernpunt> = {}): Kernpunt {
  return {
    type: "decision",
    content: "Test besluit",
    theme: "Theme A",
    theme_project: "Project A",
    source_quote: "exacte quote",
    project: "Project A",
    confidence: 0.9,
    follow_up_context: null,
    reasoning: "Expliciete beslissing in transcript; Stef bevestigt besluit.",
    metadata: { status: "open" },
    ...overrides,
  };
}

function makeOutput(kernpunten: Kernpunt[]): MeetingStructurerOutput {
  return {
    briefing: "korte briefing",
    kernpunten,
    deelnemers: [],
    entities: { clients: [], people: [] },
  };
}

describe("saveStructuredExtractions", () => {
  it("links all identified projects with the meeting id", async () => {
    const projects: IdentifiedProject[] = [
      { project_name: "A", project_id: "proj-a", confidence: 0.9 },
    ];
    mockLinkProjects.mockResolvedValue({ linked: 1, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 0 });

    await saveStructuredExtractions(makeOutput([]), MEETING_ID, projects);

    expect(mockLinkProjects).toHaveBeenCalledWith(MEETING_ID, projects);
  });

  it("maps each kernpunt to its project_id via case-insensitive name lookup", async () => {
    const projects: IdentifiedProject[] = [
      { project_name: "CAI Studio", project_id: "proj-cai", confidence: 0.95 },
    ];
    mockLinkProjects.mockResolvedValue({ linked: 1, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 1 });

    await saveStructuredExtractions(
      makeOutput([makeKernpunt({ project: "cai studio" })]),
      MEETING_ID,
      projects,
    );

    const rows = rowsFromCall();
    expect(rows[0].project_id).toBe("proj-cai");
  });

  it("falls back to the highest-confidence resolved project when project is null", async () => {
    const projects: IdentifiedProject[] = [
      { project_name: "Low", project_id: "proj-low", confidence: 0.4 },
      { project_name: "High", project_id: "proj-high", confidence: 0.95 },
    ];
    mockLinkProjects.mockResolvedValue({ linked: 2, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 1 });

    await saveStructuredExtractions(
      makeOutput([makeKernpunt({ project: null, type: "risk", metadata: { severity: "high" } })]),
      MEETING_ID,
      projects,
    );

    const rows = rowsFromCall();
    expect(rows[0].project_id).toBe("proj-high");
  });

  it("personal action_item (scope='personal') always gets project_id null", async () => {
    const projects: IdentifiedProject[] = [
      { project_name: "A", project_id: "proj-a", confidence: 0.9 },
    ];
    mockLinkProjects.mockResolvedValue({ linked: 1, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 1 });

    await saveStructuredExtractions(
      makeOutput([
        makeKernpunt({
          type: "action_item",
          project: null,
          metadata: {
            scope: "personal",
            follow_up_contact: "Stef",
            category: "wachten_op_extern",
          },
        }),
      ]),
      MEETING_ID,
      projects,
    );

    const rows = rowsFromCall();
    expect(rows[0].project_id).toBeNull();
  });

  it("project name not in gatekeeper map → project_id null (no fabrication)", async () => {
    const projects: IdentifiedProject[] = [
      { project_name: "Alpha", project_id: "proj-alpha", confidence: 0.9 },
    ];
    mockLinkProjects.mockResolvedValue({ linked: 1, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 1 });

    await saveStructuredExtractions(
      makeOutput([makeKernpunt({ project: "Beta" })]),
      MEETING_ID,
      projects,
    );

    const rows = rowsFromCall();
    expect(rows[0].project_id).toBeNull();
  });

  it("contract: every row gets verification_status='draft' (AI-output never auto-verified)", async () => {
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 2 });

    await saveStructuredExtractions(
      makeOutput([makeKernpunt(), makeKernpunt({ type: "risk", metadata: { severity: "high" } })]),
      MEETING_ID,
      [],
    );

    const rows = rowsFromCall();
    for (const r of rows) expect(r.verification_status).toBe("draft");
  });

  it("contract: every row gets embedding_stale=true (re-embed worker picks them up)", async () => {
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 1 });

    await saveStructuredExtractions(makeOutput([makeKernpunt()]), MEETING_ID, []);

    expect(rowsFromCall()[0].embedding_stale).toBe(true);
  });

  it("contract: reasoning wordt 1-op-1 doorgegeven naar de DB-kolom", async () => {
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 1 });

    await saveStructuredExtractions(
      makeOutput([
        makeKernpunt({
          reasoning:
            "Expliciete waarschuwing door Wouter; 'ik ben bang dat'-formulering + concrete dreiging voor delivery.",
        }),
      ]),
      MEETING_ID,
      [],
    );

    const row = rowsFromCall()[0] as { reasoning: string | null };
    expect(row.reasoning).toBe(
      "Expliciete waarschuwing door Wouter; 'ik ben bang dat'-formulering + concrete dreiging voor delivery.",
    );
  });

  it("contract: ontbrekende reasoning (null) blijft null op de DB-row, zonder te crashen", async () => {
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 1 });

    await saveStructuredExtractions(
      makeOutput([makeKernpunt({ reasoning: null })]),
      MEETING_ID,
      [],
    );

    const row = rowsFromCall()[0] as { reasoning: string | null };
    expect(row.reasoning).toBeNull();
  });

  it("contract: source_quote is persisted as transcript_ref (no answer without source)", async () => {
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 1 });

    await saveStructuredExtractions(
      makeOutput([makeKernpunt({ source_quote: "Stef: dit is de quote" })]),
      MEETING_ID,
      [],
    );

    expect(rowsFromCall()[0].transcript_ref).toBe("Stef: dit is de quote");
  });

  it("persists per-type metadata fields (severity for risk, decided_by for decision, etc.)", async () => {
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 2 });

    await saveStructuredExtractions(
      makeOutput([
        makeKernpunt({
          type: "risk",
          metadata: { severity: "critical", category: "technical" },
        }),
        makeKernpunt({
          type: "decision",
          metadata: { status: "closed", decided_by: "Stef", impact_area: "scope" },
        }),
      ]),
      MEETING_ID,
      [],
    );

    const [riskRow, decisionRow] = rowsFromCall();
    expect(riskRow.metadata.severity).toBe("critical");
    expect(riskRow.metadata.category).toBe("technical");
    expect(decisionRow.metadata.status).toBe("closed");
    expect(decisionRow.metadata.decided_by).toBe("Stef");
    expect(decisionRow.metadata.impact_area).toBe("scope");
  });

  it("invalid metadata is logged but row is saved with cleaned metadata (err on keeping)", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 1 });

    await saveStructuredExtractions(
      makeOutput([
        makeKernpunt({
          type: "risk",
          metadata: { severity: "catastrophic" }, // not in enum
        }),
      ]),
      MEETING_ID,
      [],
    );

    expect(consoleSpy).toHaveBeenCalled();
    const row = rowsFromCall()[0];
    expect(row.type).toBe("risk");
    expect(row.metadata.severity).toBeUndefined();
    consoleSpy.mockRestore();
  });

  it("preserves theme and theme_project on metadata for harness/render diff use", async () => {
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 1 });

    await saveStructuredExtractions(
      makeOutput([makeKernpunt({ theme: "Authenticatie", theme_project: "CAI Studio" })]),
      MEETING_ID,
      [],
    );

    const row = rowsFromCall()[0];
    expect(row.metadata.theme).toBe("Authenticatie");
    expect(row.metadata.theme_project).toBe("CAI Studio");
  });

  it("returns extractions_saved=N and projects_linked=N on success", async () => {
    const projects: IdentifiedProject[] = [
      { project_name: "A", project_id: "proj-a", confidence: 0.9 },
    ];
    mockLinkProjects.mockResolvedValue({ linked: 1, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 3 });

    const result = await saveStructuredExtractions(
      makeOutput([makeKernpunt(), makeKernpunt(), makeKernpunt()]),
      MEETING_ID,
      projects,
    );

    expect(result.extractions_saved).toBe(3);
    expect(result.projects_linked).toBe(1);
  });

  it("returns extractions_saved=0 on replace error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockLinkProjects.mockResolvedValue({ linked: 1, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ error: "RPC failed" });

    const result = await saveStructuredExtractions(makeOutput([makeKernpunt()]), MEETING_ID, [
      { project_name: "A", project_id: "proj-a", confidence: 0.9 },
    ]);

    expect(result.extractions_saved).toBe(0);
    expect(result.projects_linked).toBe(1);
    consoleSpy.mockRestore();
  });

  it("empty kernpunten array → no replace call (err on keeping stale data), returns 0", async () => {
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });

    const result = await saveStructuredExtractions(makeOutput([]), MEETING_ID, []);

    expect(result.extractions_saved).toBe(0);
    expect(mockReplaceExtractions).not.toHaveBeenCalled();
  });

  it("accepts all 14 types — none get rejected by the save layer", async () => {
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 14 });

    const allTypes = [
      "action_item",
      "decision",
      "risk",
      "need",
      "commitment",
      "question",
      "signal",
      "context",
      "vision",
      "idea",
      "insight",
      "client_sentiment",
      "pricing_signal",
      "milestone",
    ] as const;

    await saveStructuredExtractions(
      makeOutput(allTypes.map((t) => makeKernpunt({ type: t, metadata: {} }))),
      MEETING_ID,
      [],
    );

    const rows = rowsFromCall();
    expect(rows).toHaveLength(14);
    expect(rows.map((r: { type: string }) => r.type)).toEqual([...allTypes]);
  });

  it("re-run on same meeting: replace mutation is called each time with the fresh rows (PW-QC-02 D4/QUAL-QC-010)", async () => {
    // Gedragstest voor idempotency: als de pipeline 2x draait op dezelfde
    // meeting, mag er niet gedupliceerd worden. De save-laag delegeert dit
    // aan `replaceMeetingExtractions` (DELETE+INSERT in één transactie),
    // dus de assertie is: elke run stuurt de volledige set door de boundary,
    // en de boundary krijgt exact één call per run (niet cumulatief).
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 2 });

    const output = makeOutput([makeKernpunt({ content: "A" }), makeKernpunt({ content: "B" })]);

    await saveStructuredExtractions(output, MEETING_ID, []);
    await saveStructuredExtractions(output, MEETING_ID, []);

    // Twee runs = twee replace-calls (niet één insert-call met 4 rows).
    expect(mockReplaceExtractions).toHaveBeenCalledTimes(2);

    // Beide calls kregen exact dezelfde set van 2 rijen — de save-laag
    // kopieert geen state tussen runs, wat betekent dat de DB-laag
    // (RPC) verantwoordelijk is voor het dedupen via DELETE+INSERT.
    expect(rowsFromCall(0)).toHaveLength(2);
    expect(rowsFromCall(1)).toHaveLength(2);
    expect(rowsFromCall(0).map((r) => r.content)).toEqual(["A", "B"]);
    expect(rowsFromCall(1).map((r) => r.content)).toEqual(["A", "B"]);
  });

  it("re-run: replace is called met de juiste meetingId als eerste arg (DELETE-scope is meeting-specific)", async () => {
    mockLinkProjects.mockResolvedValue({ linked: 0, errors: [] });
    mockReplaceExtractions.mockResolvedValue({ success: true, count: 1 });

    await saveStructuredExtractions(makeOutput([makeKernpunt()]), MEETING_ID, []);

    expect(mockReplaceExtractions).toHaveBeenCalledWith(MEETING_ID, expect.any(Array));
  });
});
