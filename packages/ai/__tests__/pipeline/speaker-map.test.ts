import { describe, it, expect } from "vitest";
import {
  extractSpeakerNames,
  buildSpeakerMap,
  formatSpeakerContext,
} from "../../src/pipeline/speaker-map";
import type { KnownPerson } from "@repo/database/queries/people";

const makePerson = (overrides: Partial<KnownPerson> & { name: string }): KnownPerson => ({
  id: "person-1",
  email: null,
  team: null,
  role: null,
  organization_id: null,
  organization_name: null,
  organization_type: null,
  ...overrides,
});

describe("extractSpeakerNames", () => {
  it("haalt unieke namen uit sentences", () => {
    const sentences = [
      { speaker_name: "Alice" },
      { speaker_name: "Bob" },
      { speaker_name: "Alice" },
      { speaker_name: "Charlie" },
    ];

    const result = extractSpeakerNames(sentences);

    expect(result).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("retourneert lege array bij lege input", () => {
    expect(extractSpeakerNames([])).toEqual([]);
  });
});

describe("buildSpeakerMap", () => {
  it("matcht exact op naam", () => {
    const people: KnownPerson[] = [
      makePerson({ id: "p-1", name: "Wouter van den Heuvel", team: "dev" }),
    ];

    const map = buildSpeakerMap(["Wouter van den Heuvel"], people);
    const info = map.get("Wouter van den Heuvel");

    expect(info).toBeDefined();
    expect(info!.personId).toBe("p-1");
    expect(info!.name).toBe("Wouter van den Heuvel");
    expect(info!.label).toBe("internal");
  });

  it("matcht case-insensitive op naam", () => {
    const people: KnownPerson[] = [
      makePerson({ id: "p-1", name: "Wouter van den Heuvel", team: "dev" }),
    ];

    const map = buildSpeakerMap(["wouter van den heuvel"], people);
    const info = map.get("wouter van den heuvel");

    expect(info).toBeDefined();
    expect(info!.personId).toBe("p-1");
  });

  it("matcht 'FirstName | Org' display format", () => {
    const people: KnownPerson[] = [
      makePerson({
        id: "p-2",
        name: "Bas Spenkelink",
        organization_name: "Markant Internet",
        team: null,
      }),
    ];

    const map = buildSpeakerMap(["Bas | Markant Internet"], people);
    const info = map.get("Bas | Markant Internet");

    expect(info).toBeDefined();
    expect(info!.personId).toBe("p-2");
    expect(info!.name).toBe("Bas Spenkelink");
    expect(info!.label).toBe("external");
  });

  it("ongematchte speakers krijgen personId: null, label: 'unknown'", () => {
    const map = buildSpeakerMap(["Unknown Speaker"], []);
    const info = map.get("Unknown Speaker");

    expect(info).toBeDefined();
    expect(info!.personId).toBeNull();
    expect(info!.label).toBe("unknown");
    expect(info!.name).toBe("Unknown Speaker");
    expect(info!.organizationName).toBeNull();
    expect(info!.role).toBeNull();
  });

  it("dedupliceert speakers", () => {
    const map = buildSpeakerMap(["Alice", "Alice"], []);
    expect(map.size).toBe(1);
  });

  it("zet team persoon als internal, niet-team als external", () => {
    const people: KnownPerson[] = [
      makePerson({ id: "p-1", name: "Intern Persoon", team: "dev" }),
      makePerson({ id: "p-2", name: "Extern Persoon", team: null, organization_name: "Klant BV" }),
    ];

    const map = buildSpeakerMap(["Intern Persoon", "Extern Persoon"], people);

    expect(map.get("Intern Persoon")!.label).toBe("internal");
    expect(map.get("Extern Persoon")!.label).toBe("external");
  });
});

describe("formatSpeakerContext", () => {
  it("genereert leesbare string voor AI", () => {
    const map = buildSpeakerMap(
      ["Wouter", "Bas", "info"],
      [
        makePerson({ id: "p-1", name: "Wouter", team: "dev", role: "CTO" }),
        makePerson({
          id: "p-2",
          name: "Bas",
          team: null,
          organization_name: "Markant Internet",
        }),
      ],
    );

    const result = formatSpeakerContext(map);

    expect(result).toContain("- Wouter (INTERN, rol: CTO)");
    expect(result).toContain("- Bas (EXTERN, Markant Internet)");
    expect(result).toContain("- info (ONBEKEND)");
  });

  it("toont geen rol als die null is", () => {
    const map = buildSpeakerMap(
      ["Alice"],
      [makePerson({ id: "p-1", name: "Alice", team: "design", role: null })],
    );

    const result = formatSpeakerContext(map);
    expect(result).toBe("- Alice (INTERN)");
    expect(result).not.toContain("rol:");
  });
});
