import { describe, it, expect } from "vitest";
import {
  ALL_EXTRACTION_TYPES,
  METADATA_FIELDS_PER_TYPE,
  filterMetadataByType,
  type ExtractionType,
} from "../src/extraction-types";

// Shape die normaliseMetadata in meeting-structurer.ts produceert:
// alle 23 universele velden zijn aanwezig, met null voor niet-toegepast.
// De filter moet daaruit de juiste subset per type halen.
const universalMetadata = {
  effort_estimate: null,
  impact_area: null,
  severity: null,
  jaip_impact_area: null,
  party: null,
  horizon: null,
  sentiment: null,
  signal_type: null,
  sensitive: false,
  category: null,
  scope: null,
  status: null,
  urgency: null,
  direction: null,
  domain: null,
  follow_up_contact: null,
  assignee: null,
  deadline: null,
  decided_by: null,
  raised_by: null,
  committer: null,
  committed_to: null,
  needs_answer_from: null,
};

describe("METADATA_FIELDS_PER_TYPE", () => {
  it("declares an allow-list for every extraction type", () => {
    for (const t of ALL_EXTRACTION_TYPES) {
      expect(METADATA_FIELDS_PER_TYPE[t]).toBeDefined();
      expect(Array.isArray(METADATA_FIELDS_PER_TYPE[t])).toBe(true);
    }
  });

  it("risk allow-list is exactly severity, category, jaip_impact_area, raised_by", () => {
    expect([...METADATA_FIELDS_PER_TYPE.risk]).toEqual([
      "severity",
      "category",
      "jaip_impact_area",
      "raised_by",
    ]);
  });

  it("action_item allow-list covers the 8 deadline/assignee fields", () => {
    expect([...METADATA_FIELDS_PER_TYPE.action_item]).toEqual([
      "category",
      "follow_up_contact",
      "assignee",
      "deadline",
      "suggested_deadline",
      "effort_estimate",
      "deadline_reasoning",
      "scope",
    ]);
  });
});

describe("filterMetadataByType", () => {
  it("keeps only risk-specific fields on a risk kernpunt", () => {
    const input = {
      ...universalMetadata,
      severity: "medium",
      category: "client_relationship",
      jaip_impact_area: "strategy",
      raised_by: "Desiree",
    };
    const filtered = filterMetadataByType("risk", input);

    expect(filtered).toEqual({
      severity: "medium",
      category: "client_relationship",
      jaip_impact_area: "strategy",
      raised_by: "Desiree",
    });

    // Explicit: geen andere velden lekken door.
    expect("effort_estimate" in filtered).toBe(false);
    expect("party" in filtered).toBe(false);
    expect("horizon" in filtered).toBe(false);
    expect("sensitive" in filtered).toBe(false);
  });

  it("keeps null values for fields within the allow-list", () => {
    // Contract uit de spec: null = 'model kon dit niet bepalen' en moet
    // niet gestripped worden, alleen velden die niet bij het type horen.
    const filtered = filterMetadataByType("risk", {
      ...universalMetadata,
      severity: null,
      category: null,
      jaip_impact_area: null,
      raised_by: null,
    });

    expect(filtered).toEqual({
      severity: null,
      category: null,
      jaip_impact_area: null,
      raised_by: null,
    });
  });

  it("keeps only action_item fields on an action_item kernpunt", () => {
    const filtered = filterMetadataByType("action_item", {
      ...universalMetadata,
      category: "wachten_op_extern",
      follow_up_contact: "Lieke",
      assignee: "Lieke",
      deadline: "2026-04-25",
      effort_estimate: "small",
      scope: "project",
    });

    expect(filtered).toEqual({
      category: "wachten_op_extern",
      follow_up_contact: "Lieke",
      assignee: "Lieke",
      deadline: "2026-04-25",
      effort_estimate: "small",
      scope: "project",
    });
    expect("severity" in filtered).toBe(false);
    expect("jaip_impact_area" in filtered).toBe(false);
  });

  it("keeps only decision fields on a decision kernpunt (null impact_area preserved)", () => {
    const filtered = filterMetadataByType("decision", {
      ...universalMetadata,
      status: "open",
      decided_by: "Stef",
    });

    // impact_area zit in de allow-list voor decision en was null in input —
    // moet dus blijven (contract: null = 'niet bepaald', betekenisvol).
    expect(filtered).toEqual({ status: "open", decided_by: "Stef", impact_area: null });
  });

  it("keeps sensitive=false for context (boolean, not stripped as falsy)", () => {
    const filtered = filterMetadataByType("context", {
      ...universalMetadata,
      domain: "methodology",
      sensitive: false,
    });

    expect(filtered).toEqual({ domain: "methodology", sensitive: false });
  });

  it("returns {} for an unknown extraction type (defensive)", () => {
    const filtered = filterMetadataByType("not_a_real_type", universalMetadata);
    expect(filtered).toEqual({});
  });

  it("produces disjoint metadata per type for every declared type", () => {
    // Strong invariant: voor elk type bevat de filtered output alleen
    // velden uit de allow-list voor dat type. Dit is de contract-test voor
    // 'elk item heeft uitsluitend zijn eigen metadata-velden'.
    for (const type of ALL_EXTRACTION_TYPES as readonly ExtractionType[]) {
      const filtered = filterMetadataByType(type, universalMetadata);
      const keys = Object.keys(filtered);
      for (const key of keys) {
        expect(METADATA_FIELDS_PER_TYPE[type]).toContain(key);
      }
    }
  });
});
