import { describe, it, expect } from "vitest";
import { buildSegments } from "../../src/pipeline/lib/segment-builder";
import type { TaggerOutput } from "../../src/pipeline/tagger";

describe("buildSegments", () => {
  it("groups items per project and creates summary_text", () => {
    const input: TaggerOutput = {
      kernpunten: [
        {
          content: "Feature X is af",
          project_name: "Klantportaal",
          project_id: "uuid-a",
          confidence: 1.0,
        },
        {
          content: "Bug Y gevonden",
          project_name: "Klantportaal",
          project_id: "uuid-a",
          confidence: 0.8,
        },
        { content: "Algemeen punt", project_name: null, project_id: null, confidence: 0 },
      ],
      vervolgstappen: [
        {
          content: "Deploy naar staging",
          project_name: "Klantportaal",
          project_id: "uuid-a",
          confidence: 1.0,
        },
      ],
    };

    const segments = buildSegments(input);

    // Should have 2 segments: Klantportaal + Algemeen
    expect(segments).toHaveLength(2);

    const klantportaal = segments.find((s) => s.project_name_raw === "Klantportaal");
    expect(klantportaal).toBeDefined();
    expect(klantportaal!.project_id).toBe("uuid-a");
    expect(klantportaal!.kernpunten).toHaveLength(2);
    expect(klantportaal!.vervolgstappen).toHaveLength(1);
    expect(klantportaal!.summary_text).toContain("Project: Klantportaal");
    expect(klantportaal!.summary_text).toContain("Feature X is af");
    expect(klantportaal!.summary_text).toContain("Deploy naar staging");

    const algemeen = segments.find((s) => s.project_name_raw === null);
    expect(algemeen).toBeDefined();
    expect(algemeen!.project_id).toBeNull();
    expect(algemeen!.kernpunten).toHaveLength(1);
    expect(algemeen!.summary_text).toContain("Algemeen (niet project-specifiek):");
  });

  it("EDGE-006: all items null -> single Algemeen segment", () => {
    const input: TaggerOutput = {
      kernpunten: [
        { content: "Punt 1", project_name: null, project_id: null, confidence: 0 },
        { content: "Punt 2", project_name: null, project_id: null, confidence: 0 },
      ],
      vervolgstappen: [{ content: "Stap 1", project_name: null, project_id: null, confidence: 0 }],
    };

    const segments = buildSegments(input);

    expect(segments).toHaveLength(1);
    expect(segments[0].project_id).toBeNull();
    expect(segments[0].project_name_raw).toBeNull();
    expect(segments[0].kernpunten).toHaveLength(2);
    expect(segments[0].vervolgstappen).toHaveLength(1);
  });

  it("skips empty segments", () => {
    const input: TaggerOutput = {
      kernpunten: [
        { content: "Punt A", project_name: "Project A", project_id: "id-a", confidence: 1.0 },
      ],
      vervolgstappen: [],
    };

    const segments = buildSegments(input);

    // Only Project A segment (Algemeen has no content so it's skipped)
    expect(segments).toHaveLength(1);
    expect(segments[0].project_name_raw).toBe("Project A");
  });

  it("returns empty array when no items at all", () => {
    const input: TaggerOutput = {
      kernpunten: [],
      vervolgstappen: [],
    };

    const segments = buildSegments(input);
    expect(segments).toHaveLength(0);
  });

  it("handles multiple projects correctly", () => {
    const input: TaggerOutput = {
      kernpunten: [
        { content: "K1", project_name: "Project A", project_id: "id-a", confidence: 1.0 },
        { content: "K2", project_name: "Project B", project_id: "id-b", confidence: 0.8 },
        { content: "K3", project_name: null, project_id: null, confidence: 0 },
      ],
      vervolgstappen: [
        { content: "V1", project_name: "Project A", project_id: "id-a", confidence: 1.0 },
        { content: "V2", project_name: "Project B", project_id: "id-b", confidence: 0.8 },
      ],
    };

    const segments = buildSegments(input);

    expect(segments).toHaveLength(3); // A, B, Algemeen
    expect(segments.find((s) => s.project_name_raw === "Project A")!.kernpunten).toEqual(["K1"]);
    expect(segments.find((s) => s.project_name_raw === "Project B")!.vervolgstappen).toEqual([
      "V2",
    ]);
    expect(segments.find((s) => s.project_name_raw === null)!.kernpunten).toEqual(["K3"]);
  });

  it("AI-068 regression: content reaches segments without [X] prefixes", () => {
    // Simulate output from the refactored Tagger: content is already stripped.
    // This regression asserts segments NEVER contain prefix markers.
    const input: TaggerOutput = {
      kernpunten: [
        {
          content: "**Besluit:** Upload-flow is af",
          project_name: "Klantportaal",
          project_id: "uuid-a",
          confidence: 1.0,
        },
      ],
      vervolgstappen: [
        {
          content: "Deploy naar staging — Wouter",
          project_name: "Klantportaal",
          project_id: "uuid-a",
          confidence: 1.0,
        },
      ],
    };

    const segments = buildSegments(input);
    const klantportaal = segments.find((s) => s.project_name_raw === "Klantportaal")!;

    for (const kp of klantportaal.kernpunten) {
      expect(kp).not.toMatch(/^\[[^\[\]]+\]\s+/);
    }
    for (const v of klantportaal.vervolgstappen) {
      expect(v).not.toMatch(/^\[[^\[\]]+\]\s+/);
    }
    expect(klantportaal.summary_text).not.toMatch(/\n-\s*\[[^\[\]]+\]\s+/);
  });

  it("formats summary_text correctly for Algemeen", () => {
    const input: TaggerOutput = {
      kernpunten: [
        { content: "Algemeen punt", project_name: null, project_id: null, confidence: 0 },
      ],
      vervolgstappen: [
        { content: "Algemene stap", project_name: null, project_id: null, confidence: 0 },
      ],
    };

    const segments = buildSegments(input);
    const text = segments[0].summary_text;

    expect(text).toContain("Algemeen (niet project-specifiek):");
    expect(text).toContain("Kernpunten:");
    expect(text).toContain("- Algemeen punt");
    expect(text).toContain("Vervolgstappen:");
    expect(text).toContain("- Algemene stap");
  });
});
