import { describe, it, expect } from "vitest";
import { parseThemesAnnotation, resolveThemeRefs } from "../../src/pipeline/tagger";

const THEME_A = { themeId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", name: "MCP Capabilities" };
const THEME_B = {
  themeId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  name: "AI-Native Architecture",
};
const THEME_C = { themeId: "cccccccc-cccc-cccc-cccc-cccccccccccc", name: "Hiring" };

describe("parseThemesAnnotation (TH-011 FUNC-271)", () => {
  it("finds a single theme name", () => {
    expect(parseThemesAnnotation("[Themes: MCP Capabilities] Scope-discussie")).toEqual([
      "MCP Capabilities",
    ]);
  });

  it("accepts comma-separated list and trims", () => {
    expect(parseThemesAnnotation("[Themes: MCP Capabilities, Hiring]")).toEqual([
      "MCP Capabilities",
      "Hiring",
    ]);
  });

  it("is case-insensitive on the 'Themes' token", () => {
    expect(parseThemesAnnotation("[themes: Hiring]")).toEqual(["Hiring"]);
    expect(parseThemesAnnotation("[THEMES: Hiring]")).toEqual(["Hiring"]);
  });

  it("matches annotations anywhere in the content", () => {
    expect(parseThemesAnnotation("**Besluit:** Portal live [Themes: MCP Capabilities]")).toEqual([
      "MCP Capabilities",
    ]);
  });

  it("accumulates multiple occurrences", () => {
    expect(
      parseThemesAnnotation("[Themes: MCP Capabilities] tekst [Themes: Hiring] tekst"),
    ).toEqual(["MCP Capabilities", "Hiring"]);
  });

  it("filters empty names", () => {
    expect(parseThemesAnnotation("[Themes: , , Hiring, ]")).toEqual(["Hiring"]);
  });

  it("returns empty array for content without markers", () => {
    expect(parseThemesAnnotation("[JAP Cockpit] Gewone kernpunt zonder theme-marker")).toEqual([]);
  });

  it("does not match project-prefix [ProjectName]", () => {
    expect(parseThemesAnnotation("[JAP Cockpit] content")).toEqual([]);
  });
});

describe("resolveThemeRefs (TH-011 FUNC-271)", () => {
  it("resolves identified theme by exact name", () => {
    const refs = resolveThemeRefs(["MCP Capabilities"], [THEME_A], [THEME_A, THEME_B]);
    expect(refs).toEqual([THEME_A]);
  });

  it("falls back to knownThemes when name is not in identified set", () => {
    const refs = resolveThemeRefs(["Hiring"], [THEME_A], [THEME_A, THEME_B, THEME_C]);
    expect(refs).toEqual([THEME_C]);
  });

  it("is case-insensitive on theme name", () => {
    const refs = resolveThemeRefs(["mcp capabilities"], [], [THEME_A]);
    expect(refs).toEqual([THEME_A]);
  });

  it("deduplicates repeated references by themeId", () => {
    const refs = resolveThemeRefs(["MCP Capabilities", "mcp capabilities"], [THEME_A], [THEME_A]);
    expect(refs).toHaveLength(1);
    expect(refs[0].themeId).toBe(THEME_A.themeId);
  });

  it("skips unknown names silently", () => {
    const refs = resolveThemeRefs(["Onbestaand Thema", "Hiring"], [], [THEME_C]);
    expect(refs).toEqual([THEME_C]);
  });

  it("prefers identified over known when both contain the same name", () => {
    // Same name, different ids — identified should win.
    const identified = [{ themeId: "identified-id", name: "Shared" }];
    const known = [{ themeId: "known-id", name: "Shared" }];
    const refs = resolveThemeRefs(["Shared"], identified, known);
    expect(refs).toEqual([{ themeId: "identified-id", name: "Shared" }]);
  });
});
