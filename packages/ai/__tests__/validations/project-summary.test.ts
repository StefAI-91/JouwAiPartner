import { describe, it, expect } from "vitest";
import {
  extractOrgTimeline,
  OrgTimelineEntrySchema,
  OrgSummaryOutputSchema,
} from "../../src/validations/project-summary";

describe("OrgTimelineEntrySchema", () => {
  it("accepts valid meeting entry", () => {
    const result = OrgTimelineEntrySchema.safeParse({
      date: "2026-04-13",
      source_type: "meeting",
      title: "Kickoff",
      summary: "Eerste kennismaking met klant.",
      key_decisions: ["Budget goedgekeurd"],
      open_actions: ["Contract opstellen"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid email entry with empty arrays", () => {
    const result = OrgTimelineEntrySchema.safeParse({
      date: "2026-04-13",
      source_type: "email",
      title: "Voorbereiding",
      summary: "Jan stuurt agenda-voorstel.",
      key_decisions: [],
      open_actions: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown source_type", () => {
    const result = OrgTimelineEntrySchema.safeParse({
      date: "2026-04-13",
      source_type: "phone",
      title: "x",
      summary: "y",
      key_decisions: [],
      open_actions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing key_decisions array", () => {
    const result = OrgTimelineEntrySchema.safeParse({
      date: "2026-04-13",
      source_type: "meeting",
      title: "x",
      summary: "y",
      open_actions: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("OrgSummaryOutputSchema", () => {
  it("accepts output with empty timeline", () => {
    const result = OrgSummaryOutputSchema.safeParse({
      context: "Klant X is een adviseur.",
      briefing: "Relatie stabiel, geen openstaande vragen.",
      timeline: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing timeline field", () => {
    const result = OrgSummaryOutputSchema.safeParse({
      context: "c",
      briefing: "b",
    });
    expect(result.success).toBe(false);
  });
});

describe("extractOrgTimeline", () => {
  it("retourneert lege array bij null input", () => {
    expect(extractOrgTimeline(null)).toEqual([]);
  });

  it("retourneert lege array bij undefined input", () => {
    expect(extractOrgTimeline(undefined)).toEqual([]);
  });

  it("retourneert lege array als timeline-veld ontbreekt", () => {
    expect(extractOrgTimeline({ foo: "bar" })).toEqual([]);
  });

  it("retourneert lege array als timeline geen array is", () => {
    expect(extractOrgTimeline({ timeline: "not an array" })).toEqual([]);
  });

  it("retourneert lege array als een entry een ongeldig source_type heeft", () => {
    const result = extractOrgTimeline({
      timeline: [
        {
          date: "2026-04-13",
          source_type: "phone", // not a valid enum value
          title: "x",
          summary: "y",
          key_decisions: [],
          open_actions: [],
        },
      ],
    });
    expect(result).toEqual([]);
  });

  it("extraheert geldige timeline entries correct", () => {
    const entries = [
      {
        date: "2026-04-10",
        source_type: "meeting",
        title: "Kickoff",
        summary: "Kennismaking",
        key_decisions: [],
        open_actions: [],
      },
      {
        date: "2026-04-13",
        source_type: "email",
        title: "Voorbereiding",
        summary: "Agenda",
        key_decisions: ["Budget ok"],
        open_actions: ["Stukken aanleveren"],
      },
    ];
    const result = extractOrgTimeline({ timeline: entries });
    expect(result).toHaveLength(2);
    expect(result[0].source_type).toBe("meeting");
    expect(result[1].source_type).toBe("email");
    expect(result[1].key_decisions).toEqual(["Budget ok"]);
  });

  it("retourneert lege array bij partial corrupt data (all-or-nothing)", () => {
    // Eén geldige + één ongeldige entry → schema.safeParse faalt op de hele array.
    // Bewuste keuze: beter een lege timeline tonen dan een gedeeltelijk corrupte.
    const result = extractOrgTimeline({
      timeline: [
        {
          date: "2026-04-10",
          source_type: "meeting",
          title: "ok",
          summary: "ok",
          key_decisions: [],
          open_actions: [],
        },
        {
          date: "2026-04-13",
          source_type: "invalid",
          title: "bad",
          summary: "bad",
          key_decisions: [],
          open_actions: [],
        },
      ],
    });
    expect(result).toEqual([]);
  });
});
