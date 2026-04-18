import { describe, it, expect } from "vitest";
import { parseMarkdownExtractions, filterByType } from "../../src/utils/summary-markdown-parser";

describe("parseMarkdownExtractions", () => {
  it("parses a kernpunten array with theme headers and typed bullets", () => {
    const kernpunten = [
      "### [CAI Studio] Authenticatie",
      "**Besluit:** We gaan met Supabase Auth werken.",
      "**Risico:** Migratie van bestaande gebruikers nog onduidelijk.",
      "**Behoefte:** Documentatie van bestaande auth-flow.",
      "### [CAI Studio] Deploy",
      "**Signaal:** Credentials nog niet binnen.",
      "**Afspraak:** Joris levert credentials uiterlijk 18 apr.",
      "### [Algemeen] Team",
      "**Visie:** Cockpit moet hét werkblad worden.",
      "**Context:** Ege werkt deze week aan admin panel.",
    ];

    const result = parseMarkdownExtractions(kernpunten);

    expect(result).toHaveLength(7);

    expect(result[0]).toEqual({
      type: "besluit",
      content: "We gaan met Supabase Auth werken.",
      theme: "Authenticatie",
    });
    expect(result[1]).toEqual({
      type: "risico",
      content: "Migratie van bestaande gebruikers nog onduidelijk.",
      theme: "Authenticatie",
    });
    expect(result[3]).toEqual({
      type: "signaal",
      content: "Credentials nog niet binnen.",
      theme: "Deploy",
    });
    expect(result[5]).toEqual({
      type: "visie",
      content: "Cockpit moet hét werkblad worden.",
      theme: "Team",
    });
    expect(result[6]).toEqual({
      type: "context",
      content: "Ege werkt deze week aan admin panel.",
      theme: "Team",
    });
  });

  it("returns empty array when input is empty", () => {
    expect(parseMarkdownExtractions([])).toEqual([]);
  });

  it("skips bullets without a recognised type instead of crashing", () => {
    const kernpunten = [
      "### [Project X] Algemeen",
      "**OnbekendType:** Dit moet overgeslagen worden.",
      "**Besluit:** Dit niet.",
      "Dit is een bare string zonder marker, ook overslaan.",
      "**Risico:** En dit wel.",
    ];

    const result = parseMarkdownExtractions(kernpunten);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.type)).toEqual(["besluit", "risico"]);
  });

  it("survives malformed headers without crashing", () => {
    const kernpunten = [
      "### CAI Studio kapotte header zonder brackets",
      "**Risico:** Toch nog parsen, theme is dan null.",
    ];

    const result = parseMarkdownExtractions(kernpunten);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "risico",
      content: "Toch nog parsen, theme is dan null.",
      theme: null,
    });
  });

  it("handles bullets that start with a list marker", () => {
    const kernpunten = [
      "### [Algemeen] Tooling",
      "- **Besluit:** Vitest blijft.",
      "* **Risico:** Snapshots verouderen snel.",
      "• **Behoefte:** Snapshot-policy documenteren.",
    ];

    const result = parseMarkdownExtractions(kernpunten);
    expect(result.map((r) => r.type)).toEqual(["besluit", "risico", "behoefte"]);
    expect(result[2].content).toBe("Snapshot-policy documenteren.");
  });

  it("matches type label case-insensitively", () => {
    const result = parseMarkdownExtractions([
      "### [Algemeen] Casus",
      "**RISICO:** Hoofdletters.",
      "**besluit:** Kleine letters.",
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.type)).toEqual(["risico", "besluit"]);
  });

  it("ignores empty strings, non-string entries and headers without a name", () => {
    const result = parseMarkdownExtractions([
      "",
      "   ",
      "### []",
      "**Risico:** Geen theme actief.",
      // @ts-expect-error - we simulate dirty data from the database
      null,
      // @ts-expect-error - same
      undefined,
    ]);

    expect(result).toEqual([{ type: "risico", content: "Geen theme actief.", theme: null }]);
  });

  it("keeps theme until the next header overrides it", () => {
    const result = parseMarkdownExtractions([
      "### [Project A] Onderwerp 1",
      "**Risico:** Eerste.",
      "**Besluit:** Tweede.",
      "### [Project A] Onderwerp 2",
      "**Risico:** Derde.",
    ]);

    expect(result.map((r) => r.theme)).toEqual(["Onderwerp 1", "Onderwerp 1", "Onderwerp 2"]);
  });
});

describe("filterByType", () => {
  it("returns only items of the requested type", () => {
    const parsed = parseMarkdownExtractions([
      "### [X] Y",
      "**Risico:** A",
      "**Besluit:** B",
      "**Risico:** C",
    ]);
    const risks = filterByType(parsed, "risico");
    expect(risks).toHaveLength(2);
    expect(risks.map((r) => r.content)).toEqual(["A", "C"]);
  });
});
