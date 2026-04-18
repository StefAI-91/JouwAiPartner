import { describe, it, expect } from "vitest";
import { renderMeetingSummary } from "../../src/agents/render-summary";
import { formatSummary } from "../../src/agents/summarizer";
import type { MeetingStructurerOutput } from "../../src/validations/meeting-structurer";
import type { SummarizerOutput } from "../../src/validations/summarizer";

/**
 * Deze test vergrendelt het contract: voor een gegeven structured input
 * moet de nieuwe renderer dezelfde markdown produceren als wat de
 * legacy summarizer + formatSummary zou hebben opgeleverd voor de
 * equivalente input. Anders breken downstream consumers (segment-builder,
 * embed-pipeline, MCP-tools) zodra de feature flag aan gaat.
 */

describe("renderMeetingSummary — markdown matches legacy formatSummary shape", () => {
  it("produces an identical 3-section structure for a real-shape meeting", () => {
    const structured: MeetingStructurerOutput = {
      briefing: "Stef en Wouter bespraken auth + deploy voor CAI Studio.",
      kernpunten: [
        {
          type: "decision",
          content: "Supabase Auth wordt gebruikt voor CAI Studio.",
          theme: "Authenticatie",
          theme_project: "CAI Studio",
          source_quote: "We gaan met Supabase Auth werken.",
          project: "CAI Studio",
          confidence: 0.95,
          metadata: { status: "open", decided_by: "Stef", impact_area: "technical" },
        },
        {
          type: "risk",
          content: "Migratie van bestaande gebruikers nog onduidelijk.",
          theme: "Authenticatie",
          theme_project: "CAI Studio",
          source_quote: "Maar hoe migreren we bestaande users?",
          project: "CAI Studio",
          confidence: 0.8,
          metadata: { severity: "medium", category: "technical" },
        },
        {
          type: "signal",
          content: "Credentials nog niet binnen bij Joris.",
          theme: "Deploy",
          theme_project: "CAI Studio",
          source_quote: "Joris heeft de credentials nog niet aangeleverd.",
          project: "CAI Studio",
          confidence: 0.9,
          metadata: { direction: "concerning", domain: "client" },
        },
        {
          type: "action_item",
          content: "Joris navragen of de credentials binnen zijn",
          theme: "Deploy",
          theme_project: "CAI Studio",
          source_quote: "We moeten Joris er nog achteraan",
          project: "CAI Studio",
          confidence: 0.95,
          metadata: {
            category: "wachten_op_extern",
            follow_up_contact: "Joris",
            assignee: "Wouter",
            deadline: "2026-04-22",
            suggested_deadline: null,
            effort_estimate: "small",
            deadline_reasoning: "Expliciet genoemd",
            scope: "project",
          },
        },
      ],
      deelnemers: [
        { name: "Stef", role: "Lead", organization: "JAIP", stance: "enthousiast" },
        { name: "Wouter", role: "Developer", organization: "JAIP", stance: null },
      ],
      entities: { clients: ["CAI"], people: ["Joris"] },
    };

    const legacyEquivalent: SummarizerOutput = {
      briefing: structured.briefing,
      kernpunten: [
        "### [CAI Studio] Authenticatie",
        "**Besluit:** Supabase Auth wordt gebruikt voor CAI Studio.",
        "**Risico:** Migratie van bestaande gebruikers nog onduidelijk.",
        "### [CAI Studio] Deploy",
        "**Signaal:** Credentials nog niet binnen bij Joris.",
      ],
      deelnemers: structured.deelnemers,
      vervolgstappen: [
        "[CAI Studio] Joris navragen of de credentials binnen zijn — Wouter, 2026-04-22",
      ],
    };

    const newMarkdown = renderMeetingSummary(structured);
    const legacyMarkdown = formatSummary(legacyEquivalent);

    expect(newMarkdown).toBe(legacyMarkdown);
  });

  it("emits Algemeen group when theme_project is null or empty", () => {
    const structured: MeetingStructurerOutput = {
      briefing: "Korte standup.",
      kernpunten: [
        {
          type: "decision",
          content: "We doen elke maandag retro.",
          theme: "Proces",
          theme_project: null,
          source_quote: null,
          project: null,
          confidence: 0.9,
          metadata: {},
        },
      ],
      deelnemers: [{ name: "Stef", role: null, organization: null, stance: null }],
      entities: { clients: [], people: [] },
    };

    const md = renderMeetingSummary(structured);
    expect(md).toContain("### [Algemeen] Proces");
    expect(md).toContain("**Besluit:** We doen elke maandag retro.");
  });

  it("omits the Vervolgstappen section when there are no action items", () => {
    const structured: MeetingStructurerOutput = {
      briefing: "Strategie zonder concrete acties.",
      kernpunten: [
        {
          type: "vision",
          content: "Cockpit moet hét werkblad worden.",
          theme: "Productvisie",
          theme_project: "Algemeen",
          source_quote: null,
          project: null,
          confidence: 0.7,
          metadata: {},
        },
      ],
      deelnemers: [{ name: "Stef", role: null, organization: null, stance: null }],
      entities: { clients: [], people: [] },
    };

    const md = renderMeetingSummary(structured);
    expect(md).not.toContain("## Vervolgstappen");
    expect(md).toContain("**Visie:** Cockpit moet hét werkblad worden.");
  });

  it("groups by (theme_project, theme) preserving first-seen order", () => {
    const structured: MeetingStructurerOutput = {
      briefing: "Twee projecten interleaved.",
      kernpunten: [
        {
          type: "decision",
          content: "A1",
          theme: "T1",
          theme_project: "Project A",
          source_quote: null,
          project: null,
          confidence: 0.9,
          metadata: {},
        },
        {
          type: "decision",
          content: "B1",
          theme: "T1",
          theme_project: "Project B",
          source_quote: null,
          project: null,
          confidence: 0.9,
          metadata: {},
        },
        {
          type: "decision",
          content: "A2",
          theme: "T1",
          theme_project: "Project A",
          source_quote: null,
          project: null,
          confidence: 0.9,
          metadata: {},
        },
      ],
      deelnemers: [],
      entities: { clients: [], people: [] },
    };

    const md = renderMeetingSummary(structured);
    const headerOrder = md.match(/### \[[^\]]+\] T1/g) ?? [];
    expect(headerOrder).toEqual(["### [Project A] T1", "### [Project B] T1"]);
    // A1 and A2 must end up under Project A (= same group)
    const projectABlock = md.split("### [Project B] T1")[0];
    expect(projectABlock).toContain("**Besluit:** A1");
    expect(projectABlock).toContain("**Besluit:** A2");
  });

  it("renders an action item without metadata as bare bullet line", () => {
    const structured: MeetingStructurerOutput = {
      briefing: "Action zonder details.",
      kernpunten: [
        {
          type: "action_item",
          content: "Wouter mailen voor input",
          theme: null,
          theme_project: null,
          source_quote: null,
          project: null,
          confidence: 0.6,
          metadata: {},
        },
      ],
      deelnemers: [],
      entities: { clients: [], people: [] },
    };

    const md = renderMeetingSummary(structured);
    expect(md).toContain("## Vervolgstappen");
    expect(md).toContain("- [ ] [Algemeen] Wouter mailen voor input");
    expect(md).not.toContain(" — ");
  });
});
