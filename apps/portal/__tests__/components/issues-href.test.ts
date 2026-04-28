import { describe, it, expect } from "vitest";
import { buildIssuesHref } from "@/components/issues/issues-href";

// CP-008 — orthogonale tabs (BUCKET-V1-05/-06): klikken op één tab mag de
// andere actieve filter niet wegspoelen. Deze test bewaakt dat de URL-builder
// beide params tegelijk handelt en `null` als "weglaten" interpreteert i.p.v.
// als string-segment.

const PROJECT = "abc-123";

describe("buildIssuesHref", () => {
  it("retourneert kale URL zonder filters", () => {
    expect(buildIssuesHref(PROJECT, {})).toBe("/projects/abc-123/issues");
  });

  it("voegt source-param toe", () => {
    expect(buildIssuesHref(PROJECT, { source: "client" })).toBe(
      "/projects/abc-123/issues?source=client",
    );
  });

  it("voegt type-param toe", () => {
    expect(buildIssuesHref(PROJECT, { type: "bug" })).toBe("/projects/abc-123/issues?type=bug");
  });

  it("combineert source + type met stabiele volgorde", () => {
    expect(buildIssuesHref(PROJECT, { source: "jaip", type: "question" })).toBe(
      "/projects/abc-123/issues?source=jaip&type=question",
    );
  });

  it("laat null/undefined waarden weg uit de URL", () => {
    expect(buildIssuesHref(PROJECT, { source: null, type: "feature_request" })).toBe(
      "/projects/abc-123/issues?type=feature_request",
    );
    expect(buildIssuesHref(PROJECT, { source: "client", type: null })).toBe(
      "/projects/abc-123/issues?source=client",
    );
  });
});
