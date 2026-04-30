/**
 * Behavior tests voor de rapportage MCP-tools (issues + project-report).
 *
 * Deze tests raken bewust NIET de DB — de query-functies in
 * `@repo/database/queries/reports` zijn gemocked op module-grens. Wat we
 * wél testen:
 *
 *  1. Tripwire: de 4 nieuwe tools zijn geregistreerd.
 *     Stille verwijdering van een tool zou Claude Desktop breken zonder
 *     dat iemand het ziet tot een klant vraagt om een rapport.
 *
 *  2. Output-contract: bij bekende input geeft elke tool markdown met de
 *     structurele elementen die de Claude Desktop skill verwacht (titels,
 *     secties, namen van mensen ipv UUIDs).
 *
 *  3. Edge cases: lege resultaten worden als leesbare tekst geretourneerd,
 *     niet als lege lijst — zodat Claude in het rapport kan zeggen "er is
 *     niks gebeurd" ipv te hallucineren.
 *
 * We asserten GEEN exact format. De skill-prompt stuurt de schrijfstijl, de
 * tools leveren alleen de ruwe feiten. Tests checken aanwezigheid van
 * feiten, niet de prozavolgorde.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
}));

vi.mock("@repo/database/queries/reports", () => ({
  getProjectIssuesForReport: vi.fn(),
  getIssueDetailForReport: vi.fn(),
  getProjectActivityForReport: vi.fn(),
  getProjectContextForReport: vi.fn(),
}));

import {
  getProjectIssuesForReport,
  getIssueDetailForReport,
  getProjectActivityForReport,
  getProjectContextForReport,
  type IssueDetailReport,
  type IssueReportRow,
  type ProjectActivityEvent,
  type ProjectContextReport,
} from "@repo/database/queries/reports";
import { registerIssueTools } from "../../src/tools/issues";
import { registerProjectReportTools } from "../../src/tools/project-report";
import { captureToolHandlers, getText } from "./_helpers";

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const ISSUE_ID = "22222222-2222-2222-2222-222222222222";

function makeIssue(overrides: Partial<IssueReportRow>): IssueReportRow {
  return {
    id: ISSUE_ID,
    issue_number: 1,
    title: "Voorbeeld issue",
    description: null,
    type: "bug",
    status: "triage",
    priority: "p2",
    component: null,
    severity: null,
    labels: [],
    source: "manual",
    source_url: null,
    reporter_name: null,
    reporter_email: null,
    assigned_to_id: null,
    assigned_to_name: null,
    created_at: "2026-04-10T10:00:00Z",
    updated_at: "2026-04-10T10:00:00Z",
    closed_at: null,
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Tripwire: registratie
// ────────────────────────────────────────────────────────────────────────────

describe("report-tools registratie", () => {
  it("registreert get_project_issues en get_issue_detail", () => {
    const handlers = captureToolHandlers(registerIssueTools);
    expect(handlers["get_project_issues"]).toBeDefined();
    expect(handlers["get_issue_detail"]).toBeDefined();
  });

  it("registreert get_project_activity en get_project_context", () => {
    const handlers = captureToolHandlers(registerProjectReportTools);
    expect(handlers["get_project_activity"]).toBeDefined();
    expect(handlers["get_project_context"]).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// get_project_issues
// ────────────────────────────────────────────────────────────────────────────

describe("get_project_issues", () => {
  const handlers = captureToolHandlers(registerIssueTools);
  const handler = handlers["get_project_issues"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourneert expliciete 'geen issues gevonden' tekst bij leeg resultaat", async () => {
    vi.mocked(getProjectIssuesForReport).mockResolvedValue({ rows: [], totalCount: 0 });

    const result = await handler({
      project_id: PROJECT_ID,
      days_back: 14,
      include_description: true,
      limit: 25,
      offset: 0,
    });
    const text = getText(result);

    expect(text).toMatch(/geen issues gevonden/i);
    expect(text).toContain("14 dagen");
  });

  it("groepeert issues per status en toont totalen", async () => {
    vi.mocked(getProjectIssuesForReport).mockResolvedValue({
      rows: [
        makeIssue({ issue_number: 142, title: "Login bug iOS", status: "in_progress" }),
        makeIssue({
          issue_number: 139,
          title: "Upload bug",
          status: "done",
          closed_at: "2026-04-18T10:00:00Z",
        }),
        makeIssue({ issue_number: 141, title: "Push notif", status: "todo" }),
      ],
      totalCount: 3,
    });

    const result = await handler({
      project_id: PROJECT_ID,
      days_back: 14,
      include_description: true,
      limit: 25,
      offset: 0,
    });
    const text = getText(result);

    expect(text).toMatch(/issues 1-3 van 3/);
    expect(text).toMatch(/2 actief/);
    expect(text).toMatch(/1 afgerond/);
    expect(text).toContain("## Te doen (1)");
    expect(text).toContain("## In behandeling (1)");
    expect(text).toContain("## Afgerond (1)");
    expect(text).toContain("#142: Login bug iOS");
    expect(text).toContain("#139: Upload bug");
    expect(text).toContain("#141: Push notif");
    expect(text).toContain("EINDE");
  });

  it("toont NEXT_PAGE hint als er meer issues zijn dan de pagina toont", async () => {
    vi.mocked(getProjectIssuesForReport).mockResolvedValue({
      rows: [makeIssue({ issue_number: 1 }), makeIssue({ issue_number: 2 })],
      totalCount: 10,
    });

    const result = await handler({
      project_id: PROJECT_ID,
      days_back: 14,
      include_description: true,
      limit: 2,
      offset: 0,
    });
    const text = getText(result);

    expect(text).toMatch(/issues 1-2 van 10/);
    expect(text).toContain("NEXT_PAGE");
    expect(text).toMatch(/offset: 2/);
    expect(text).not.toContain("EINDE");
  });

  it("toont 'Niemand' voor niet-toegewezen issues (nooit UUIDs)", async () => {
    vi.mocked(getProjectIssuesForReport).mockResolvedValue({
      rows: [makeIssue({ issue_number: 10, assigned_to_id: null, assigned_to_name: null })],
      totalCount: 1,
    });

    const result = await handler({
      project_id: PROJECT_ID,
      days_back: 14,
      include_description: true,
      limit: 25,
      offset: 0,
    });
    const text = getText(result);

    expect(text).toContain("Assigned: Niemand");
    // UUIDs mogen nooit naar buiten lekken
    expect(text).not.toContain(ISSUE_ID);
  });

  it("toont volledige naam van de assigned persoon", async () => {
    vi.mocked(getProjectIssuesForReport).mockResolvedValue({
      rows: [
        makeIssue({
          issue_number: 10,
          assigned_to_id: "uuid-1",
          assigned_to_name: "Wouter Banninga",
        }),
      ],
      totalCount: 1,
    });

    const result = await handler({
      project_id: PROJECT_ID,
      days_back: 14,
      include_description: true,
      limit: 25,
      offset: 0,
    });
    const text = getText(result);

    expect(text).toContain("Assigned: Wouter Banninga");
    expect(text).not.toContain("uuid-1");
  });

  it("laat descriptions weg als include_description=false", async () => {
    vi.mocked(getProjectIssuesForReport).mockResolvedValue({
      rows: [
        makeIssue({
          issue_number: 10,
          description: "Geheime implementatiedetails",
        }),
      ],
      totalCount: 1,
    });

    const result = await handler({
      project_id: PROJECT_ID,
      days_back: 14,
      include_description: false,
      limit: 25,
      offset: 0,
    });
    const text = getText(result);

    expect(text).not.toContain("Geheime implementatiedetails");
    expect(text).not.toContain("**Beschrijving:**");
  });

  it("geeft descriptions terug als include_description=true", async () => {
    vi.mocked(getProjectIssuesForReport).mockResolvedValue({
      rows: [
        makeIssue({
          issue_number: 10,
          description: "Gebruiker kan niet inloggen op iOS 17.4",
        }),
      ],
      totalCount: 1,
    });

    const result = await handler({
      project_id: PROJECT_ID,
      days_back: 14,
      include_description: true,
      limit: 25,
      offset: 0,
    });
    const text = getText(result);

    expect(text).toContain("**Beschrijving:**");
    expect(text).toContain("Gebruiker kan niet inloggen op iOS 17.4");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// get_issue_detail
// ────────────────────────────────────────────────────────────────────────────

describe("get_issue_detail", () => {
  const handlers = captureToolHandlers(registerIssueTools);
  const handler = handlers["get_issue_detail"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourneert 'niet gevonden' als het issue niet bestaat", async () => {
    vi.mocked(getIssueDetailForReport).mockResolvedValue(null);

    const result = await handler({ issue_id: ISSUE_ID });
    const text = getText(result);

    expect(text).toMatch(/niet gevonden/i);
  });

  it("toont issue-meta, project, comments en activity met namen", async () => {
    const detail: IssueDetailReport = {
      ...makeIssue({
        issue_number: 142,
        title: "Login mislukt",
        status: "in_progress",
        priority: "p1",
        description: "Gebruikers kunnen niet inloggen op iOS 17.4",
        reporter_name: "Lisa Jansen",
        reporter_email: "lisa@acme.nl",
        assigned_to_name: "Wouter Banninga",
      }),
      project: { id: "p1", name: "Loyalty App", organization_name: "Acme Retail" },
      comments: [
        {
          author_name: "Wouter Banninga",
          body: "Ik kijk er vanmiddag naar.",
          created_at: "2026-04-16T14:00:00Z",
        },
      ],
      activity: [
        {
          actor_name: "Wouter Banninga",
          action: "status_changed",
          field: "status",
          old_value: "triage",
          new_value: "in_progress",
          created_at: "2026-04-16T14:33:00Z",
          metadata: null,
        },
      ],
    };
    vi.mocked(getIssueDetailForReport).mockResolvedValue(detail);

    const result = await handler({ issue_id: ISSUE_ID });
    const text = getText(result);

    expect(text).toContain("#142: Login mislukt");
    expect(text).toContain("Loyalty App");
    expect(text).toContain("Acme Retail");
    expect(text).toContain("Lisa Jansen");
    expect(text).toContain("lisa@acme.nl");
    expect(text).toContain("Wouter Banninga");
    // Comments sectie
    expect(text).toContain("## Comments (1)");
    expect(text).toContain("Ik kijk er vanmiddag naar.");
    // Activity sectie met old → new
    expect(text).toContain("## Activity (1)");
    expect(text).toMatch(/status: triage → in_progress/);
  });

  it("toont 'geen comments / geen activity' bij leeg detail", async () => {
    const detail: IssueDetailReport = {
      ...makeIssue({ issue_number: 5 }),
      project: null,
      comments: [],
      activity: [],
    };
    vi.mocked(getIssueDetailForReport).mockResolvedValue(detail);

    const result = await handler({ issue_id: ISSUE_ID });
    const text = getText(result);

    expect(text).toContain("## Comments (0)");
    expect(text).toContain("Geen comments");
    expect(text).toContain("## Activity (0)");
    expect(text).toContain("Geen activity");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// get_project_activity
// ────────────────────────────────────────────────────────────────────────────

describe("get_project_activity", () => {
  const handlers = captureToolHandlers(registerProjectReportTools);
  const handler = handlers["get_project_activity"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourneert expliciete tekst bij geen events", async () => {
    vi.mocked(getProjectActivityForReport).mockResolvedValue({ rows: [], totalCount: 0 });

    const result = await handler({
      project_id: PROJECT_ID,
      days_back: 14,
      limit: 150,
      offset: 0,
    });
    const text = getText(result);

    expect(text).toMatch(/geen activity/i);
  });

  it("groepeert events per dag en toont actor-namen", async () => {
    const events: ProjectActivityEvent[] = [
      {
        issue_id: "i1",
        issue_number: 142,
        issue_title: "Login mislukt",
        actor_name: "Wouter Banninga",
        action: "status_changed",
        field: "status",
        old_value: "triage",
        new_value: "in_progress",
        created_at: "2026-04-19T14:33:00Z",
      },
      {
        issue_id: "i2",
        issue_number: 139,
        issue_title: "Upload bug",
        actor_name: "Ege Yıldız",
        action: "closed",
        field: "status",
        old_value: "in_progress",
        new_value: "done",
        created_at: "2026-04-18T09:00:00Z",
      },
    ];
    vi.mocked(getProjectActivityForReport).mockResolvedValue({
      rows: events,
      totalCount: events.length,
    });

    const result = await handler({
      project_id: PROJECT_ID,
      days_back: 14,
      limit: 150,
      offset: 0,
    });
    const text = getText(result);

    // Beide dagen als headers
    expect(text).toMatch(/## 19-04-2026/);
    expect(text).toMatch(/## 18-04-2026/);
    // Actor-namen
    expect(text).toContain("Wouter Banninga");
    expect(text).toContain("Ege Yıldız");
    // Issue-referentie
    expect(text).toContain('#142 "Login mislukt"');
    expect(text).toContain('#139 "Upload bug"');
    // Status-wijziging formatting
    expect(text).toMatch(/triage → in_progress/);
    expect(text).toContain("EINDE");
  });

  it("toont NEXT_PAGE hint als er meer events zijn dan de pagina toont", async () => {
    vi.mocked(getProjectActivityForReport).mockResolvedValue({
      rows: [
        {
          issue_id: "i1",
          issue_number: 1,
          issue_title: "X",
          actor_name: "A",
          action: "classified",
          field: null,
          old_value: null,
          new_value: null,
          created_at: "2026-04-19T14:33:00Z",
        },
      ],
      totalCount: 200,
    });

    const result = await handler({
      project_id: PROJECT_ID,
      days_back: 14,
      limit: 1,
      offset: 0,
    });
    const text = getText(result);

    expect(text).toMatch(/events 1-1 van 200/);
    expect(text).toContain("NEXT_PAGE");
    expect(text).toMatch(/offset: 1/);
  });

  it("gebruikt 'Systeem' als er geen actor is (ipv UUID of null)", async () => {
    vi.mocked(getProjectActivityForReport).mockResolvedValue({
      rows: [
        {
          issue_id: "i1",
          issue_number: 10,
          issue_title: "Test",
          actor_name: null,
          action: "classified",
          field: null,
          old_value: null,
          new_value: null,
          created_at: "2026-04-19T14:33:00Z",
        },
      ],
      totalCount: 1,
    });

    const result = await handler({
      project_id: PROJECT_ID,
      days_back: 14,
      limit: 150,
      offset: 0,
    });
    const text = getText(result);

    expect(text).not.toContain("null");
    expect(text).toMatch(/geclassificeerd|Systeem/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// get_project_context
// ────────────────────────────────────────────────────────────────────────────

describe("get_project_context", () => {
  const handlers = captureToolHandlers(registerProjectReportTools);
  const handler = handlers["get_project_context"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourneert 'niet gevonden' bij onbekend project-id", async () => {
    vi.mocked(getProjectContextForReport).mockResolvedValue(null);

    const result = await handler({ project_id: PROJECT_ID });
    const text = getText(result);

    expect(text).toMatch(/niet gevonden/i);
  });

  it("toont project-naam, organisatie, owner, contactpersoon en AI-samenvattingen", async () => {
    const context: ProjectContextReport = {
      id: PROJECT_ID,
      name: "Loyalty App",
      status: "active",
      start_date: "2025-11-15",
      deadline: "2026-06-30",
      description: "Customer retention platform voor Acme",
      organization: { id: "o1", name: "Acme Retail B.V." },
      owner_name: "Wouter Banninga",
      contact_name: "Lisa Jansen",
      contact_email: "lisa@acme.nl",
      summaries: {
        context: "De Loyalty App is een customer retention platform.",
        briefing: "Deze sprint werken we aan stabiliteit van de login-flow.",
      },
    };
    vi.mocked(getProjectContextForReport).mockResolvedValue(context);

    const result = await handler({ project_id: PROJECT_ID });
    const text = getText(result);

    expect(text).toContain("# Loyalty App");
    expect(text).toContain("Acme Retail B.V.");
    expect(text).toContain("Wouter Banninga");
    expect(text).toContain("Lisa Jansen");
    expect(text).toContain("lisa@acme.nl");
    expect(text).toContain("Customer retention platform voor Acme");
    expect(text).toContain("Huidige context (AI-samenvatting)");
    expect(text).toContain("De Loyalty App is een customer retention platform.");
    expect(text).toContain("## Briefing");
    expect(text).toContain("Deze sprint werken we aan stabiliteit van de login-flow.");
  });

  it("waarschuwt als er geen AI-samenvattingen zijn (voorkomt hallucinaties)", async () => {
    const context: ProjectContextReport = {
      id: PROJECT_ID,
      name: "Test Project",
      status: "lead",
      start_date: null,
      deadline: null,
      description: null,
      organization: null,
      owner_name: null,
      contact_name: null,
      contact_email: null,
      summaries: { context: null, briefing: null },
    };
    vi.mocked(getProjectContextForReport).mockResolvedValue(context);

    const result = await handler({ project_id: PROJECT_ID });
    const text = getText(result);

    expect(text).toMatch(/geen AI-samenvattingen/i);
    expect(text).toMatch(/puur op issue-data/i);
  });
});
