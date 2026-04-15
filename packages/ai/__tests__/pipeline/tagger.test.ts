import { describe, it, expect } from "vitest";
import { runTagger } from "../../src/pipeline/tagger";

const PROJECT_A = {
  project_name: "Klantportaal",
  project_id: "uuid-a",
  confidence: 0.95,
};
const PROJECT_B = {
  project_name: "IntraNext Migratie",
  project_id: "uuid-b",
  confidence: 0.9,
};
const PROJECT_UNKNOWN = {
  project_name: "Nieuw project",
  project_id: null,
  confidence: 0.7,
};

describe("runTagger", () => {
  describe("RULE-016: no projects -> all to Algemeen", () => {
    it("returns all items with null project when identified_projects is empty", () => {
      const result = runTagger({
        kernpunten: ["We bespraken de roadmap", "Budget is goedgekeurd"],
        vervolgstappen: ["Stuur offerte"],
        identified_projects: [],
      });

      expect(result.kernpunten).toHaveLength(2);
      expect(result.vervolgstappen).toHaveLength(1);
      for (const item of [...result.kernpunten, ...result.vervolgstappen]) {
        expect(item.project_name).toBeNull();
        expect(item.project_id).toBeNull();
        expect(item.confidence).toBe(0);
      }
    });
  });

  describe("AI-031: exact match on project name", () => {
    it("matches when project name appears in kernpunt (case-insensitive)", () => {
      const result = runTagger({
        kernpunten: ["De voortgang van het Klantportaal is goed"],
        vervolgstappen: [],
        identified_projects: [PROJECT_A],
      });

      expect(result.kernpunten[0].project_name).toBe("Klantportaal");
      expect(result.kernpunten[0].project_id).toBe("uuid-a");
      expect(result.kernpunten[0].confidence).toBe(1.0);
    });

    it("matches case-insensitively", () => {
      const result = runTagger({
        kernpunten: ["Het KLANTPORTAAL draait live"],
        vervolgstappen: [],
        identified_projects: [PROJECT_A],
      });

      expect(result.kernpunten[0].confidence).toBe(1.0);
    });
  });

  describe("AI-032: substring match", () => {
    it("matches when all words of multi-word project appear in text", () => {
      const result = runTagger({
        kernpunten: ["De intranext migratie moet voor Q3 af zijn"],
        vervolgstappen: [],
        identified_projects: [PROJECT_B],
      });

      // This is an exact match since the full name appears
      expect(result.kernpunten[0].project_name).toBe("IntraNext Migratie");
      expect(result.kernpunten[0].confidence).toBe(1.0);
    });
  });

  describe("AI-033: keyword overlap", () => {
    it("matches with 0.8 confidence when all words match but not as phrase", () => {
      const result = runTagger({
        kernpunten: ["De migratie van IntraNext systemen vordert"],
        vervolgstappen: [],
        identified_projects: [PROJECT_B],
      });

      expect(result.kernpunten[0].project_name).toBe("IntraNext Migratie");
      // All words match (intranext, migratie) -> 0.8
      expect(result.kernpunten[0].confidence).toBe(0.8);
    });
  });

  describe("AI-034: no match -> null", () => {
    it("returns null project for unrelated kernpunten", () => {
      const result = runTagger({
        kernpunten: ["We bespraken de lunch"],
        vervolgstappen: [],
        identified_projects: [PROJECT_A, PROJECT_B],
      });

      expect(result.kernpunten[0].project_name).toBeNull();
      expect(result.kernpunten[0].project_id).toBeNull();
    });
  });

  describe("AI-036: confidence threshold", () => {
    it("puts items with keyword-only match (0.6) to Algemeen", () => {
      // Create a 3-word project name where only 2 words match
      const project3Words = {
        project_name: "groot web platform",
        project_id: "uuid-3w",
        confidence: 0.9,
      };
      const result = runTagger({
        kernpunten: ["Het grote web applicatie moet opgeleverd worden"],
        vervolgstappen: [],
        identified_projects: [project3Words],
      });

      // "groot" -> "grote" won't match exactly, "web" matches, "platform" doesn't match
      // This should be null/Algemeen because <2 words match
      expect(result.kernpunten[0].project_name).toBeNull();
    });
  });

  describe("multiple projects", () => {
    it("matches different kernpunten to different projects", () => {
      const result = runTagger({
        kernpunten: [
          "Het Klantportaal heeft een nieuwe feature nodig",
          "IntraNext Migratie loopt op schema",
          "De koffie was lekker",
        ],
        vervolgstappen: ["Deploy Klantportaal naar staging"],
        identified_projects: [PROJECT_A, PROJECT_B],
      });

      expect(result.kernpunten[0].project_name).toBe("Klantportaal");
      expect(result.kernpunten[1].project_name).toBe("IntraNext Migratie");
      expect(result.kernpunten[2].project_name).toBeNull();
      expect(result.vervolgstappen[0].project_name).toBe("Klantportaal");
    });
  });

  describe("unknown project (null project_id)", () => {
    it("preserves null project_id from Gatekeeper", () => {
      const result = runTagger({
        kernpunten: ["Het Nieuw project gaat van start"],
        vervolgstappen: [],
        identified_projects: [PROJECT_UNKNOWN],
      });

      expect(result.kernpunten[0].project_name).toBe("Nieuw project");
      expect(result.kernpunten[0].project_id).toBeNull();
      expect(result.kernpunten[0].confidence).toBe(1.0);
    });
  });

  describe("empty inputs", () => {
    it("handles empty kernpunten and vervolgstappen", () => {
      const result = runTagger({
        kernpunten: [],
        vervolgstappen: [],
        identified_projects: [PROJECT_A],
      });

      expect(result.kernpunten).toHaveLength(0);
      expect(result.vervolgstappen).toHaveLength(0);
    });
  });

  // ------------------------------------------------------------------
  // Sprint 035: Summarizer project-prefix + Tagger prefix-parser
  // ------------------------------------------------------------------

  describe("AI-063: theme-inheritance for kernpunten", () => {
    it("propagates theme-prefix project to all kernpunten under that theme", () => {
      const result = runTagger({
        kernpunten: [
          "### [Klantportaal] Upload-flow",
          "**Besluit:** We bouwen een extra veld.",
          "**Risico:** Performance moet gemonitord worden.",
          "### [IntraNext Migratie] Planning",
          "**Afspraak:** Deadline Q3 bevestigd.",
        ],
        vervolgstappen: [],
        identified_projects: [PROJECT_A, PROJECT_B],
      });

      // Theme headers themselves are not in output (filtered out as structural)
      // Only the content items that inherit the theme get tagged
      const contentItems = result.kernpunten;
      expect(contentItems).toHaveLength(3);

      expect(contentItems[0].project_name).toBe("Klantportaal");
      expect(contentItems[0].project_id).toBe("uuid-a");
      expect(contentItems[0].confidence).toBe(1.0);

      expect(contentItems[1].project_name).toBe("Klantportaal");
      expect(contentItems[1].project_id).toBe("uuid-a");

      expect(contentItems[2].project_name).toBe("IntraNext Migratie");
      expect(contentItems[2].project_id).toBe("uuid-b");
    });

    it("resets theme when a new ### header without prefix appears", () => {
      const result = runTagger({
        kernpunten: [
          "### [Klantportaal] Upload-flow",
          "**Besluit:** We bouwen upload.",
          "### Algemene observaties",
          "**Signaal:** Team is tevreden.",
        ],
        vervolgstappen: [],
        identified_projects: [PROJECT_A],
      });

      expect(result.kernpunten).toHaveLength(2);
      expect(result.kernpunten[0].project_name).toBe("Klantportaal");
      // Theme without prefix -> reset inheritance -> fallback to rule-based (no match here)
      expect(result.kernpunten[1].project_name).toBeNull();
    });
  });

  describe("AI-064: vervolgstappen self-attributing", () => {
    it("parses prefix per vervolgstap (no inheritance)", () => {
      const result = runTagger({
        kernpunten: [],
        vervolgstappen: [
          "[Klantportaal] Deploy naar staging — Wouter, vrijdag",
          "[IntraNext Migratie] Schema review — Stef, maandag",
          "[Algemeen] Retro inplannen",
        ],
        identified_projects: [PROJECT_A, PROJECT_B],
      });

      expect(result.vervolgstappen).toHaveLength(3);
      expect(result.vervolgstappen[0].project_name).toBe("Klantportaal");
      expect(result.vervolgstappen[1].project_name).toBe("IntraNext Migratie");
      expect(result.vervolgstappen[2].project_name).toBeNull();
    });

    it("does NOT inherit between vervolgstappen", () => {
      const result = runTagger({
        kernpunten: [],
        vervolgstappen: [
          "[Klantportaal] Deploy naar staging — Wouter",
          "Volgende actie zonder prefix", // should NOT inherit Klantportaal
        ],
        identified_projects: [PROJECT_A],
      });

      expect(result.vervolgstappen[0].project_name).toBe("Klantportaal");
      // Second item has no prefix, no rule-based match -> Algemeen
      expect(result.vervolgstappen[1].project_name).toBeNull();
    });
  });

  describe("AI-066: [Algemeen] literal -> null project", () => {
    it("treats [Algemeen] as null (case-insensitive)", () => {
      const result = runTagger({
        kernpunten: [
          "### [Algemeen] Team observaties",
          "**Signaal:** Goede sfeer in het team.",
          "### [ALGEMEEN] Overige punten",
          "**Context:** Koffie is op.",
        ],
        vervolgstappen: ["[algemeen] Retro inplannen"],
        identified_projects: [PROJECT_A],
      });

      expect(result.kernpunten).toHaveLength(2);
      expect(result.kernpunten[0].project_name).toBeNull();
      expect(result.kernpunten[0].project_id).toBeNull();
      expect(result.kernpunten[0].confidence).toBe(0);

      expect(result.kernpunten[1].project_name).toBeNull();

      expect(result.vervolgstappen[0].project_name).toBeNull();
    });
  });

  describe("AI-067: hallucinated project prefix -> Algemeen, no DB leak", () => {
    it("falls back to Algemeen when prefix doesn't match known projects", () => {
      const result = runTagger({
        kernpunten: [
          "### [Hallucinated App] Een bedachte thema",
          "**Besluit:** Niets concreets besproken.",
        ],
        vervolgstappen: ["[Ghost Project] Iets doen"],
        identified_projects: [PROJECT_A],
      });

      // Prefix name doesn't match -> item goes to Algemeen
      expect(result.kernpunten[0].project_name).toBeNull();
      expect(result.kernpunten[0].project_id).toBeNull();
      // CRITICAL: no hallucinated project_name_raw leaks through
      expect(result.kernpunten[0].project_name).not.toBe("Hallucinated App");
      expect(result.kernpunten[0].project_name).not.toBe("Ghost Project");

      expect(result.vervolgstappen[0].project_name).toBeNull();
      expect(result.vervolgstappen[0].project_name).not.toBe("Ghost Project");
    });
  });

  describe("AI-068: content stripped of prefix", () => {
    it("strips [X] prefix from kernpunten content", () => {
      const result = runTagger({
        kernpunten: ["### [Klantportaal] Upload-flow", "**Besluit:** We bouwen een upload-veld."],
        vervolgstappen: [],
        identified_projects: [PROJECT_A],
      });

      // Content must not contain the theme prefix
      expect(result.kernpunten[0].content).toBe("**Besluit:** We bouwen een upload-veld.");
      expect(result.kernpunten[0].content).not.toContain("[Klantportaal]");
    });

    it("strips prefix from vervolgstap content", () => {
      const result = runTagger({
        kernpunten: [],
        vervolgstappen: ["[Klantportaal] Deploy naar staging — Wouter, vrijdag"],
        identified_projects: [PROJECT_A],
      });

      expect(result.vervolgstappen[0].content).toBe("Deploy naar staging — Wouter, vrijdag");
      expect(result.vervolgstappen[0].content).not.toContain("[Klantportaal]");
    });

    it("strips [Algemeen] prefix too", () => {
      const result = runTagger({
        kernpunten: [],
        vervolgstappen: ["[Algemeen] Retro inplannen"],
        identified_projects: [PROJECT_A],
      });

      expect(result.vervolgstappen[0].content).toBe("Retro inplannen");
    });
  });

  describe("AI-069: kernpunt without theme-prefix -> rule-based fallback", () => {
    it("falls back to rule-based matching when theme-kop has no prefix", () => {
      const result = runTagger({
        kernpunten: [
          "### Algemene notities",
          "Het Klantportaal is bijna klaar voor release.",
          "Bug in IntraNext Migratie opgelost.",
        ],
        vervolgstappen: [],
        identified_projects: [PROJECT_A, PROJECT_B],
      });

      // No theme prefix -> fallback to rule-based per item
      expect(result.kernpunten[0].project_name).toBe("Klantportaal");
      expect(result.kernpunten[1].project_name).toBe("IntraNext Migratie");
    });
  });

  describe("AI-070: vervolgstap without prefix -> rule-based fallback", () => {
    it("matches unprefixed vervolgstap via rule-based matching", () => {
      const result = runTagger({
        kernpunten: [],
        vervolgstappen: ["Deploy Klantportaal naar staging", "Algemeen standup punt"],
        identified_projects: [PROJECT_A],
      });

      expect(result.vervolgstappen[0].project_name).toBe("Klantportaal");
      expect(result.vervolgstappen[1].project_name).toBeNull();
    });
  });

  describe("AI-065: prefix match via knownProjects aliases", () => {
    it("matches prefix against knownProject alias with 0.95 confidence", () => {
      const result = runTagger({
        kernpunten: ["### [Portaal] Upload-flow", "**Besluit:** Upload werkt."],
        vervolgstappen: [],
        identified_projects: [], // Gatekeeper did NOT identify
        knownProjects: [{ id: "uuid-a", name: "Klantportaal", aliases: ["Portaal", "KP"] }],
      });

      expect(result.kernpunten[0].project_name).toBe("Klantportaal");
      expect(result.kernpunten[0].project_id).toBe("uuid-a");
      expect(result.kernpunten[0].confidence).toBeCloseTo(0.95);
    });

    it("matches prefix against knownProject name with 0.95 confidence (Gatekeeper miss)", () => {
      const result = runTagger({
        kernpunten: ["### [Klantportaal] Upload-flow", "**Besluit:** Upload werkt."],
        vervolgstappen: [],
        identified_projects: [],
        knownProjects: [{ id: "uuid-a", name: "Klantportaal", aliases: [] }],
      });

      expect(result.kernpunten[0].project_name).toBe("Klantportaal");
      expect(result.kernpunten[0].project_id).toBe("uuid-a");
      expect(result.kernpunten[0].confidence).toBeCloseTo(0.95);
    });

    it("Gatekeeper-identified project prefix wins with 1.0 confidence", () => {
      const result = runTagger({
        kernpunten: ["### [Klantportaal] Upload-flow", "**Besluit:** Upload werkt."],
        vervolgstappen: [],
        identified_projects: [PROJECT_A],
        knownProjects: [{ id: "uuid-a", name: "Klantportaal", aliases: [] }],
      });

      expect(result.kernpunten[0].project_name).toBe("Klantportaal");
      expect(result.kernpunten[0].confidence).toBe(1.0);
    });
  });

  describe("EDGE-010: malformed prefix -> treated as no prefix", () => {
    it("handles unclosed bracket", () => {
      const result = runTagger({
        kernpunten: ["### [unclosed Themanaam", "**Besluit:** Iets besloten."],
        vervolgstappen: [],
        identified_projects: [PROJECT_A],
      });

      // Malformed -> no prefix -> theme without prefix -> fallback -> no match
      expect(result.kernpunten[0].project_name).toBeNull();
    });

    it("handles empty brackets []", () => {
      const result = runTagger({
        kernpunten: ["### [] Themanaam", "**Besluit:** Iets."],
        vervolgstappen: [],
        identified_projects: [PROJECT_A],
      });

      expect(result.kernpunten[0].project_name).toBeNull();
    });

    it("handles whitespace-only prefix [   ]", () => {
      const result = runTagger({
        kernpunten: ["### [   ] Themanaam", "**Besluit:** Iets."],
        vervolgstappen: [],
        identified_projects: [PROJECT_A],
      });

      expect(result.kernpunten[0].project_name).toBeNull();
    });

    it("handles malformed vervolgstap prefix", () => {
      const result = runTagger({
        kernpunten: [],
        vervolgstappen: ["[unclosed Actie doen"],
        identified_projects: [PROJECT_A],
      });

      // Malformed -> no prefix -> fallback to rule-based -> no match
      expect(result.vervolgstappen[0].project_name).toBeNull();
      expect(result.vervolgstappen[0].content).toBe("[unclosed Actie doen");
    });
  });

  describe("EDGE-011: nested brackets rejected", () => {
    it("rejects [[X]] as a prefix", () => {
      const result = runTagger({
        kernpunten: ["### [[Klantportaal]] Upload-flow", "**Besluit:** Iets."],
        vervolgstappen: [],
        identified_projects: [PROJECT_A],
      });

      // Nested brackets -> regex rejects -> no prefix -> fallback
      expect(result.kernpunten[0].project_name).toBeNull();
    });

    it("rejects nested brackets in vervolgstap prefix", () => {
      // Use a prefix name that won't match rule-based on the raw string
      // so we can isolate: regex rejects -> no prefix -> rule-based fallback -> no match
      const result = runTagger({
        kernpunten: [],
        vervolgstappen: ["[[Onbekend]] Actie doen"],
        identified_projects: [PROJECT_A],
      });

      expect(result.vervolgstappen[0].project_name).toBeNull();
      // Content should NOT be stripped because prefix was rejected
      expect(result.vervolgstappen[0].content).toBe("[[Onbekend]] Actie doen");
    });
  });

  describe("EDGE-012: item-level prefix overrides theme-inheritance", () => {
    it("item-level prefix takes precedence over inherited theme", () => {
      const result = runTagger({
        kernpunten: [
          "### [Klantportaal] Upload-flow",
          "**Besluit:** Iets voor Klantportaal.",
          "[IntraNext Migratie] **Signaal:** Dit gaat over IntraNext.",
          "**Afspraak:** Weer iets voor Klantportaal.",
        ],
        vervolgstappen: [],
        identified_projects: [PROJECT_A, PROJECT_B],
      });

      expect(result.kernpunten).toHaveLength(3);
      expect(result.kernpunten[0].project_name).toBe("Klantportaal");
      // Item-level prefix wins
      expect(result.kernpunten[1].project_name).toBe("IntraNext Migratie");
      // And the content has the prefix stripped
      expect(result.kernpunten[1].content).toBe("**Signaal:** Dit gaat over IntraNext.");
      // After override, inheritance continues from the theme
      expect(result.kernpunten[2].project_name).toBe("Klantportaal");
    });
  });

  describe("RULE-017: backward-compat regression (no prefixes anywhere)", () => {
    it("matches legacy summarizer output identically to pre-sprint behaviour", () => {
      const result = runTagger({
        kernpunten: [
          "De voortgang van het Klantportaal is goed",
          "IntraNext Migratie loopt op schema",
          "De koffie was lekker",
        ],
        vervolgstappen: ["Deploy Klantportaal naar staging"],
        identified_projects: [PROJECT_A, PROJECT_B],
      });

      expect(result.kernpunten[0].project_name).toBe("Klantportaal");
      expect(result.kernpunten[0].confidence).toBe(1.0);
      expect(result.kernpunten[1].project_name).toBe("IntraNext Migratie");
      expect(result.kernpunten[2].project_name).toBeNull();
      expect(result.vervolgstappen[0].project_name).toBe("Klantportaal");
    });
  });
});
