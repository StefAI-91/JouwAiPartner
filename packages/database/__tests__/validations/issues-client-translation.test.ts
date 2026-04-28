import { describe, it, expect } from "vitest";
import { updateIssueSchema, createIssueSchema } from "../../src/validations/issues";

// CP-007 (DH-EDIT-V1-03) — `client_title` en `client_description` zijn
// optioneel, maar lege strings of whitespace-only invoer moeten als `null`
// uit het schema komen. Anders zou de portal "leeg = fallback"-logica
// inconsistent zijn: een ingevulde-maar-lege string laat de fallback wegvallen.

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

describe("updateIssueSchema – client translation", () => {
  it("normaliseert lege client_title naar null", () => {
    const parsed = updateIssueSchema.parse({
      id: VALID_UUID,
      client_title: "",
    });
    expect(parsed.client_title).toBeNull();
  });

  it("normaliseert whitespace-only client_description naar null", () => {
    const parsed = updateIssueSchema.parse({
      id: VALID_UUID,
      client_description: "   \n\t ",
    });
    expect(parsed.client_description).toBeNull();
  });

  it("behoudt ingevulde waardes ongewijzigd (geen forceer-trim)", () => {
    const parsed = updateIssueSchema.parse({
      id: VALID_UUID,
      client_title: "Inloggen lukt niet ",
      client_description: "Bij het inloggen gebeurt er niets.",
    });
    expect(parsed.client_title).toBe("Inloggen lukt niet ");
    expect(parsed.client_description).toBe("Bij het inloggen gebeurt er niets.");
  });

  it("accepteert expliciet null (DB-clear)", () => {
    const parsed = updateIssueSchema.parse({
      id: VALID_UUID,
      client_title: null,
      client_description: null,
    });
    expect(parsed.client_title).toBeNull();
    expect(parsed.client_description).toBeNull();
  });

  it("weigert client_title boven 200 karakters", () => {
    const result = updateIssueSchema.safeParse({
      id: VALID_UUID,
      client_title: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("weigert client_description boven 5000 karakters", () => {
    const result = updateIssueSchema.safeParse({
      id: VALID_UUID,
      client_description: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

describe("createIssueSchema – client translation", () => {
  it("accepteert lege/ontbrekende client-velden bij creatie", () => {
    const parsed = createIssueSchema.parse({
      project_id: VALID_UUID,
      title: "Test",
    });
    expect(parsed.client_title).toBeNull();
    expect(parsed.client_description).toBeNull();
  });
});
