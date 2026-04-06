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
});
